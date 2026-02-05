import { createNavigationContainerRef } from '@react-navigation/native';

// Dùng any để linh hoạt với nested navigators (RootStack -> Tabs -> Stacks)
export const navigationRef = createNavigationContainerRef<any>();

export function navigate(name: string, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as never, params as never);
  }
}

/**
 * Điều hướng đến màn hình thông báo chính từ push notification
 * - RootStack: Main
 * - Tab: Notifications
 * - Stack: NotificationsMain
 */
export function openNotificationFromPush(params?: any) {
  if (!navigationRef.isReady()) {
    return;
  }

  navigationRef.navigate(
    'Main' as never,
    {
      screen: 'Notifications',
      params: {
        screen: 'NotificationsMain',
        params,
      },
    } as never
  );
}

/**
 * Điều hướng vào màn Chat từ banner tin nhắn
 * - RootStack: Main
 * - Tab: Home
 * - Stack: Chat
 */
export function openChatFromMessage(params: { conversationId: string; title?: string }) {
  if (!navigationRef.isReady()) {
    return;
  }

  navigationRef.navigate(
    'Main' as never,
    {
      screen: 'Home',
      params: {
        screen: 'Chat',
        params,
      },
    } as never
  );
}

