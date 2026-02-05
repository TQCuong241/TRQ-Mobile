/**
 * TRQ Mobile App
 * React Native với Navigation, Reanimated và Icons
 *
 * @format
 */

import React, { useEffect } from 'react';
import {StatusBar, AppState, AppStateStatus} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import {ThemeProvider, useTheme} from './src/contexts/ThemeContext';
import {AlertProvider} from './src/hooks/useAlert';
import {AuthProvider} from './src/contexts/AuthContext';
import {ConnectionProvider, useConnection} from './src/contexts/ConnectionContext';
import {FriendRequestProvider} from './src/contexts/FriendRequestContext';
import {NotificationProvider, useNotification} from './src/contexts/NotificationContext';
import {SocketProvider, useSocket} from './src/contexts/SocketContext';
import ConnectionBanner from './src/components/ConnectionBanner';
import FriendRequestBanner from './src/components/FriendRequestBanner';
import MessageBanner from './src/components/MessageBanner';
import {setConnectionContext, setLogoutCallback} from './src/services/api';
import {useAuth} from './src/contexts/AuthContext';
import {pushNotificationService} from './src/services/pushNotificationService';
import {useAlert} from './src/hooks/useAlert';
import {openNotificationFromPush, openChatFromMessage, navigationRef} from './src/navigation/NavigationService';
import {useFriendRequest} from './src/contexts/FriendRequestContext';

function AppContent() {
  const {setServerOnline} = useConnection();
  const {isDark} = useTheme();
  const {logout, isAuthenticated} = useAuth();
  const {refreshUnreadCount} = useNotification();
  const {showAlert} = useAlert();
  const {friendRequestCount, lastSenderName} = useFriendRequest();
  const [showFriendBanner, setShowFriendBanner] = React.useState(false);
  const { socket } = useSocket();
  const [messageBanner, setMessageBanner] = React.useState<{
    visible: boolean;
    title: string;
    body: string;
    conversationId?: string;
  }>({ visible: false, title: '', body: '', conversationId: undefined });

  useEffect(() => {
    // Kết nối ConnectionContext với apiService
    setConnectionContext({setServerOnline});
    // Kết nối logout callback với apiService
    setLogoutCallback(logout);
  }, [setServerOnline, logout]);

  // Setup push notifications khi đăng nhập
  useEffect(() => {
    if (isAuthenticated) {
      // Đăng ký push token
      pushNotificationService.registerPushToken().catch((error) => {
        console.error('Error registering push token:', error);
      });

      // Setup notification handlers
      pushNotificationService.setupNotificationHandlers(
        // Khi nhận notification ở foreground
        (remoteMessage) => {
          console.log('🔔 [App] Notification received:', remoteMessage);
          const data = remoteMessage?.data || {};
          const notifType = data.type || data.notificationType || data.category;
          const conversationId = data.conversationId;
          const title = remoteMessage?.notification?.title || data.title || 'Thông báo mới';
          const body =
            remoteMessage?.notification?.body ||
            data.body ||
            data.message ||
            'Bạn có một thông báo mới.';

          // Nếu là notification tin nhắn → dùng banner thay vì alert
          if (notifType === 'message' || conversationId) {
            // Nếu đang ở đúng màn Chat của cuộc trò chuyện đó thì không cần banner
            const route = navigationRef.getCurrentRoute();
            const currentConversationId = (route?.params as any)?.conversationId;
            if (!(route?.name === 'Chat' && currentConversationId === conversationId)) {
              setMessageBanner({
                visible: true,
                title: title || 'Tin nhắn mới',
                body,
                conversationId,
              });
            }
          } else {
            // Các loại notification khác vẫn dùng alert như cũ
            showAlert(
              title,
              body,
              [
                {
                  text: 'Đóng',
                  style: 'cancel',
                },
                {
                  text: 'Xem',
                  style: 'default',
                  onPress: () => {
                    openNotificationFromPush(remoteMessage?.data);
                  },
                },
              ],
              'info',
            );
          }
          // Refresh unread count
          refreshUnreadCount();
        },
        // Khi user tap vào notification (background / app tắt)
        (remoteMessage) => {
          console.log('🔔 [App] Notification opened:', remoteMessage);
          const data = remoteMessage?.data || {};
          const notifType = data.type || data.notificationType || data.category;
          const conversationId = data.conversationId;
          const title =
            remoteMessage?.notification?.title || data.title || 'Tin nhắn mới';

          // Refresh unread count
          refreshUnreadCount();

          // Nếu là notification tin nhắn → điều hướng thẳng vào màn Chat
          if (notifType === 'message' || conversationId) {
            openChatFromMessage({
              conversationId,
              title,
            });
          } else {
            // Các loại khác vẫn đi tới màn Thông báo
            openNotificationFromPush(remoteMessage?.data);
          }
        }
      );
    } else {
      // Hủy đăng ký khi logout
      pushNotificationService.unregisterPushToken().catch((error) => {
        console.error('Error unregistering push token:', error);
      });
    }
  }, [isAuthenticated, refreshUnreadCount]);

  // Listen to app state changes để refresh notifications
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated) {
        // Refresh notifications khi app trở lại foreground
        refreshUnreadCount();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, refreshUnreadCount]);

  // Show friend request banner khi có lời mời mới (dựa trên socket log)
  useEffect(() => {
    if (friendRequestCount > 0 && lastSenderName) {
      // Mỗi khi có lời mời mới (và context cập nhật lastSenderName), hiển thị banner
      setShowFriendBanner(true);
    }
  }, [friendRequestCount, lastSenderName]);

  // Lắng nghe socket message:new để hiện banner tin nhắn khi đang trong app
  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handleMessageNew = (payload: any) => {
      try {
        if (!payload) return;
        const conversationId = payload.conversationId || payload.message?.conversationId;
        const message = payload.message || payload;
        if (!conversationId || !message) return;

        // Nếu đang ở đúng màn Chat cho conversation này thì không cần banner
        const route = navigationRef.getCurrentRoute();
        const currentConversationId = (route?.params as any)?.conversationId;
        if (route?.name === 'Chat' && currentConversationId === conversationId) {
          return;
        }

        const text =
          message?.content?.text ||
          (message?.type === 'IMAGE' ? 'Đã gửi một hình ảnh' : 'Bạn có tin nhắn mới');

        setMessageBanner({
          visible: true,
          title: 'Tin nhắn mới',
          body: text,
          conversationId,
        });
      } catch (error) {
        console.warn('⚠️ [App] Invalid message:new payload for banner', error);
      }
    };

    socket.on('message:new', handleMessageNew);

    return () => {
      socket.off('message:new', handleMessageNew);
    };
  }, [socket, isAuthenticated]);

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ConnectionBanner />
      <FriendRequestBanner
        visible={showFriendBanner}
        senderName={lastSenderName || 'Bạn có lời mời kết bạn mới'}
        onHide={() => setShowFriendBanner(false)}
      />
      <MessageBanner
        visible={messageBanner.visible}
        title={messageBanner.title}
        body={messageBanner.body}
        onHide={() =>
          setMessageBanner((prev) => ({
            ...prev,
            visible: false,
          }))
        }
        onPress={() => {
          if (messageBanner.conversationId) {
            openChatFromMessage({
              conversationId: messageBanner.conversationId,
              title: messageBanner.title,
            });
          }
        }}
      />
      <AppNavigator />
    </>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ConnectionProvider>
          <AuthProvider>
            <SocketProvider>
              <FriendRequestProvider>
                <NotificationProvider>
            <AlertProvider>
              <AppContent />
            </AlertProvider>
                </NotificationProvider>
              </FriendRequestProvider>
            </SocketProvider>
          </AuthProvider>
        </ConnectionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
