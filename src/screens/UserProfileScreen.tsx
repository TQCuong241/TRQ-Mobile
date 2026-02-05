import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useFriendRequest } from '../contexts/FriendRequestContext';
import { useSocket } from '../contexts/SocketContext';
import CustomText from '../components/CustomText';
import { userService, type UserProfile } from '../services';
import { useAlert } from '../hooks/useAlert';
import { RootStackParamList } from '../types/navigation';
import { API_CONFIG } from '../config/api';
import { friendService } from '../services';
import type { FriendRequest, Friend } from '../services';

type UserProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type UserProfileScreenRouteProp = RouteProp<RootStackParamList, 'UserProfile'>;

// Helper functions
const formatDateOfBirth = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day} tháng ${month}, ${year}`;
  } catch {
    return dateString;
  }
};

const getMaritalStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    single: 'Độc thân',
    married: 'Đã kết hôn',
    divorced: 'Đã ly dị',
    widowed: 'Góa',
    in_relationship: 'Đang trong mối quan hệ',
    prefer_not_to_say: 'Không muốn tiết lộ',
  };
  return labels[status] || status;
};

const getGenderLabel = (gender: string): string => {
  const labels: Record<string, string> = {
    male: 'Nam',
    female: 'Nữ',
    other: 'Khác',
    prefer_not_to_say: 'Không muốn tiết lộ',
  };
  return labels[gender] || gender;
};

function UserProfileScreen() {
  const navigation = useNavigation<UserProfileScreenNavigationProp>();
  const route = useRoute<UserProfileScreenRouteProp>();
  const { colors } = useTheme();
  const { user: currentUser } = useAuth();
  const { showAlert } = useAlert();
  const { refreshFriendRequestCount } = useFriendRequest();
  const { socket } = useSocket();

  const userId = route.params?.userId || '';
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'photos' | 'reels'>('all');
  const [isFriend, setIsFriend] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [friendRequestReceived, setFriendRequestReceived] = useState(false);
  const [friendRequestId, setFriendRequestId] = useState<string | null>(null);
  const [sentFriendRequestId, setSentFriendRequestId] = useState<string | null>(null);
  const [friendRelationId, setFriendRelationId] = useState<string | null>(null);
  const [userFriends, setUserFriends] = useState<Friend[]>([]);

  useEffect(() => {
    loadUserProfile();
    checkFriendStatus();
    loadUserFriends();
  }, [userId]);

  // Listen to socket events for real-time updates
  useEffect(() => {
    if (!socket || !userId) return;

    // Khi lời mời được xử lý (accept/reject/cancel) - update UI
    const handleFriendRequestUpdated = (data: {
      friendRequest: FriendRequest;
      action: 'accepted' | 'rejected' | 'cancelled';
    }) => {
      console.log('🔔 [UserProfileScreen] Friend request updated:', data);
      const { friendRequest } = data;
      
      // Kiểm tra xem có liên quan đến user hiện tại không
      const senderId = typeof friendRequest.senderId === 'string' 
        ? friendRequest.senderId 
        : friendRequest.senderId?._id;
      const receiverId = typeof friendRequest.receiverId === 'string' 
        ? friendRequest.receiverId 
        : friendRequest.receiverId?._id;

      // Nếu liên quan đến user hiện tại, refresh status
      if (senderId === userId || receiverId === userId) {
        checkFriendStatus();
        refreshFriendRequestCount();
      }
    };

    // Khi kết bạn thành công - update UI
    const handleFriendAdded = (data: { friend: Friend }) => {
      console.log('🔔 [UserProfileScreen] Friend added:', data.friend);
      const friendId = typeof data.friend.friend === 'string' 
        ? data.friend.friend 
        : data.friend.friend?._id;
      
      // Nếu là user hiện tại, refresh status
      if (friendId === userId || data.friend.userId === userId) {
        checkFriendStatus();
      }
    };

    socket.on('friend:request:updated', handleFriendRequestUpdated);
    socket.on('friend:added', handleFriendAdded);

    return () => {
      socket.off('friend:request:updated', handleFriendRequestUpdated);
      socket.off('friend:added', handleFriendAdded);
    };
  }, [socket, userId]);

  const loadUserProfile = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await userService.getUserById(userId);
      if (response.success && response.data) {
        setProfileData(response.data);
      } else {
        showAlert('Lỗi', response.message || 'Không thể tải thông tin người dùng', [{ text: 'OK' }], 'error');
        navigation.goBack();
      }
    } catch (error: any) {
      console.error('Error loading user profile:', error);
      showAlert('Lỗi', error.message || 'Có lỗi xảy ra', [{ text: 'OK' }], 'error');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadUserFriends = async () => {
    if (!userId) return;

    try {
      const response = await friendService.getUserFriends(userId);
      if (response.success && response.data) {
        const friendsList = Array.isArray(response.data) ? response.data : [];
        setUserFriends(friendsList.slice(0, 5)); // Chỉ lấy 5 người đầu tiên
      }
    } catch (error) {
      console.error('Error loading user friends:', error);
    }
  };

  const checkFriendStatus = async () => {
    if (!userId || !currentUser) return;

    try {
      // Check if already friends
      const friendsResponse = await friendService.getFriends();
      if (friendsResponse.success && friendsResponse.data) {
        const friends = Array.isArray(friendsResponse.data) ? friendsResponse.data : [];
        const foundFriend = friends.find((f) => {
          const friendId = typeof f.friend === 'string' ? f.friend : f.friend?._id;
          return friendId === userId;
        });
        const isAlreadyFriend = !!foundFriend;
        setIsFriend(isAlreadyFriend);
        setFriendRelationId(foundFriend?._id || null);

        if (!isAlreadyFriend) {
          // Check if friend request sent (mình đã gửi cho họ)
          const sentRequestsResponse = await friendService.getFriendRequests('sent');
          if (sentRequestsResponse.success && sentRequestsResponse.data) {
            const sentRequests = Array.isArray(sentRequestsResponse.data) ? sentRequestsResponse.data : [];
            const requestSent = sentRequests.find(
              (r) => (typeof r.receiverId === 'string' ? r.receiverId : r.receiverId?._id) === userId
            );
            if (requestSent) {
              setFriendRequestSent(true);
              setSentFriendRequestId(requestSent._id);
            } else {
              setFriendRequestSent(false);
              setSentFriendRequestId(null);
            }
          }

          // Check if friend request received (họ đã gửi cho mình)
          const receivedRequestsResponse = await friendService.getFriendRequests('received');
          if (receivedRequestsResponse.success && receivedRequestsResponse.data) {
            const receivedRequests = Array.isArray(receivedRequestsResponse.data) ? receivedRequestsResponse.data : [];
            const requestReceived = receivedRequests.find(
              (r) => (typeof r.senderId === 'string' ? r.senderId : r.senderId?._id) === userId
            );
            if (requestReceived) {
              setFriendRequestReceived(true);
              setFriendRequestId(requestReceived._id);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error checking friend status:', error);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!userId) return;

    try {
      const response = await friendService.sendFriendRequest(userId);
      if (response.success) {
        showAlert('Thành công', 'Đã gửi lời mời kết bạn', [{ text: 'OK' }], 'success');
        // Refresh friend status để cập nhật UI
        await checkFriendStatus();
        // Lưu request ID nếu có
        if (response.data && typeof response.data === 'object' && '_id' in response.data) {
          setSentFriendRequestId((response.data as any)._id);
        }
      } else {
        showAlert('Lỗi', response.message || 'Không thể gửi lời mời', [{ text: 'OK' }], 'error');
      }
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      showAlert('Lỗi', error.message || 'Có lỗi xảy ra', [{ text: 'OK' }], 'error');
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!friendRequestId) return;

    try {
      const response = await friendService.acceptFriendRequest(friendRequestId);
      if (response.success) {
        showAlert('Thành công', 'Đã chấp nhận lời mời kết bạn', [{ text: 'OK' }], 'success');
        // Refresh friend status để cập nhật UI
        await checkFriendStatus();
        // Refresh friend request count
        await refreshFriendRequestCount();
      } else {
        showAlert('Lỗi', response.message || 'Không thể chấp nhận lời mời', [{ text: 'OK' }], 'error');
      }
    } catch (error: any) {
      console.error('Error accepting friend request:', error);
      showAlert('Lỗi', error.message || 'Có lỗi xảy ra', [{ text: 'OK' }], 'error');
    }
  };

  const handleRejectFriendRequest = async () => {
    if (!friendRequestId) return;

    try {
      const response = await friendService.rejectFriendRequest(friendRequestId);
      if (response.success) {
        showAlert('Thành công', 'Đã từ chối lời mời kết bạn', [{ text: 'OK' }], 'success');
        // Refresh friend status để cập nhật UI
        await checkFriendStatus();
        // Refresh friend request count
        await refreshFriendRequestCount();
      } else {
        showAlert('Lỗi', response.message || 'Không thể từ chối lời mời', [{ text: 'OK' }], 'error');
      }
    } catch (error: any) {
      console.error('Error rejecting friend request:', error);
      showAlert('Lỗi', error.message || 'Có lỗi xảy ra', [{ text: 'OK' }], 'error');
    }
  };

  const handleCancelFriendRequest = async () => {
    if (!sentFriendRequestId) return;

    try {
      const response = await friendService.cancelFriendRequest(sentFriendRequestId);
      if (response.success) {
        showAlert('Thành công', 'Đã thu hồi lời mời kết bạn', [{ text: 'OK' }], 'success');
        // Refresh friend status để cập nhật UI
        await checkFriendStatus();
      } else {
        showAlert('Lỗi', response.message || 'Không thể thu hồi lời mời', [{ text: 'OK' }], 'error');
      }
    } catch (error: any) {
      console.error('Error canceling friend request:', error);
      showAlert('Lỗi', error.message || 'Có lỗi xảy ra', [{ text: 'OK' }], 'error');
    }
  };

  const handleRemoveFriend = async () => {
    if (!friendRelationId) {
      console.log('🧨 [UserProfileScreen] handleRemoveFriend gọi nhưng không có friendRelationId');
      return;
    }

    try {
      console.log('🔴 [UserProfileScreen] Gửi API hủy kết bạn với friendRelationId:', friendRelationId, 'userId:', userId);
      const response = await friendService.removeFriend(friendRelationId);
      if (response.success) {
        console.log('✅ [UserProfileScreen] Hủy kết bạn thành công:', {
          friendRelationId,
          userId,
        });
        showAlert('Thành công', 'Đã hủy kết bạn', [{ text: 'OK' }], 'success');
        await checkFriendStatus();
      } else {
        console.log('❌ [UserProfileScreen] Hủy kết bạn thất bại:', response.message);
        showAlert('Lỗi', response.message || 'Không thể hủy kết bạn', [{ text: 'OK' }], 'error');
      }
    } catch (error: any) {
      console.error('Error removing friend:', error);
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

  const getCoverUrl = (coverPath?: string | null) => {
    if (!coverPath) return null;
    if (coverPath.startsWith('http')) {
      return coverPath;
    }
    return `${API_CONFIG.BASE_URL.replace('/api/v1', '')}${coverPath}`;
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!profileData) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Cover Area */}
        <View style={styles.coverArea}>
          {getCoverUrl(profileData.coverPhoto) ? (
            <Image
              source={{ uri: getCoverUrl(profileData.coverPhoto) || undefined }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.coverGradient, { backgroundColor: colors.surface }]} />
          )}
          {/* Back Button */}
          <TouchableOpacity 
            style={[styles.backButton, { top: Platform.OS === 'ios' ? 50 : 12 }]} 
            onPress={() => navigation.goBack()} 
            activeOpacity={0.7}>
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {getAvatarUrl(profileData.avatar) ? (
              <Image
                source={{ uri: getAvatarUrl(profileData.avatar) || undefined }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
                <Icon name="account-circle" size={120} color={colors.textSecondary} />
              </View>
            )}
          </View>

          <View style={styles.userInfo}>
            <CustomText variant="h2" weight="bold" color={colors.text} style={styles.displayName}>
              {profileData.displayName}
            </CustomText>
            {profileData.email && (
              <CustomText variant="body" color={colors.textSecondary} style={styles.email}>
                {profileData.email}
              </CustomText>
            )}
            {profileData.username && (
              <CustomText variant="body" color={colors.textSecondary} style={styles.username}>
                @{profileData.username}
              </CustomText>
            )}
          </View>

          {/* Bio */}
          {profileData.bio && (
            <CustomText variant="body" color={colors.text} style={styles.bio}>
              {profileData.bio}
            </CustomText>
          )}

          {/* Friends List */}
          {userFriends.length > 0 && (
            <View style={styles.friendsSection}>
              <CustomText variant="body" weight="semibold" color={colors.text} style={styles.friendsTitle}>
                Bạn bè
              </CustomText>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.friendsList}>
                {userFriends.map((friendItem) => {
                  const friend = friendItem.friend;
                  const friendAvatarUrl = friend.avatar 
                    ? getAvatarUrl(friend.avatar) 
                    : null;
                  return (
                    <TouchableOpacity
                      key={friendItem._id}
                      style={styles.friendItem}
                      onPress={() => {
                        navigation.navigate('UserProfile', { userId: friend._id });
                      }}
                      activeOpacity={0.7}>
                      <View style={styles.friendAvatarContainer}>
                        {friendAvatarUrl ? (
                          <Image
                            source={{ uri: friendAvatarUrl }}
                            style={styles.friendAvatar}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.friendAvatar, { backgroundColor: colors.surface }]}>
                            <Icon name="account-circle" size={40} color={colors.textSecondary} />
                          </View>
                        )}
                      </View>
                      <CustomText 
                        variant="caption" 
                        color={colors.text} 
                        numberOfLines={1}
                        style={styles.friendName}>
                        {friend.displayName || friend.username}
                      </CustomText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Work/Education */}
          {(profileData.work?.company || profileData.work?.position || profileData.education?.school) && (
            <View style={styles.workEducation}>
              {profileData.work?.company && (
                <View style={styles.workEducationItem}>
                  <Icon name="work" size={16} color={colors.textSecondary} />
                  <CustomText variant="body" color={colors.text}>
                    {profileData.work.position ? `${profileData.work.position} tại ` : ''}
                    {profileData.work.company}
                  </CustomText>
                </View>
              )}
              {profileData.education?.school && (
                <View style={styles.workEducationItem}>
                  <Icon name="school" size={16} color={colors.textSecondary} />
                  <CustomText variant="body" color={colors.text}>
                    {profileData.education.major ? `${profileData.education.major} - ` : ''}
                    {profileData.education.school}
                  </CustomText>
                </View>
              )}
            </View>
          )}

          {/* Action Button */}
          {currentUser?._id !== userId && (
            <>
              {isFriend ? (
                <TouchableOpacity
                  style={[styles.friendButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                  onPress={handleRemoveFriend}
                  activeOpacity={0.8}>
                  <Icon name="person-remove" size={20} color={colors.text} />
                  <CustomText variant="body" weight="semibold" color={colors.text} style={styles.friendButtonText}>
                    Hủy kết bạn
                  </CustomText>
                </TouchableOpacity>
              ) : friendRequestReceived ? (
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton, { backgroundColor: colors.primary }]}
                    onPress={handleAcceptFriendRequest}
                    activeOpacity={0.8}>
                    <Icon name="check" size={20} color="#FFFFFF" />
                    <CustomText variant="body" weight="semibold" color="#FFFFFF" style={styles.actionButtonText}>
                      Chấp nhận
                    </CustomText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={handleRejectFriendRequest}
                    activeOpacity={0.8}>
                    <Icon name="close" size={20} color={colors.text} />
                    <CustomText variant="body" weight="semibold" color={colors.text} style={styles.actionButtonText}>
                      Từ chối
                    </CustomText>
                  </TouchableOpacity>
                </View>
              ) : friendRequestSent ? (
                <TouchableOpacity
                  style={[styles.friendButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                  onPress={handleCancelFriendRequest}
                  activeOpacity={0.8}>
                  <Icon name="undo" size={20} color={colors.text} />
                  <CustomText variant="body" weight="semibold" color={colors.text} style={styles.friendButtonText}>
                    Thu hồi
                  </CustomText>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.friendButton, { backgroundColor: colors.primary }]}
                  onPress={handleSendFriendRequest}
                  activeOpacity={0.8}>
                  <Icon name="person-add" size={20} color="#FFFFFF" />
                  <CustomText variant="body" weight="semibold" color="#FFFFFF" style={styles.friendButtonText}>
                    Kết bạn
                  </CustomText>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Content Tabs */}
          <View style={styles.contentTabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'all' && styles.activeTab]}
              onPress={() => setActiveTab('all')}
              activeOpacity={0.7}>
              <CustomText
                variant="body"
                weight={activeTab === 'all' ? 'semibold' : 'normal'}
                color={activeTab === 'all' ? colors.primary : colors.textSecondary}>
                Tất cả
              </CustomText>
              {activeTab === 'all' && <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'photos' && styles.activeTab]}
              onPress={() => setActiveTab('photos')}
              activeOpacity={0.7}>
              <CustomText
                variant="body"
                weight={activeTab === 'photos' ? 'semibold' : 'normal'}
                color={activeTab === 'photos' ? colors.primary : colors.textSecondary}>
                Ảnh
              </CustomText>
              {activeTab === 'photos' && <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'reels' && styles.activeTab]}
              onPress={() => setActiveTab('reels')}
              activeOpacity={0.7}>
              <CustomText
                variant="body"
                weight={activeTab === 'reels' ? 'semibold' : 'normal'}
                color={activeTab === 'reels' ? colors.primary : colors.textSecondary}>
                Reels
              </CustomText>
              {activeTab === 'reels' && <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
          </View>

          {/* Personal Information */}
          {(profileData.currentLocation ||
            profileData.hometown ||
            profileData.dateOfBirth ||
            profileData.maritalStatus ||
            profileData.gender) && (
            <View style={styles.infoSection}>
              <CustomText variant="h3" weight="semibold" color={colors.text} style={styles.sectionTitle}>
                Thông tin cá nhân
              </CustomText>
              {profileData.currentLocation && (
                <View style={styles.infoItem}>
                  <Icon name="location-on" size={20} color={colors.textSecondary} />
                  <CustomText variant="body" color={colors.text}>
                    {profileData.currentLocation}
                  </CustomText>
                </View>
              )}
              {profileData.hometown && (
                <View style={styles.infoItem}>
                  <Icon name="home" size={20} color={colors.textSecondary} />
                  <CustomText variant="body" color={colors.text}>
                    Đến từ {profileData.hometown}
                  </CustomText>
                </View>
              )}
              {profileData.dateOfBirth && (
                <View style={styles.infoItem}>
                  <Icon name="cake" size={20} color={colors.textSecondary} />
                  <CustomText variant="body" color={colors.text}>
                    Sinh nhật {formatDateOfBirth(profileData.dateOfBirth)}
                  </CustomText>
                </View>
              )}
              {profileData.maritalStatus && (
                <View style={styles.infoItem}>
                  <Icon name="favorite" size={20} color={colors.textSecondary} />
                  <CustomText variant="body" color={colors.text}>
                    {getMaritalStatusLabel(profileData.maritalStatus)}
                  </CustomText>
                </View>
              )}
              {profileData.gender && (
                <View style={styles.infoItem}>
                  <Icon name="person" size={20} color={colors.textSecondary} />
                  <CustomText variant="body" color={colors.text}>
                    {getGenderLabel(profileData.gender)}
                  </CustomText>
                </View>
              )}
            </View>
          )}

          {/* Education Section */}
          {profileData.education?.school && (
            <View style={styles.infoSection}>
              <CustomText variant="h3" weight="semibold" color={colors.text} style={styles.sectionTitle}>
                Học vấn
              </CustomText>
              {profileData.education.school && (
                <View style={styles.infoItem}>
                  <Icon name="school" size={20} color={colors.textSecondary} />
                  <CustomText variant="body" color={colors.text}>
                    {profileData.education.school}
                  </CustomText>
                </View>
              )}
              {profileData.education.major && (
                <View style={styles.infoItem}>
                  <Icon name="menu-book" size={20} color={colors.textSecondary} />
                  <CustomText variant="body" color={colors.text}>
                    {profileData.education.major}
                  </CustomText>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  coverArea: {
    height: 200,
    width: '100%',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverGradient: {
    width: '100%',
    height: '100%',
  },
  profileSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: -60,
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  displayName: {
    marginBottom: 4,
  },
  email: {
    marginBottom: 4,
  },
  username: {
    marginBottom: 8,
  },
  bio: {
    textAlign: 'center',
    marginBottom: 16,
  },
  workEducation: {
    marginBottom: 16,
    gap: 8,
  },
  workEducationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  friendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  friendButtonText: {
    fontSize: 16,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  acceptButton: {},
  rejectButton: {
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 16,
  },
  contentTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  activeTab: {},
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  friendsSection: {
    marginBottom: 16,
    marginTop: 8,
  },
  friendsTitle: {
    marginBottom: 12,
    fontSize: 16,
  },
  friendsList: {
    paddingRight: 16,
  },
  friendItem: {
    alignItems: 'center',
    marginRight: 12,
    width: 70,
  },
  friendAvatarContainer: {
    marginBottom: 6,
  },
  friendAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendName: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default UserProfileScreen;

