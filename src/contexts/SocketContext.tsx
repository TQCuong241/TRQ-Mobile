import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { Socket } from 'socket.io-client';
import { socketService } from '../services/socketService';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);

  useEffect(() => {
    if (isAuthenticated && token) {
      // Kết nối socket
      const socketInstance = socketService.connect(token);
      setSocket(socketInstance);

      // Listen connection events
      socketInstance.on('connect', () => {
        setIsConnected(true);
        console.log('✅ [SocketContext] Connected');
      });

      socketInstance.on('disconnect', () => {
        setIsConnected(false);
        console.log('❌ [SocketContext] Disconnected');
      });

      socketInstance.on('connect_error', (error: any) => {
        setIsConnected(false);
        // Chỉ log lỗi nếu không phải do token expired
        const errorMessage = error?.message || '';
        if (!errorMessage.includes('Token không hợp lệ') && 
            !errorMessage.includes('đã hết hạn')) {
          console.log('❌ [SocketContext] Connection error:', error);
        }
      });

      // Cleanup khi unmount hoặc logout
      return () => {
        socketService.disconnect();
        setSocket(null);
        setIsConnected(false);
      };
    } else {
      // Disconnect nếu không authenticated
      socketService.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [isAuthenticated, token]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
      }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

