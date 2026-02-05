import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { API_CONFIG } from '../config/api';

interface ConnectionContextType {
  isServerOnline: boolean;
  checkConnection: () => Promise<void>;
  setServerOnline: (status: boolean) => void;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

const HEALTH_CHECK_INTERVAL = 10000; // 10 giây
const MAX_FAILED_CHECKS = 2; // Sau 2 lần fail thì coi như server offline
const HEALTH_CHECK_TIMEOUT = 5000; // 5s timeout cho health check

export const ConnectionProvider = ({ children }: { children: ReactNode }) => {
  const [isServerOnline, setIsServerOnline] = useState(true);
  const [failedChecks, setFailedChecks] = useState(0);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);

  const checkConnection = useCallback(async () => {
    if (isCheckingRef.current) return;
    
    isCheckingRef.current = true;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

      // Health check endpoint - có thể dùng endpoint đơn giản như check-email hoặc register
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/check-email?email=healthcheck@test.com`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok || response.status === 400) {
        // 400 cũng OK vì có nghĩa là server đang hoạt động (chỉ là email không hợp lệ)
        setIsServerOnline(true);
        setFailedChecks(0);
      } else {
        throw new Error('Server returned non-OK status');
      }
    } catch (error) {
      const newFailedChecks = failedChecks + 1;
      setFailedChecks(newFailedChecks);

      if (newFailedChecks >= MAX_FAILED_CHECKS) {
        setIsServerOnline(false);
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, [failedChecks]);

  const setServerOnline = useCallback((status: boolean) => {
    setIsServerOnline(status);
    if (status) {
      setFailedChecks(0);
    }
  }, []);

  // Auto health check khi server offline
  useEffect(() => {
    if (!isServerOnline) {
      // Check ngay lần đầu
      checkConnection();

      // Setup interval để auto reconnect
      healthCheckIntervalRef.current = setInterval(() => {
        checkConnection();
      }, HEALTH_CHECK_INTERVAL);
    } else {
      // Nếu server online, clear interval
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
    }

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [isServerOnline, checkConnection]);

  return (
    <ConnectionContext.Provider
      value={{
        isServerOnline,
        checkConnection,
        setServerOnline,
      }}>
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within ConnectionProvider');
  }
  return context;
};

