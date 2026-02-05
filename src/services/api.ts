/**
 * API Service
 * Xử lý các HTTP requests và interceptors
 */

import { API_CONFIG, API_ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Connection context sẽ được inject từ bên ngoài
let connectionContextRef: { setServerOnline: (status: boolean) => void } | null = null;
let logoutCallback: (() => Promise<void>) | null = null;

export const setConnectionContext = (context: { setServerOnline: (status: boolean) => void }) => {
  connectionContextRef = context;
};

export const setLogoutCallback = (callback: () => Promise<void>) => {
  logoutCallback = callback;
};

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  code?: string;
}

const TOKEN_KEY = '@auth_token';
const REFRESH_TOKEN_KEY = '@auth_refresh_token';

class ApiService {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  /**
   * Lấy access token từ storage
   */
  private async getAccessToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      return token;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  /**
   * Lấy refresh token từ storage
   */
  private async getRefreshToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      return token;
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  /**
   * Lưu tokens vào storage
   */
  private async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        [TOKEN_KEY, accessToken],
        [REFRESH_TOKEN_KEY, refreshToken],
      ]);
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

  /**
   * Xóa tokens khỏi storage
   */
  private async clearTokens(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY]);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(): Promise<string | null> {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseURL}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data: ApiResponse<{ token: string; refreshToken: string }> = await response.json();

      if (data.success && data.data) {
        await this.saveTokens(data.data.token, data.data.refreshToken);
        return data.data.token;
      }

      return null;
    } catch (error) {
      console.error('Refresh token error:', error);
      return null;
    }
  }

  /**
   * Tạo headers cho request
   */
  private async getHeaders(includeAuth: boolean = true): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = await this.getAccessToken();
      if (!token) {
        throw new Error('Chưa cung cấp token');
      }
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Xử lý response
   */
  private async handleResponse<T>(response: Response, shouldRetry: boolean = false): Promise<ApiResponse<T>> {
    // Nếu token hết hạn và chưa retry, thử refresh và retry
    if (response.status === 401 && !shouldRetry) {
      const currentToken = await this.getAccessToken();
      if (currentToken) {
        const newToken = await this.refreshAccessToken();
        if (newToken) {
          // Token đã được refresh, trả về flag để retry
          throw { shouldRetry: true, isTokenExpired: true };
        } else {
          // Refresh failed, logout user
          await this.clearTokens();
          if (logoutCallback) {
            await logoutCallback();
          }
          throw new Error('Session expired, please login again');
        }
      }
    }

    // Đọc response body sau khi đã xử lý 401
    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    // Nếu request thành công, đánh dấu server online
    if (connectionContextRef) {
      connectionContextRef.setServerOnline(true);
    }

    return data;
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, requireAuth: boolean = true, retryCount: number = 0): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getHeaders(requireAuth);
      const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return await this.handleResponse<T>(response, retryCount > 0);
    } catch (error: any) {
      // Nếu là token expired và chưa retry, retry với token mới
      if (error.shouldRetry && error.isTokenExpired && retryCount === 0 && requireAuth) {
        return this.get<T>(endpoint, requireAuth, 1);
      }

      // Phát hiện lỗi connection
      if (error.name === 'AbortError' || error.message?.includes('network') || error.message?.includes('timeout')) {
        if (connectionContextRef) {
          connectionContextRef.setServerOnline(false);
        }
        throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
      }
      throw error;
    }
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    body?: any,
    requireAuth: boolean = false,
    retryCount: number = 0
  ): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getHeaders(requireAuth);
      const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return await this.handleResponse<T>(response, retryCount > 0);
    } catch (error: any) {
      // Nếu là token expired và chưa retry, retry với token mới
      if (error.shouldRetry && error.isTokenExpired && retryCount === 0 && requireAuth) {
        return this.post<T>(endpoint, body, requireAuth, 1);
      }

      // Phát hiện lỗi connection
      if (error.name === 'AbortError' || error.message?.includes('network') || error.message?.includes('timeout')) {
        if (connectionContextRef) {
          connectionContextRef.setServerOnline(false);
        }
        throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
      }
      throw error;
    }
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: any, requireAuth: boolean = true, retryCount: number = 0): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getHeaders(requireAuth);
      const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return await this.handleResponse<T>(response, retryCount > 0);
    } catch (error: any) {
      // Nếu là token expired và chưa retry, retry với token mới
      if (error.shouldRetry && error.isTokenExpired && retryCount === 0 && requireAuth) {
        return this.put<T>(endpoint, body, requireAuth, 1);
      }

      // Phát hiện lỗi connection
      if (error.name === 'AbortError' || error.message?.includes('network') || error.message?.includes('timeout')) {
        if (connectionContextRef) {
          connectionContextRef.setServerOnline(false);
        }
        throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
      }
      throw error;
    }
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: any, requireAuth: boolean = true, retryCount: number = 0): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getHeaders(requireAuth);
      const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return await this.handleResponse<T>(response, retryCount > 0);
    } catch (error: any) {
      // Nếu là token expired và chưa retry, retry với token mới
      if (error.shouldRetry && error.isTokenExpired && retryCount === 0 && requireAuth) {
        return this.patch<T>(endpoint, body, requireAuth, 1);
      }

      // Phát hiện lỗi connection
      if (error.name === 'AbortError' || error.message?.includes('network') || error.message?.includes('timeout')) {
        if (connectionContextRef) {
          connectionContextRef.setServerOnline(false);
        }
        throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
      }
      throw error;
    }
  }

  /**
   * DELETE request
   */
  async delete<T>(
    endpoint: string,
    requireAuth: boolean = true,
    additionalHeaders?: Record<string, string>,
    body?: any,
    retryCount: number = 0
  ): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getHeaders(requireAuth);
      const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;

      const finalHeaders = additionalHeaders ? { ...headers, ...additionalHeaders } : headers;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'DELETE',
        headers: finalHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return await this.handleResponse<T>(response, retryCount > 0);
    } catch (error: any) {
      // Nếu là token expired và chưa retry, retry với token mới
      if (error.shouldRetry && error.isTokenExpired && retryCount === 0 && requireAuth) {
        return this.delete<T>(endpoint, requireAuth, additionalHeaders, body, 1);
      }

      // Phát hiện lỗi connection
      if (error.name === 'AbortError' || error.message?.includes('network') || error.message?.includes('timeout')) {
        if (connectionContextRef) {
          connectionContextRef.setServerOnline(false);
        }
        throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
      }
      throw error;
    }
  }
}

export const apiService = new ApiService();
export default apiService;

