import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useFriendRequest } from '../contexts/FriendRequestContext';
import { useSocket } from '../contexts/SocketContext';
import CustomText from '../components/CustomText';
import { friendService, type FriendRequest } from '../services';
import { useAlert } from '../hooks/useAlert';
import { RootStackParamList } from '../types/navigation';
import { API_CONFIG } from '../config/api';

type FriendRequestsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

function FriendRequestsScreen() {
  const navigation = useNavigation<FriendRequestsScreenNavigationProp>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { refreshFriendRequestCount } = useFriendRequest();
  const { socket } = useSocket();
  const { showAlert } = useAlert();

  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFriendRequests();
  }, []);

  // Listen to socket events for real-time updates
  useEffect(() => {
    if (!socket) return;

    // Khi nhận lời mời mới
    const handleFriendRequestReceived = (data: { friendRequest: FriendRequest }) => {
      console.log('🔔 [FriendRequestsScreen] Friend request received:', data.friendRequest);
      if (data.friendRequest.status === 'pending') {
        setFriendRequests((prev) => {
          const exists = prev.some((req) => req._id === data.friendRequest._id);
          if (!exists) {
            return [data.friendRequest, ...prev];
          }
          return prev;
        });
        refreshFriendRequestCount();
      }
    };

    // Khi lời mời được xử lý
    const handleFriendRequestUpdated = (data: {
      friendRequest: FriendRequest;
      action: 'accepted' | 'rejected' | 'cancelled';
    }) => {
      console.log('🔔 [FriendRequestsScreen] Friend request updated:', data);
      // Xóa khỏi danh sách
      setFriendRequests((prev) =>
        prev.filter((req) => req._id !== data.friendRequest._id)
      );
      refreshFriendRequestCount();
    };

    socket.on('friend:request:received', handleFriendRequestReceived);
    socket.on('friend:request:updated', handleFriendRequestUpdated);

    return () => {
      socket.off('friend:request:received', handleFriendRequestReceived);
      socket.off('friend:request:updated', handleFriendRequestUpdated);
    };
  }, [socket, refreshFriendRequestCount]);

  const loadFriendRequests = async () => {
    try {
      setLoading(true);
      const response = await friendService.getFriendRequests('received');
      if (response.success && response.data) {
        const requests = Array.isArray(response.data) ? response.data : [];
        // Chỉ lấy các lời mời pending
        const pendingRequests = requests.filter((r) => r.status === 'pending');
        setFriendRequests(pendingRequests);
      }
    } catch (error: any) {
      console.error('Error loading friend requests:', error);
      showAlert('Lỗi', 'Không thể tải danh sách lời mời', [{ text: 'OK' }], 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptFriendRequest = async (request: FriendRequest) => {
    try {
      const response = await friendService.acceptFriendRequest(request._id);
      if (response.success) {
        showAlert('Thành công', 'Đã chấp nhận lời mời kết bạn', [{ text: 'OK' }], 'success');
        // Xóa khỏi danh sách
        setFriendRequests((prev) => prev.filter((req) => req._id !== request._id));
        refreshFriendRequestCount();
      } else {
        showAlert('Lỗi', response.message || 'Không thể chấp nhận lời mời', [{ text: 'OK' }], 'error');
      }
    } catch (error: any) {
      console.error('Error accepting friend request:', error);
      showAlert('Lỗi', error.message || 'Có lỗi xảy ra', [{ text: 'OK' }], 'error');
    }
  };

  const handleRejectFriendRequest = async (request: FriendRequest) => {
    try {
      const response = await friendService.rejectFriendRequest(request._id);
      if (response.success) {
        showAlert('Thành công', 'Đã từ chối lời mời kết bạn', [{ text: 'OK' }], 'success');
        // Xóa khỏi danh sách
        setFriendRequests((prev) => prev.filter((req) => req._id !== request._id));
        refreshFriendRequestCount();
      } else {
        showAlert('Lỗi', response.message || 'Không thể từ chối lời mời', [{ text: 'OK' }], 'error');
      }
    } catch (error: any) {
      console.error('Error rejecting friend request:', error);
      showAlert('Lỗi', error.message || 'Có lỗi xảy ra', [{ text: 'OK' }], 'error');
    }
  };

  const getAvatarUrl = (avatarPath?: string | null) => {
    if (!avatarPath) return null;
    if (avatarPath.startsWith('http')) {
      return avatarPath;
    }
    return `${API_CONFIG.BASE_URL.replace('/api/v1', '')}${avatarPath}`;
  };

  const getSenderInfo = (request: FriendRequest) => {
    if (typeof request.senderId === 'string') {
      return null;
    }
    return request.senderId;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <CustomText variant="h2" weight="bold" color="#FFFFFF" style={styles.headerTitle}>
          Lời mời kết bạn
        </CustomText>
        <View style={styles.backButton} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : friendRequests.length > 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {friendRequests.map((request) => {
            const sender = getSenderInfo(request);
            if (!sender) return null;

            const avatarUrl = getAvatarUrl(sender.avatar);

            return (
              <View
                key={request._id}
                style={[styles.requestItem, { backgroundColor: colors.card }]}>
                <TouchableOpacity
                  style={styles.userInfo}
                  onPress={() => navigation.navigate('UserProfile', { userId: sender._id })}
                  activeOpacity={0.7}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} resizeMode="cover" />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
                      <Icon name="account-circle" size={50} color={colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.userDetails}>
                    <CustomText variant="body" weight="semibold" color={colors.text}>
                      {sender.displayName || sender.username}
                    </CustomText>
                    {sender.username && (
                      <CustomText variant="caption" color={colors.textSecondary}>
                        @{sender.username}
                      </CustomText>
                    )}
                  </View>
                </TouchableOpacity>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton, { backgroundColor: colors.primary }]}
                    onPress={() => handleAcceptFriendRequest(request)}
                    activeOpacity={0.8}>
                    <Icon name="check" size={20} color="#FFFFFF" />
                    <CustomText variant="body" weight="semibold" color="#FFFFFF" style={styles.actionButtonText}>
                      Chấp nhận
                    </CustomText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.rejectButton,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                    onPress={() => handleRejectFriendRequest(request)}
                    activeOpacity={0.8}>
                    <Icon name="close" size={20} color={colors.text} />
                    <CustomText variant="body" weight="semibold" color={colors.text} style={styles.actionButtonText}>
                      Từ chối
                    </CustomText>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Icon name="people-outline" size={64} color={colors.textSecondary} />
          <CustomText variant="body" color={colors.textSecondary} style={styles.emptyText}>
            Không có lời mời kết bạn nào
          </CustomText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
  },
  backButton: {
    padding: 4,
    width: 32,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  requestItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  acceptButton: {},
  rejectButton: {
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    gap: 16,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
  },
});

export default FriendRequestsScreen;

