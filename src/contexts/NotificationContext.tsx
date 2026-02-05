import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { notificationService } from '../services';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, isAuthenticated } = useAuth();
  const { socket } = useSocket();

  const refreshUnreadCount = async () => {
    if (!isAuthenticated || !user?._id) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await notificationService.getUnreadCount();
      if (response.success && response.data) {
        setUnreadCount(response.data.count);
      } else {
        setUnreadCount(0);
      }
    } catch (error: any) {
      // Chỉ log lỗi nếu không phải do token expired hoặc chưa có token
      const errorMessage = error?.message || '';
      if (!errorMessage.includes('Chưa cung cấp token') && 
          !errorMessage.includes('Session expired')) {
        console.error('Error fetching unread count:', error);
      }
      setUnreadCount(0);
    }
  };

  // Load initial count
  useEffect(() => {
    if (isAuthenticated && user?._id) {
      refreshUnreadCount();
      // Refresh mỗi 30 giây
      const interval = setInterval(refreshUnreadCount, 30000);
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
    }
  }, [isAuthenticated, user?._id]);

  // Listen to socket events for real-time updates
  useEffect(() => {
    if (!socket) return;

    // Khi có notification mới
    const handleNewNotification = () => {
      console.log('🔔 [NotificationContext] New notification received');
      setUnreadCount((prev) => prev + 1);
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket, isAuthenticated]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        refreshUnreadCount,
      }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

