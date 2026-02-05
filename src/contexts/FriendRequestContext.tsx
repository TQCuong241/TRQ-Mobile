import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { friendService } from '../services';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import type { FriendRequest } from '../services';

interface FriendRequestContextType {
  friendRequestCount: number;
  refreshFriendRequestCount: () => Promise<void>;
  lastSenderName: string | null;
}

const FriendRequestContext = createContext<FriendRequestContextType | undefined>(undefined);

export const FriendRequestProvider = ({ children }: { children: ReactNode }) => {
  const [friendRequestCount, setFriendRequestCount] = useState(0);
   const [lastSenderName, setLastSenderName] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const { socket } = useSocket();

  const refreshFriendRequestCount = async () => {
    if (!isAuthenticated || !user?._id) {
      setFriendRequestCount(0);
      return;
    }

    try {
      const response = await friendService.getFriendRequests('received');
      if (response.success && response.data) {
        const receivedRequests = Array.isArray(response.data) ? response.data : [];
        // Chỉ đếm các lời mời có status 'pending'
        const pendingCount = receivedRequests.filter(
          (r) => r.status === 'pending'
        ).length;
        setFriendRequestCount(pendingCount);
      } else {
        setFriendRequestCount(0);
      }
    } catch (error: any) {
      // Chỉ log lỗi nếu không phải do token expired hoặc chưa có token
      const errorMessage = error?.message || '';
      if (!errorMessage.includes('Chưa cung cấp token') && 
          !errorMessage.includes('Session expired')) {
        console.error('Error fetching friend request count:', error);
      }
      setFriendRequestCount(0);
    }
  };

  // Load initial count
  useEffect(() => {
    if (isAuthenticated && user?._id) {
      refreshFriendRequestCount();
    } else {
      setFriendRequestCount(0);
    }
  }, [isAuthenticated, user?._id]);

  // Listen to socket events for real-time updates
  useEffect(() => {
    if (!socket) return;

    // Khi nhận lời mời mới
    const handleFriendRequestReceived = (data: { friendRequest: FriendRequest }) => {
      console.log('🔔 [Socket] Friend request received:', data.friendRequest);
      if (data.friendRequest.status === 'pending') {
        setFriendRequestCount((prev) => prev + 1);
        const senderName =
          (data.friendRequest.senderId as any)?.displayName ||
          (data.friendRequest.senderId as any)?.username ||
          'Người dùng mới';
        setLastSenderName(senderName);
      }
    };

    // Khi lời mời được xử lý (accept/reject/cancel)
    const handleFriendRequestUpdated = (data: {
      friendRequest: FriendRequest;
      action: 'accepted' | 'rejected' | 'cancelled';
    }) => {
      console.log('🔔 [Socket] Friend request updated:', data);
      // Nếu là lời mời nhận được (receiver) bị accept/reject/cancel, refresh count
      // Refresh để đảm bảo count chính xác
      refreshFriendRequestCount();
    };

    socket.on('friend:request:received', handleFriendRequestReceived);
    socket.on('friend:request:updated', handleFriendRequestUpdated);

    return () => {
      socket.off('friend:request:received', handleFriendRequestReceived);
      socket.off('friend:request:updated', handleFriendRequestUpdated);
    };
  }, [socket, isAuthenticated]);

  return (
    <FriendRequestContext.Provider
      value={{
        friendRequestCount,
        refreshFriendRequestCount,
        lastSenderName,
      }}>
      {children}
    </FriendRequestContext.Provider>
  );
};

export const useFriendRequest = () => {
  const context = useContext(FriendRequestContext);
  if (context === undefined) {
    throw new Error('useFriendRequest must be used within a FriendRequestProvider');
  }
  return context;
};

