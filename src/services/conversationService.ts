/**
 * Conversation Service
 * Xử lý các API liên quan đến conversations và messages
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './api';
import { API_CONFIG } from '../config/api';

export interface Conversation {
  _id: string;
  type: 'PRIVATE' | 'GROUP';
  name?: string;
  avatar?: string;
  // Các field hỗ trợ hiển thị phòng PRIVATE theo từng user (xem API_CONVERSATIONS_GUIDE.md 166-185)
  otherUserId?: string;
  otherUserName?: string;
  otherUserAvatar?: string | null;
  createdBy: string;
  memberCount: number;
  lastMessage?: {
    messageId: string;
    senderId: string;
    text: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  groupSettings?: {
    onlyAdminSend: boolean;
    allowRename: boolean;
  };
}

export interface ConversationMember {
  _id: string;
  conversationId: string;
  userId: string;
  nickname?: string;
  customBackground?: string;
  role: 'ADMIN' | 'MEMBER';
  isConversationBlocked: boolean;
  isMuted: boolean;
  isPinned: boolean;
  unreadCount: number;
  joinedAt: string;
  leftAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  type: 'TEXT' | 'IMAGE' | 'SYSTEM';
  content: {
    text?: string | null;
    mediaUrl?: string | null;
  };
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationWithMember {
  conversation: Conversation;
  memberSettings: ConversationMember;
}

export interface ConversationsListResponse {
  conversations: ConversationWithMember[];
  total: number;
  page: number;
  totalPages: number;
}

export interface MessagesListResponse {
  messages: Message[];
  total: number;
  page: number;
  totalPages: number;
}

export interface FilteredMessagesResponse extends MessagesListResponse {
  senderId: string;
}

export interface CreatePrivateConversationParams {
  userId: string;
}

export interface CreateGroupConversationParams {
  name: string;
  memberIds: string[];
}

export interface SendMessageParams {
  type: 'TEXT' | 'IMAGE';
  text?: string;
  mediaUrl?: string;
}

export interface UpdateConversationSettingsParams {
  nickname?: string;
  customBackground?: string;
  isMuted?: boolean;
  isPinned?: boolean;
  isBlocked?: boolean;
}

class ConversationService {
  private baseURL = `${API_CONFIG.BASE_URL}/conversations`;

  /**
   * Lấy danh sách phòng chat của user
   */
  async getConversations(page: number = 1, limit: number = 20) {
    const response = await apiService.get<ConversationsListResponse>(
      `${this.baseURL}?page=${page}&limit=${limit}`,
      true
    );
    return response;
  }

  /**
   * Tạo / lấy phòng chat 1-1 (PRIVATE)
   */
  async createOrGetPrivateConversation(params: CreatePrivateConversationParams) {
    const response = await apiService.post<{
      conversation: Conversation;
      memberSettings: ConversationMember;
    }>(`${this.baseURL}/private`, params, true);
    return response;
  }

  /**
   * Tạo phòng chat nhóm (GROUP)
   */
  async createGroupConversation(params: CreateGroupConversationParams) {
    const response = await apiService.post<{
      conversation: Conversation;
      members: ConversationMember[];
    }>(`${this.baseURL}/group`, params, true);
    return response;
  }

  /**
   * Lấy danh sách tin nhắn trong phòng
   */
  async getMessages(conversationId: string, page: number = 1, limit: number = 50) {
    const response = await apiService.get<MessagesListResponse>(
      `${this.baseURL}/${conversationId}/messages?page=${page}&limit=${limit}`,
      true
    );
    return response;
  }

  /**
   * Lọc tin nhắn theo người gửi trong phòng
   * @param conversationId - ID của phòng chat
   * @param senderId - ID của người gửi cần lọc (bắt buộc)
   * @param page - Số trang (mặc định: 1)
   * @param limit - Số lượng tin nhắn mỗi trang (mặc định: 50)
   */
  async getMessagesBySender(
    conversationId: string,
    senderId: string,
    page: number = 1,
    limit: number = 50
  ) {
    const response = await apiService.get<FilteredMessagesResponse>(
      `${this.baseURL}/${conversationId}/messages/filter?senderId=${encodeURIComponent(senderId)}&page=${page}&limit=${limit}`,
      true
    );
    return response;
  }

  /**
   * Gửi tin nhắn trong phòng
   */
  async sendMessage(conversationId: string, params: SendMessageParams) {
    const body: any = { type: params.type };
    if (params.type === 'TEXT' && params.text) {
      body.text = params.text;
    } else if (params.type === 'IMAGE' && params.mediaUrl) {
      body.mediaUrl = params.mediaUrl;
    }

    const response = await apiService.post<Message>(
      `${this.baseURL}/${conversationId}/messages`,
      body,
      true
    );
    return response;
  }

  /**
   * Upload ảnh cho chat
   */
  async uploadImage(conversationId: string, imageUri: string, imageType: string, fileName: string) {
    const formData = new FormData();
    
    // Xử lý URI cho iOS và Android
    const processedUri = Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri;
    
    // React Native FormData format
    formData.append('file', {
      uri: processedUri,
      type: imageType,
      name: fileName,
    } as any);

    // Lấy token từ AsyncStorage
    let token: string | null = null;
    try {
      token = await AsyncStorage.getItem('@auth_token');
    } catch (error) {
      console.error('Error getting token from AsyncStorage:', error);
    }

    if (!token) {
      throw new Error('Chưa cung cấp token. Vui lòng đăng nhập lại.');
    }

    const response = await fetch(`${this.baseURL}/${conversationId}/upload/image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Không set Content-Type, fetch sẽ tự động set với boundary cho FormData
      },
      body: formData,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }

    return data;
  }

  /**
   * Helper để lấy access token
   */
  private async getAccessToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      if (!token) {
        console.warn('⚠️ [ConversationService] No token found in AsyncStorage');
      }
      return token;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  /**
   * Cập nhật cấu hình phòng cho user (nickname / background / mute / pin / block)
   */
  async updateConversationSettings(
    conversationId: string,
    params: UpdateConversationSettingsParams
  ) {
    const response = await apiService.patch<ConversationMember>(
      `${this.baseURL}/${conversationId}/settings`,
      params,
      true
    );
    return response;
  }
}

export const conversationService = new ConversationService();
export default conversationService;

