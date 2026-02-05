/**
 * Notification Service
 * Xử lý các API liên quan đến notifications
 */

import { apiService } from './api';
import { API_CONFIG } from '../config/api';

export interface Notification {
  _id: string;
  userId: string;
  type: 'friend_request' | 'friend_request_accepted' | 'friend_request_rejected' | 'friend_removed' | 'message' | 'call' | 'system';
  title: string;
  body: string;
  data?: {
    friendRequestId?: string;
    friendId?: string;
    senderId?: string;
    conversationId?: string;
    roomId?: string;
    [key: string]: any;
  };
  read: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  page: number;
  totalPages: number;
  unreadCount: number;
}

export interface GetNotificationsParams {
  limit?: number;
  page?: number;
  read?: boolean;
  type?: string;
}

class NotificationService {
  private baseURL = `${API_CONFIG.BASE_URL}/notifications`;

  /**
   * Lấy danh sách notifications
   */
  async getNotifications(params: GetNotificationsParams = {}) {
    const { limit = 20, page = 1, read, type } = params;
    let url = `${this.baseURL}?limit=${limit}&page=${page}`;
    
    if (read !== undefined) {
      url += `&read=${read}`;
    }
    if (type) {
      url += `&type=${type}`;
    }

    const response = await apiService.get<NotificationListResponse>(url, true);
    return response;
  }

  /**
   * Lấy số lượng notifications chưa đọc
   */
  async getUnreadCount() {
    const response = await apiService.get<{ count: number }>(
      `${this.baseURL}/unread-count`,
      true
    );
    return response;
  }

  /**
   * Đánh dấu notification là đã đọc
   */
  async markAsRead(notificationId: string) {
    const response = await apiService.patch<Notification>(
      `${this.baseURL}/${notificationId}/read`,
      undefined,
      true
    );
    return response;
  }

  /**
   * Đánh dấu tất cả notifications là đã đọc
   */
  async markAllAsRead() {
    const response = await apiService.patch<{ count: number }>(
      `${this.baseURL}/read-all`,
      undefined,
      true
    );
    return response;
  }

  /**
   * Xóa notification
   */
  async deleteNotification(notificationId: string) {
    const response = await apiService.delete(
      `${this.baseURL}/${notificationId}`,
      true
    );
    return response;
  }

  /**
   * Xóa tất cả notifications đã đọc
   */
  async deleteReadNotifications() {
    const response = await apiService.delete<{ count: number }>(
      `${this.baseURL}/read`,
      true
    );
    return response;
  }

  /**
   * Đăng ký push token
   */
  async registerPushToken(data: {
    token: string;
    platform: 'android' | 'ios' | 'web';
    deviceId?: string;
    deviceName?: string;
  }) {
    try {
      // Preferred endpoint (documented in this guide section 7)
      return await apiService.post(`${this.baseURL}/push-token`, data, true);
    } catch (error: any) {
      const msg = String(error?.message || error);
      // Some backends use the checklist route: POST /api/v1/users/push-token
      if (msg.includes('Không tìm thấy đường dẫn') || msg.toLowerCase().includes('not found')) {
        return await apiService.post(`${API_CONFIG.BASE_URL}/users/push-token`, data, true);
      }
      throw error;
    }
  }

  /**
   * Hủy đăng ký push token
   */
  async unregisterPushToken(token: string) {
    // Endpoint per checklist: DELETE /api/v1/users/push-token with { token } in body
    return await apiService.delete(`${API_CONFIG.BASE_URL}/users/push-token`, true, undefined, { token });
  }

  /**
   * Lấy danh sách push tokens
   */
  async getPushTokens() {
    const response = await apiService.get(
      `${API_CONFIG.BASE_URL}/users/push-tokens`,
      true
    );
    return response;
  }
}

export const notificationService = new NotificationService();
export default notificationService;

