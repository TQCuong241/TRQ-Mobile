import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../services/authService';
import { socketService } from '../services/socketService';
import { pushNotificationService } from '../services/pushNotificationService';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  login: (accessToken: string, refreshToken: string, user?: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = '@auth_token';
const REFRESH_TOKEN_KEY = '@auth_refresh_token';
const USER_KEY = '@auth_user';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token from storage when app starts
  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      const storedRefreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem(USER_KEY);

      if (storedToken && storedRefreshToken) {
        setToken(storedToken);
        setRefreshToken(storedRefreshToken);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (accessToken: string, refreshTokenValue: string, userData?: User) => {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, accessToken);
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshTokenValue);
      if (userData) {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
        setUser(userData);
      }
      setToken(accessToken);
      setRefreshToken(refreshTokenValue);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error saving tokens:', error);
      throw error;
    }
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    AsyncStorage.setItem(USER_KEY, JSON.stringify(userData)).catch((error) => {
      console.error('Error saving user:', error);
    });
  };

  const logout = async () => {
    try {
      // Disconnect socket trước khi xóa token
      socketService.disconnect();
      
      // Unregister push notification token
      try {
        await pushNotificationService.unregisterPushToken();
      } catch (error) {
        // Ignore push notification errors during logout
      }

      // Xóa tokens và user data
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      setToken(null);
      setRefreshToken(null);
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error removing tokens:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        token,
        refreshToken,
        user,
        login,
        logout,
        updateUser,
        isLoading,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

