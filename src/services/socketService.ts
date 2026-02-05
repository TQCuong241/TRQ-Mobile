/**
 * Socket Service
 * Quản lý kết nối Socket.io cho real-time updates
 */

import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../config/api';

class SocketService {
  private socket: Socket | null = null;
  private baseURL: string;

  constructor() {
    // Lấy base URL từ API_CONFIG, bỏ /api/v1 để kết nối socket
    this.baseURL = API_CONFIG.BASE_URL.replace('/api/v1', '');
  }

  /**
   * Kết nối socket với authentication token
   */
  connect(token: string): Socket {
    // Nếu đã có socket thì chỉ cần cập nhật token và đảm bảo nó đang cố gắng reconnect
    if (this.socket) {
      // Cập nhật token mới vào auth (socket.io v4 hỗ trợ thay đổi auth runtime)
      // @ts-ignore
      this.socket.auth = { token };

      // Nếu chưa nối được thì chủ động gọi connect()
      if (!this.socket.connected) {
        this.socket.connect();
      }

      return this.socket;
    }

    this.socket = io(this.baseURL, {
      auth: {
        token,
      },
      transports: ['websocket'],
      // Bật cơ chế reconnect mạnh tay hơn để "mất là thử lại ngay"
      reconnection: true,
      reconnectionDelay: 0, // thử lại ngay lập tức lần đầu
      reconnectionDelayMax: 2000, // tối đa 2s giữa các lần thử
      reconnectionAttempts: Infinity, // thử lại vô hạn cho tới khi thành công hoặc logout
    });

    this.socket.on('connect', () => {
      console.log('✅ [Socket] Connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ [Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error: any) => {
      // Chỉ log lỗi nếu không phải do token expired
      const errorMessage = error?.message || '';
      if (!errorMessage.includes('Token không hợp lệ') && 
          !errorMessage.includes('đã hết hạn')) {
        console.error('❌ [Socket] Connection error:', error);
      }
    });

    return this.socket;
  }

  /**
   * Ngắt kết nối socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Lấy socket instance hiện tại
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Kiểm tra socket đã kết nối chưa
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
export default socketService;

