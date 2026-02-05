/**
 * Friend Service
 * Xử lý các API liên quan đến friends
 */

import { apiService } from './api';
import { API_CONFIG } from '../config/api';

export interface FriendRequest {
  _id: string;
  senderId: string | UserInfo;
  receiverId: string | UserInfo;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface Friend {
  _id: string;
  friend: UserInfo;
  createdAt: string;
}

export interface UserInfo {
  _id: string;
  username: string;
  displayName: string;
  email: string;
  avatar?: string;
  onlineStatus?: 'online' | 'offline' | 'recently';
  lastSeenAt?: string;
}

export interface SearchUsersParams {
  query: string;
}

class FriendService {
  private baseURL = `${API_CONFIG.BASE_URL}/friends`;

  /**
   * Gửi lời mời kết bạn
   */
  async sendFriendRequest(receiverId: string) {
    const response = await apiService.post<FriendRequest>(
      `${this.baseURL}/requests`,
      { receiverId },
      true
    );
    return response;
  }

  /**
   * Lấy danh sách lời mời kết bạn
   */
  async getFriendRequests(type: 'received' | 'sent' | 'all' = 'all') {
    const response = await apiService.get<FriendRequest[]>(
      `${this.baseURL}/requests?type=${type}`,
      true
    );
    return response;
  }

  /**
   * Chấp nhận lời mời kết bạn
   */
  async acceptFriendRequest(requestId: string) {
    const response = await apiService.post(
      `${this.baseURL}/requests/${requestId}/accept`,
      undefined,
      true
    );
    return response;
  }

  /**
   * Từ chối lời mời kết bạn
   */
  async rejectFriendRequest(requestId: string) {
    const response = await apiService.post(
      `${this.baseURL}/requests/${requestId}/reject`,
      undefined,
      true
    );
    return response;
  }

  /**
   * Hủy lời mời kết bạn (cancel request)
   */
  async cancelFriendRequest(requestId: string) {
    const response = await apiService.delete(
      `${this.baseURL}/requests/${requestId}`,
      true
    );
    return response;
  }

  /**
   * Lấy danh sách bạn bè
   */
  async getFriends() {
    const response = await apiService.get<Friend[]>(this.baseURL, true);
    return response;
  }

  /**
   * Lấy danh sách bạn bè của một user cụ thể
   */
  async getUserFriends(userId: string) {
    try {
      const response = await apiService.get<Friend[]>(
        `${API_CONFIG.BASE_URL}/users/${userId}/friends`,
        true
      );
      return response;
    } catch (error: any) {
      // Nếu API chưa hỗ trợ, fallback về getFriends và filter
      console.warn('getUserFriends API not available, using fallback');
      const allFriendsResponse = await this.getFriends();
      if (allFriendsResponse.success && allFriendsResponse.data) {
        // Filter friends của user hiện tại (không phải userId)
        // Vì API này có thể không có, nên trả về empty array
        return {
          success: true,
          data: [] as Friend[],
          message: 'API chưa hỗ trợ',
        };
      }
      return allFriendsResponse;
    }
  }

  /**
   * Hủy kết bạn
   */
  async removeFriend(friendId: string) {
    const response = await apiService.delete(
      `${this.baseURL}/${friendId}`,
      true
    );
    return response;
  }

  /**
   * Tìm kiếm users
   * Endpoint: GET /api/v1/users/search?q={query}
   * - Tìm kiếm theo username (chính xác, nhanh): q=nguyen_van_a
   * - Tìm kiếm theo họ tên (mờ): q=Nguyễn Văn
   */
  async searchUsers(params: SearchUsersParams) {
    try {
      const { query } = params;
      const url = `${API_CONFIG.BASE_URL}/users/search?q=${encodeURIComponent(query)}`;
      
      console.log('🔍 [FriendService] searchUsers - Request:', {
        query,
        encodedQuery: encodeURIComponent(query),
        url,
        baseURL: API_CONFIG.BASE_URL,
      });
      
      const response = await apiService.get<UserInfo[]>(url, true);
      
      console.log('🔍 [FriendService] searchUsers - Response:', {
        success: response.success,
        message: response.message,
        hasData: !!response.data,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        dataLength: Array.isArray(response.data) ? response.data.length : 'N/A',
        dataPreview: Array.isArray(response.data) 
          ? response.data.slice(0, 2).map(u => ({ _id: u._id, username: u.username, displayName: u.displayName }))
          : response.data,
      });
      
      return response;
    } catch (error: any) {
      // Nếu endpoint chưa có, trả về empty array
      console.error('❌ [FriendService] searchUsers - Error:', {
        error,
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      return {
        success: false,
        message: 'Tính năng tìm kiếm chưa được hỗ trợ',
        data: [] as UserInfo[],
      };
    }
  }
}

export const friendService = new FriendService();
export default friendService;

