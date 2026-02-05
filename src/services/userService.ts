/**
 * User Service
 * Xử lý các API liên quan đến user profile
 */

import { apiService } from './api';
import { API_ENDPOINTS } from '../config/api';

export interface UserProfile {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  bio?: string;
  phone?: string;
  avatar?: string | null;
  coverPhoto?: string | null;
  isVerified: boolean;
  lastSeenAt?: string;
  onlineStatus?: 'online' | 'offline';
  allowCalls?: boolean;
  allowMessagesFrom?: 'everyone' | 'contacts';
  privacy?: {
    lastSeen: 'everyone' | 'contacts' | 'nobody';
    profilePhoto: 'everyone' | 'contacts' | 'nobody';
    calls: 'everyone' | 'contacts' | 'nobody';
  };
  currentLocation?: string;
  hometown?: string;
  dateOfBirth?: string;
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed' | 'in_relationship' | 'prefer_not_to_say';
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  work?: {
    company?: string;
    position?: string;
  };
  education?: {
    school?: string;
    major?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  phone?: string;
  allowCalls?: boolean;
  allowMessagesFrom?: 'everyone' | 'contacts';
  privacy?: {
    lastSeen?: 'everyone' | 'contacts' | 'nobody';
    profilePhoto?: 'everyone' | 'contacts' | 'nobody';
    calls?: 'everyone' | 'contacts' | 'nobody';
  };
  currentLocation?: string;
  hometown?: string;
  dateOfBirth?: string;
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed' | 'in_relationship' | 'prefer_not_to_say';
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  work?: {
    company?: string;
    position?: string;
  };
  education?: {
    school?: string;
    major?: string;
  };
}

class UserService {
  /**
   * Lấy thông tin user hiện tại
   */
  async getCurrentUser() {
    const response = await apiService.get<UserProfile>(API_ENDPOINTS.USERS.ME);
    return response;
  }

  /**
   * Lấy thông tin user khác
   */
  async getUserById(userId: string) {
    const response = await apiService.get<UserProfile>(API_ENDPOINTS.USERS.GET_BY_ID(userId));
    return response;
  }

  /**
   * Upload avatar
   * @param uri - URI của ảnh (từ ImagePicker hoặc camera)
   * @param filename - Tên file (optional, sẽ tự động generate nếu không có)
   * @param type - MIME type của ảnh (optional, default: image/jpeg)
   */
  async uploadAvatar(uri: string, filename?: string, type: string = 'image/jpeg') {
    const { API_CONFIG } = await import('../config/api');
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const { Platform } = await import('react-native');
    
    const token = await AsyncStorage.getItem('@auth_token');
    if (!token) {
      throw new Error('Chưa cung cấp token');
    }

    // Xử lý URI cho iOS và Android
    const imageUri = Platform.OS === 'ios' ? uri.replace('file://', '') : uri;
    const imageName = filename || `avatar_${Date.now()}.jpg`;

    const formData = new FormData();
    formData.append('avatar', {
      uri: imageUri,
      name: imageName,
      type: type,
    } as any);

    const url = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.USERS.AVATAR}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Không set Content-Type, fetch sẽ tự động set với boundary cho FormData
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Upload avatar failed');
    }

    return data;
  }

  /**
   * Xóa avatar
   */
  async deleteAvatar() {
    const response = await apiService.delete(API_ENDPOINTS.USERS.AVATAR);
    return response;
  }

  /**
   * Upload cover photo
   * @param uri - URI của ảnh (từ ImagePicker hoặc camera)
   * @param filename - Tên file (optional, sẽ tự động generate nếu không có)
   * @param type - MIME type của ảnh (optional, default: image/jpeg)
   */
  async uploadCover(uri: string, filename?: string, type: string = 'image/jpeg') {
    const { API_CONFIG } = await import('../config/api');
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const { Platform } = await import('react-native');
    
    const token = await AsyncStorage.getItem('@auth_token');
    if (!token) {
      throw new Error('Chưa cung cấp token');
    }

    // Xử lý URI cho iOS và Android
    const imageUri = Platform.OS === 'ios' ? uri.replace('file://', '') : uri;
    const imageName = filename || `cover_${Date.now()}.jpg`;

    const formData = new FormData();
    formData.append('cover', {
      uri: imageUri,
      name: imageName,
      type: type,
    } as any);

    const url = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.USERS.COVER}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Không set Content-Type, fetch sẽ tự động set với boundary cho FormData
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Upload cover photo failed');
    }

    return data;
  }

  /**
   * Xóa cover photo
   */
  async deleteCover() {
    const response = await apiService.delete(API_ENDPOINTS.USERS.COVER);
    return response;
  }

  /**
   * Cập nhật profile
   */
  async updateProfile(data: UpdateProfileData) {
    const response = await apiService.put<UserProfile>(API_ENDPOINTS.USERS.PROFILE, data);
    return response;
  }
}

export const userService = new UserService();
export default userService;

