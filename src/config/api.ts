/**
 * API Configuration
 * Base URL và các cấu hình API
 */

const URL = '121.146.3.151'

export const API_CONFIG = {
  BASE_URL: `http://${URL}:3000/api/v1`,
  AUTH_BASE_URL: `http://${URL}:3000/api/v1/auth`,
  TIMEOUT: 30000, // 30 seconds
} as const;

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    CHECK_EMAIL: '/auth/check-email',
    REGISTER: '/auth/register',
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_VERIFICATION_EMAIL: '/auth/resend-verification-email',
    SEND_LOGIN_OTP: '/auth/send-login-otp',
    VERIFY_LOGIN_OTP: '/auth/verify-login-otp',
    REFRESH_TOKEN: '/auth/refresh',
    LOGOUT: '/auth/logout',
    SESSIONS: '/auth/sessions',
    DELETE_SESSION: (id: string) => `/auth/sessions/${id}`,
    UPDATE_USER: '/auth/update',
    GET_CURRENT_USER: '/auth/me',
    SEND_RESET_PASSWORD_OTP: '/auth/send-reset-password-otp',
    VERIFY_RESET_PASSWORD_OTP: '/auth/verify-reset-password-otp',
    SEND_CHANGE_PASSWORD_OTP: '/auth/send-change-password-otp',
    VERIFY_CHANGE_PASSWORD_OTP: '/auth/verify-change-password-otp',
  },
  // Users endpoints
  USERS: {
    ME: '/users/me',
    GET_BY_ID: (id: string) => `/users/${id}`,
    AVATAR: '/users/avatar',
    COVER: '/users/cover',
    PROFILE: '/users/profile',
  },
} as const;

export default API_CONFIG;

