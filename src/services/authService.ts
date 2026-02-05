/**
 * Auth Service
 * Xử lý các API liên quan đến authentication
 */

import { apiService } from './api';
import { API_ENDPOINTS } from '../config/api';
import { Platform } from 'react-native';

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}

export interface LoginOTPData {
  email: string;
  password: string;
}

export interface VerifyLoginOTPData {
  email: string;
  otp: string;
  deviceId?: string;
  deviceName?: string;
  deviceType?: 'mobile' | 'web' | 'desktop' | 'tablet';
}

export interface User {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  isVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  session?: {
    id: string;
    deviceId: string;
    deviceName: string;
    deviceType: string;
  };
}

export interface Session {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  ipAddress: string;
  lastActiveAt: string;
  createdAt: string;
}

class AuthService {
  /**
   * Lấy device info
   */
  private getDeviceInfo() {
    const deviceType = Platform.OS === 'ios' || Platform.OS === 'android' ? 'mobile' : 'web';
    const deviceName = Platform.OS === 'ios' ? 'iOS Device' : Platform.OS === 'android' ? 'Android Device' : 'Web Browser';
    const deviceId = `${Platform.OS}_${Date.now()}`;

    return {
      deviceId,
      deviceName,
      deviceType: deviceType as 'mobile' | 'web' | 'desktop' | 'tablet',
    };
  }

  /**
   * Kiểm tra email đã đăng ký chưa
   */
  async checkEmail(email: string) {
    const response = await apiService.get<{ exists: boolean }>(
      `${API_ENDPOINTS.AUTH.CHECK_EMAIL}?email=${encodeURIComponent(email)}`,
      false
    );
    return response;
  }

  /**
   * Đăng ký tài khoản
   */
  async register(data: RegisterData) {
    const response = await apiService.post<AuthResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      {
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        displayName: data.displayName,
      },
      false
    );
    return response;
  }

  /**
   * Xác nhận email
   */
  async verifyEmail(token: string) {
    const response = await apiService.get<{ user: User }>(
      `${API_ENDPOINTS.AUTH.VERIFY_EMAIL}?token=${encodeURIComponent(token)}`,
      false
    );
    return response;
  }

  /**
   * Gửi lại email xác thực
   */
  async resendVerificationEmail(email: string) {
    const response = await apiService.post(
      API_ENDPOINTS.AUTH.RESEND_VERIFICATION_EMAIL,
      { email },
      false
    );
    return response;
  }

  /**
   * Gửi OTP đăng nhập
   */
  async sendLoginOTP(data: LoginOTPData) {
    const response = await apiService.post(
      API_ENDPOINTS.AUTH.SEND_LOGIN_OTP,
      {
        email: data.email,
        password: data.password,
      },
      false
    );
    return response;
  }

  /**
   * Xác nhận OTP và đăng nhập
   */
  async verifyLoginOTP(data: VerifyLoginOTPData) {
    const deviceInfo = this.getDeviceInfo();
    const response = await apiService.post<AuthResponse>(
      API_ENDPOINTS.AUTH.VERIFY_LOGIN_OTP,
      {
        email: data.email,
        otp: data.otp,
        deviceId: data.deviceId || deviceInfo.deviceId,
        deviceName: data.deviceName || deviceInfo.deviceName,
        deviceType: data.deviceType || deviceInfo.deviceType,
      },
      false
    );
    return response;
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    const response = await apiService.post<{ token: string; refreshToken: string }>(
      API_ENDPOINTS.AUTH.REFRESH_TOKEN,
      { refreshToken },
      false
    );
    return response;
  }

  /**
   * Đăng xuất
   */
  async logout() {
    const response = await apiService.post(API_ENDPOINTS.AUTH.LOGOUT, undefined, true);
    return response;
  }

  /**
   * Lấy danh sách sessions
   */
  async getSessions() {
    const response = await apiService.get<Session[]>(API_ENDPOINTS.AUTH.SESSIONS);
    return response;
  }

  /**
   * Xóa session
   */
  async deleteSession(sessionId: string) {
    const response = await apiService.delete(API_ENDPOINTS.AUTH.DELETE_SESSION(sessionId));
    return response;
  }

  /**
   * Đăng xuất tất cả thiết bị khác
   */
  async logoutAllOtherDevices(sessionId: string) {
    const response = await apiService.delete(API_ENDPOINTS.AUTH.SESSIONS, true, {
      'X-Session-Id': sessionId,
    });
    return response;
  }

  /**
   * Cập nhật thông tin user
   */
  async updateUser(data: { username?: string; email?: string; displayName?: string }) {
    const response = await apiService.put<User>(API_ENDPOINTS.AUTH.UPDATE_USER, data);
    return response;
  }

  /**
   * Gửi OTP đặt lại mật khẩu (quên mật khẩu)
   */
  async sendResetPasswordOTP(email: string) {
    const response = await apiService.post(
      API_ENDPOINTS.AUTH.SEND_RESET_PASSWORD_OTP,
      { email },
      false
    );
    return response;
  }

  /**
   * Xác nhận OTP và đặt lại mật khẩu
   */
  async verifyResetPasswordOTP(email: string, otp: string, newPassword: string) {
    const response = await apiService.post(
      API_ENDPOINTS.AUTH.VERIFY_RESET_PASSWORD_OTP,
      {
        email,
        otp,
        newPassword,
      },
      false
    );
    return response;
  }

  /**
   * Gửi OTP đổi mật khẩu (khi đã đăng nhập)
   */
  async sendChangePasswordOTP(oldPassword: string) {
    const response = await apiService.post(
      API_ENDPOINTS.AUTH.SEND_CHANGE_PASSWORD_OTP,
      {
        oldPassword,
      },
      true
    );
    return response;
  }

  /**
   * Xác nhận OTP và đổi mật khẩu
   */
  async verifyChangePasswordOTP(otp: string, newPassword: string) {
    const response = await apiService.post(
      API_ENDPOINTS.AUTH.VERIFY_CHANGE_PASSWORD_OTP,
      {
        otp,
        newPassword,
      },
      true
    );
    return response;
  }

  /**
   * Lấy thông tin user hiện tại
   * @deprecated Sử dụng userService.getCurrentUser() thay thế
   */
  async getCurrentUser() {
    // Chuyển sang dùng /users/me thay vì /auth/me
    const response = await apiService.get<User>(API_ENDPOINTS.USERS?.ME || '/users/me');
    return response;
  }
}

export const authService = new AuthService();
export default authService;

