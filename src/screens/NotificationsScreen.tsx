import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useNotification } from '../contexts/NotificationContext';
import CustomText from '../components/CustomText';
import { notificationService, type Notification } from '../services';
import { useAlert } from '../hooks/useAlert';

function NotificationsScreen() {
  const { colors } = useTheme();
  const { isAuthenticated } = useAuth();
  const { socket } = useSocket();
  const { showAlert } = useAlert();
  const { refreshUnreadCount } = useNotification();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
      loadUnreadCount();
    }
  }, [isAuthenticated]);

  // Listen to socket events for real-time updates
  useEffect(() => {
    if (!socket) return;

    // Khi có notification mới
    const handleNewNotification = (data: { notification: Notification }) => {
      console.log('🔔 [NotificationsScreen] New notification:', data.notification);
      // Bỏ qua notification loại tin nhắn - không hiển thị trong màn Thông báo
      if (data.notification.type === 'message') {
        return;
      }
      // Thêm vào đầu danh sách
      setNotifications((prev) => [data.notification, ...prev]);
      // Tăng unread count
      setUnreadCount((prev) => prev + 1);
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket]);

  const loadNotifications = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) {
        setLoading(true);
      }

      const response = await notificationService.getNotifications({
        limit: 20,
        page: pageNum,
      });

      if (response.success && response.data) {
        // Ẩn các notification loại tin nhắn trong màn Thông báo
        const newNotifications = (response.data.notifications || []).filter(
          (n) => n.type !== 'message',
        );
        const { totalPages } = response.data;
        
        if (append) {
          setNotifications((prev) => [...prev, ...newNotifications]);
        } else {
          setNotifications(newNotifications);
        }

        setUnreadCount(response.data.unreadCount || 0);
        setHasMore(pageNum < totalPages);
        setPage(pageNum);
      } else {
        showAlert('Lỗi', response.message || 'Không thể tải thông báo', [{ text: 'OK' }], 'error');
      }
    } catch (error: any) {
      console.error('Error loading notifications:', error);
      showAlert('Lỗi', 'Có lỗi xảy ra khi tải thông báo', [{ text: 'OK' }], 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await notificationService.getUnreadCount();
      if (response.success && response.data) {
        setUnreadCount(response.data.count);
        // Refresh context count
        await refreshUnreadCount();
      }
    } catch (error: any) {
      console.error('Error loading unread count:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications(1, false);
    await loadUnreadCount();
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Đánh dấu đã đọc nếu chưa đọc
    if (!notification.read) {
      await handleMarkAsRead(notification._id);
    }

    // TODO: Navigate to relevant screen based on notification type
    // Ví dụ: friend_request -> FriendRequests screen
    // friend_request_accepted -> UserProfile screen
    console.log('Notification pressed:', notification);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await notificationService.markAsRead(notificationId);
      if (response.success) {
        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notificationId
              ? { ...n, read: true, readAt: new Date().toISOString() }
              : n
          )
        );
        // Giảm unread count
        setUnreadCount((prev) => Math.max(0, prev - 1));
        // Refresh context count
        await refreshUnreadCount();
      }
    } catch (error: any) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await notificationService.markAllAsRead();
      if (response.success) {
        // Update local state
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
        );
        setUnreadCount(0);
        // Refresh context count
        await refreshUnreadCount();
        showAlert('Thành công', `Đã đánh dấu ${response.data?.count || 0} thông báo là đã đọc`, [{ text: 'OK' }], 'success');
      } else {
        showAlert('Lỗi', response.message || 'Không thể đánh dấu tất cả là đã đọc', [{ text: 'OK' }], 'error');
      }
    } catch (error: any) {
      console.error('Error marking all as read:', error);
      showAlert('Lỗi', 'Có lỗi xảy ra', [{ text: 'OK' }], 'error');
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'friend_request':
        return 'person-add';
      case 'friend_request_accepted':
        return 'check-circle';
      case 'friend_request_rejected':
        return 'cancel';
      case 'friend_removed':
        return 'person-remove';
      case 'message':
        return 'message';
      case 'call':
        return 'call';
      case 'system':
        return 'info';
      default:
        return 'notifications';
    }
  };

  const getNotificationIconColor = (type: Notification['type']) => {
    switch (type) {
      case 'friend_request':
        return colors.primary;
      case 'friend_request_accepted':
        return colors.success;
      case 'friend_request_rejected':
        return colors.error;
      case 'friend_removed':
        return colors.error;
      case 'message':
        return colors.primary;
      case 'call':
        return colors.primary;
      case 'system':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <CustomText variant="h2" weight="bold" color="#FFFFFF" style={styles.headerTitle}>
          Thông báo
        </CustomText>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <>
              <TouchableOpacity
                onPress={handleMarkAllAsRead}
                activeOpacity={0.7}
                style={styles.markAllButton}>
                <CustomText variant="caption" weight="semibold" color="#FFFFFF">
                  Đánh dấu tất cả
                </CustomText>
              </TouchableOpacity>
              <View style={[styles.badge, { backgroundColor: '#FF3B30' }]}>
                <CustomText variant="caption" weight="bold" color="#FFFFFF">
                  {unreadCount}
                </CustomText>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Content */}
      {loading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : notifications.length > 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}>
          {notifications.map((notification) => (
            <TouchableOpacity
              key={notification._id}
              style={[
                styles.notificationItem,
                {
                  backgroundColor: notification.read ? colors.card : colors.surface,
                  borderLeftColor: notification.read ? 'transparent' : colors.primary,
                },
              ]}
              onPress={() => handleNotificationPress(notification)}
              activeOpacity={0.7}>
              <View style={[styles.iconContainer, { backgroundColor: getNotificationIconColor(notification.type) + '20' }]}>
                <Icon
                  name={getNotificationIcon(notification.type)}
                  size={24}
                  color={getNotificationIconColor(notification.type)}
                />
              </View>
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <CustomText variant="body" weight="semibold" color={colors.text}>
                    {notification.title}
                  </CustomText>
                  {!notification.read && (
                    <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                  )}
                </View>
                <CustomText variant="body" color={colors.textSecondary} style={styles.notificationMessage}>
                  {notification.body}
                </CustomText>
                <CustomText variant="caption" color={colors.textSecondary} style={styles.notificationTime}>
                  {formatTime(notification.createdAt)}
                </CustomText>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Icon name="notifications-none" size={64} color={colors.textSecondary} />
          <CustomText variant="body" color={colors.textSecondary} style={styles.emptyText}>
            Không có thông báo nào
          </CustomText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
  },
  headerTitle: {
    fontSize: 20,
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  markAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
    gap: 4,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  notificationTime: {
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    gap: 16,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
  },
});

export default NotificationsScreen;

