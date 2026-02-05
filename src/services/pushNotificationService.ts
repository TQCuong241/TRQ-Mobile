/**
 * Push Notification Service
 * Quản lý push notifications với Firebase Cloud Messaging
 */

import { Platform } from 'react-native';
import { notificationService } from './notificationService';

// Dynamic import để tránh lỗi khi chưa cài đặt Firebase
let messaging: any = null;
let firebaseApp: any = null;

const initializeMessaging = async () => {
  if (messaging) return messaging;
  
  try {
    // Ensure core `@react-native-firebase/app` exists (messaging depends on it)
    if (!firebaseApp) {
      const firebase = await import('@react-native-firebase/app');
      firebaseApp = firebase.default;
    }
    const firebaseMessaging = await import('@react-native-firebase/messaging');
    messaging = firebaseMessaging.default;
    return messaging;
  } catch (error) {
    // console.warn('⚠️ [PushNotification] Firebase Messaging chưa được cài đặt');
    return null;
  }
};

const isFirebaseConfigured = (): boolean => {
  try {
    if (!firebaseApp) return false;
    // RNFirebase exposes native app options; if missing/placeholder, skip token registration.
    const options = firebaseApp.app().options;
    const apiKey: string | undefined = options?.apiKey;
    if (!apiKey) return false;
    if (apiKey.toLowerCase().includes('placeholder')) return false;
    return true;
  } catch {
    return false;
  }
};

class PushNotificationService {
  private fcmToken: string | null = null;
  private isRegistered: boolean = false;
  private foregroundUnsubscribe?: () => void;
  private openedUnsubscribe?: () => void;
  private tokenRefreshUnsubscribe?: () => void;
  private lastHandledMessageId: string | null = null;

  /**
   * Request permission và đăng ký push token
   */
  async registerPushToken(deviceName?: string): Promise<boolean> {
    try {
      const messagingInstance = await initializeMessaging();
      if (!messagingInstance) {
        // console.warn('⚠️ [PushNotification] Firebase Messaging không khả dụng');
        return false;
      }

      // If Firebase isn't configured (missing/placeholder google-services.json), don't attempt FCM calls
      if (!isFirebaseConfigured()) {
        // console.warn(
        //   '⚠️ [PushNotification] Firebase chưa được cấu hình (thiếu hoặc placeholder google-services.json). Bỏ qua đăng ký push token.'
        // );
        return false;
      }

      // Request permission
      const authStatus = await messagingInstance().requestPermission();
      const enabled =
        authStatus === messagingInstance.AuthorizationStatus.AUTHORIZED ||
        authStatus === messagingInstance.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        // console.warn('⚠️ [PushNotification] Notification permission bị từ chối');
        return false;
      }

      // Get FCM token
      const token = await messagingInstance().getToken();
      if (!token) {
        // console.warn('⚠️ [PushNotification] Không thể lấy FCM token');
        return false;
      }

      this.fcmToken = token;
      // console.log('✅ [PushNotification] FCM Token:', token);

      // Get device info
      let deviceId: string | undefined;
      let deviceNameValue: string | undefined = deviceName;

      try {
        const DeviceInfo = await import('react-native-device-info');
        deviceId = await DeviceInfo.default.getUniqueId();
        if (!deviceNameValue) {
          deviceNameValue = await DeviceInfo.default.getDeviceName();
        }
      } catch (error) {
        // console.warn('⚠️ [PushNotification] Không thể lấy device info:', error);
      }

      // Register với backend
      const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
      const response = await notificationService.registerPushToken({
        token,
        platform,
        deviceId,
        deviceName: deviceNameValue,
      });

      if (response.success) {
        this.isRegistered = true;
        // console.log('✅ [PushNotification] Đã đăng ký push token thành công');
        return true;
      } else {
        // console.error('❌ [PushNotification] Đăng ký push token thất bại:', response.message);
        return false;
      }
    } catch (error: any) {
      const msg = String(error?.message || error);
      if (msg.includes('Please set a valid API key')) {
        // console.warn(
        //   '⚠️ [PushNotification] Firebase API key không hợp lệ. Hãy thay `android/app/google-services.json` bằng file thật từ Firebase Console (đúng package `com.trqmobileapp`).'
        // );
        return false;
      }
      // console.error('❌ [PushNotification] Lỗi đăng ký push token:', error);
      return false;
    }
  }

  /**
   * Hủy đăng ký push token
   */
  async unregisterPushToken(): Promise<boolean> {
    try {
      if (!this.fcmToken) {
        return true; // Không có token để hủy
      }

      const response = await notificationService.unregisterPushToken(this.fcmToken);
      if (response.success) {
        this.fcmToken = null;
        this.isRegistered = false;
        // console.log('✅ [PushNotification] Đã hủy đăng ký push token');
        return true;
      }
      return false;
    } catch (error: any) {
      // console.error('❌ [PushNotification] Lỗi hủy đăng ký push token:', error);
      return false;
    }
  }

  /**
   * Setup push notification handlers
   */
  async setupNotificationHandlers(
    onNotificationReceived?: (notification: any) => void,
    onNotificationOpened?: (notification: any) => void
  ) {
    try {
      const messagingInstance = await initializeMessaging();
      if (!messagingInstance) {
        return;
      }

      // Hủy các listener cũ (nếu có) để tránh nhân đôi handler
      if (this.foregroundUnsubscribe) {
        this.foregroundUnsubscribe();
        this.foregroundUnsubscribe = undefined;
      }
      if (this.openedUnsubscribe) {
        this.openedUnsubscribe();
        this.openedUnsubscribe = undefined;
      }
      if (this.tokenRefreshUnsubscribe) {
        this.tokenRefreshUnsubscribe();
        this.tokenRefreshUnsubscribe = undefined;
      }

      const isDuplicate = (remoteMessage: any) => {
        const messageId: string | undefined = remoteMessage?.messageId;
        if (!messageId) return false;
        if (this.lastHandledMessageId === messageId) {
          // console.log(
          //   '⚠️ [PushNotification] Bỏ qua notification trùng (messageId):',
          //   messageId
          // );
          return true;
        }
        this.lastHandledMessageId = messageId;
        return false;
      };

      // Handle foreground notifications
      this.foregroundUnsubscribe = messagingInstance().onMessage(async (remoteMessage: any) => {
        if (isDuplicate(remoteMessage)) {
          return;
        }
        // console.log('🔔 [PushNotification] Notification received in foreground:', remoteMessage);
        if (onNotificationReceived) {
          onNotificationReceived(remoteMessage);
        }
      });

      // Handle background/quit state notifications (khi user tap vào notification)
      this.openedUnsubscribe = messagingInstance().onNotificationOpenedApp((remoteMessage: any) => {
        if (isDuplicate(remoteMessage)) {
          return;
        }
        // console.log('🔔 [PushNotification] Notification opened app:', remoteMessage);
        if (onNotificationOpened) {
          onNotificationOpened(remoteMessage);
        }
      });

      // Check if app was opened from notification (khi app đang tắt)
      messagingInstance()
        .getInitialNotification()
        .then((remoteMessage: any) => {
          if (remoteMessage) {
            if (isDuplicate(remoteMessage)) {
              return;
            }
            // console.log('🔔 [PushNotification] App opened from notification:', remoteMessage);
            if (onNotificationOpened) {
              onNotificationOpened(remoteMessage);
            }
          }
        });

      // Handle token refresh
      this.tokenRefreshUnsubscribe = messagingInstance().onTokenRefresh((token: string) => {
        // console.log('🔄 [PushNotification] FCM Token refreshed:', token);
        this.fcmToken = token;
        // Tự động đăng ký lại token mới
        this.registerPushToken();
      });

      // console.log('✅ [PushNotification] Notification handlers đã được setup');
    } catch (error: any) {
      // console.error('❌ [PushNotification] Lỗi setup notification handlers:', error);
    }
  }

  /**
   * Lấy FCM token hiện tại
   */
  getToken(): string | null {
    return this.fcmToken;
  }

  /**
   * Kiểm tra đã đăng ký chưa
   */
  isTokenRegistered(): boolean {
    return this.isRegistered;
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;

