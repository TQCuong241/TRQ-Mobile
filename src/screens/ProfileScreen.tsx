import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
// import { LinearGradient } from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import CustomText from '../components/CustomText';
import { userService, type UserProfile, friendService, type Friend } from '../services';
import { useAlert } from '../hooks/useAlert';
import { RootStackParamList } from '../types/navigation';
import { API_CONFIG } from '../config/api';
import { pickImage } from '../utils/imagePicker';
import ImagePickerModal from '../components/ImagePickerModal';

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const theme = useTheme();
  const { colors } = theme;
  const { user, logout, updateUser } = useAuth();
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'photos' | 'reels'>('all');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [profileData, setProfileData] = useState<UserProfile | null>(
    user
      ? {
          _id: user._id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }
      : null
  );

  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useFocusEffect(
    React.useCallback(() => {
      scale.value = withSpring(1, { damping: 10 });
      opacity.value = withSpring(1, { damping: 10 });
      loadProfile();
      loadFriends();
      return () => {
        scale.value = 0.8;
        opacity.value = 0;
      };
    }, []),
  );

  const loadProfile = async () => {
    try {
      setProfileLoading(true);
      const response = await userService.getCurrentUser();
      if (response.success && response.data) {
        setProfileData(response.data);
        updateUser({
          _id: response.data._id,
          username: response.data.username,
          email: response.data.email,
          displayName: response.data.displayName,
          isVerified: response.data.isVerified,
          createdAt: response.data.createdAt,
          updatedAt: response.data.updatedAt,
        });
      } else {
        // Nếu không lấy được từ API, dùng user từ context
        if (user) {
          setProfileData({
            _id: user._id,
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          });
        }
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      // Nếu có lỗi, dùng user từ context
      if (user) {
        setProfileData({
          _id: user._id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        });
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const loadFriends = async () => {
    try {
      const response = await friendService.getFriends();
      if (response.success && response.data) {
        const friendsList = Array.isArray(response.data) ? response.data : [];
        setFriends(friendsList.slice(0, 5)); // Chỉ lấy 5 người đầu tiên
      }
    } catch (error) {
      console.error('Error loading friends:', error);
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

  const handleAvatarPress = () => {
    setShowAvatarPicker(true);
  };

  const handleAvatarSelectFromLibrary = async () => {
    const result = await pickImage('library');
    if (result) {
      await handleUploadAvatar(result.uri, result.name, result.type);
    }
  };

  const handleAvatarTakePhoto = async () => {
    const result = await pickImage('camera');
    if (result) {
      await handleUploadAvatar(result.uri, result.name, result.type);
    }
  };

  const handleUploadAvatar = async (uri: string, filename: string, type: string) => {
    try {
      setUploadingAvatar(true);
      const response = await userService.uploadAvatar(uri, filename, type);
      if (response.success && response.data) {
        setProfileData(response.data);
        updateUser({
          _id: response.data._id,
          username: response.data.username,
          email: response.data.email,
          displayName: response.data.displayName,
          isVerified: response.data.isVerified,
          createdAt: response.data.createdAt,
          updatedAt: response.data.updatedAt,
        });
        showAlert('Thành công', 'Cập nhật avatar thành công', [{ text: 'OK' }], 'success');
      } else {
        showAlert('Lỗi', response.message || 'Không thể upload avatar', [{ text: 'OK' }], 'error');
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      showAlert('Lỗi', error.message || 'Có lỗi xảy ra khi upload avatar', [{ text: 'OK' }], 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async () => {
    showAlert(
      'Xóa avatar',
      'Bạn có chắc chắn muốn xóa avatar?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          onPress: async () => {
            try {
              setUploadingAvatar(true);
              const response = await userService.deleteAvatar();
              if (response.success && response.data) {
                // response.data từ deleteAvatar là UserProfile
                const updatedProfile = response.data as UserProfile;
                setProfileData(updatedProfile);
                // Cập nhật user vào context
                updateUser({
                  _id: updatedProfile._id,
                  username: updatedProfile.username,
                  email: updatedProfile.email,
                  displayName: updatedProfile.displayName,
                  isVerified: updatedProfile.isVerified,
                  createdAt: updatedProfile.createdAt,
                  updatedAt: updatedProfile.updatedAt,
                });
                showAlert('Thành công', 'Xóa avatar thành công', [{ text: 'OK' }], 'success');
              } else {
                showAlert('Lỗi', response.message || 'Không thể xóa avatar', [{ text: 'OK' }], 'error');
              }
            } catch (error: any) {
              console.error('Error deleting avatar:', error);
              showAlert('Lỗi', error.message || 'Có lỗi xảy ra', [{ text: 'OK' }], 'error');
            } finally {
              setUploadingAvatar(false);
            }
          },
          style: 'destructive',
        },
      ],
      'warning',
    );
  };

  const handleCoverPress = () => {
    setShowCoverPicker(true);
  };

  const handleCoverSelectFromLibrary = async () => {
    const result = await pickImage('library');
    if (result) {
      await handleUploadCover(result.uri, result.name, result.type);
    }
  };

  const handleCoverTakePhoto = async () => {
    const result = await pickImage('camera');
    if (result) {
      await handleUploadCover(result.uri, result.name, result.type);
    }
  };

  const handleUploadCover = async (uri: string, filename: string, type: string) => {
    try {
      setUploadingCover(true);
      const response = await userService.uploadCover(uri, filename, type);
      if (response.success && response.data) {
        setProfileData(response.data);
        updateUser({
          _id: response.data._id,
          username: response.data.username,
          email: response.data.email,
          displayName: response.data.displayName,
          isVerified: response.data.isVerified,
          createdAt: response.data.createdAt,
          updatedAt: response.data.updatedAt,
        });
        showAlert('Thành công', 'Cập nhật ảnh bìa thành công', [{ text: 'OK' }], 'success');
      } else {
        showAlert('Lỗi', response.message || 'Không thể upload ảnh bìa', [{ text: 'OK' }], 'error');
      }
    } catch (error: any) {
      console.error('Error uploading cover:', error);
      showAlert('Lỗi', error.message || 'Có lỗi xảy ra khi upload ảnh bìa', [{ text: 'OK' }], 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleDeleteCover = async () => {
    showAlert(
      'Xóa ảnh bìa',
      'Bạn có chắc chắn muốn xóa ảnh bìa?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          onPress: async () => {
            try {
              setUploadingCover(true);
              const response = await userService.deleteCover();
              if (response.success && response.data) {
                const updatedProfile = response.data as UserProfile;
                setProfileData(updatedProfile);
                updateUser({
                  _id: updatedProfile._id,
                  username: updatedProfile.username,
                  email: updatedProfile.email,
                  displayName: updatedProfile.displayName,
                  isVerified: updatedProfile.isVerified,
                  createdAt: updatedProfile.createdAt,
                  updatedAt: updatedProfile.updatedAt,
                });
                showAlert('Thành công', 'Xóa ảnh bìa thành công', [{ text: 'OK' }], 'success');
              } else {
                showAlert('Lỗi', response.message || 'Không thể xóa ảnh bìa', [{ text: 'OK' }], 'error');
              }
            } catch (error: any) {
              console.error('Error deleting cover:', error);
              showAlert('Lỗi', error.message || 'Có lỗi xảy ra', [{ text: 'OK' }], 'error');
            } finally {
              setUploadingCover(false);
            }
          },
          style: 'destructive',
        },
      ],
      'warning',
    );
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  if (profileLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <CustomText variant="body" color={colors.textSecondary} style={styles.loadingText}>
            Đang tải thông tin...
          </CustomText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Cover Area with Gradient */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleCoverPress}
          disabled={uploadingCover}
          style={[styles.coverArea, { backgroundColor: colors.surface }]}>
          {profileData?.coverPhoto && getCoverUrl(profileData.coverPhoto) ? (
            <Image
              source={{ uri: getCoverUrl(profileData.coverPhoto) || undefined }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.coverGradient, { backgroundColor: colors.surface }]}>
              <View style={styles.coverContent}>
                <View style={[styles.statusBubble, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
                </View>
              </View>
            </View>
          )}
          {uploadingCover && (
            <View style={[styles.coverOverlay, { backgroundColor: colors.background + 'CC' }]}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
          <View style={[styles.coverEditButton, { backgroundColor: colors.primary }]}>
            <Icon name="camera-alt" size={18} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            <TouchableOpacity
              onPress={handleAvatarPress}
              disabled={uploadingAvatar}
              activeOpacity={0.8}
              style={styles.avatarTouchable}>
              <Animated.View style={[styles.avatarContainer, animatedStyle]}>
                {profileData?.avatar && getAvatarUrl(profileData.avatar) ? (
                  <Image
                    source={{ uri: getAvatarUrl(profileData.avatar) || undefined }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
                    <Icon name="account-circle" size={120} color={colors.textSecondary} />
                  </View>
                )}
                {uploadingAvatar && (
                  <View style={[styles.avatarOverlay, { backgroundColor: colors.background + 'CC' }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                )}
              </Animated.View>
              <View style={[styles.editAvatarButton, { backgroundColor: colors.primary }]}>
                <Icon name="camera-alt" size={18} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Name and Stats */}
          <View style={styles.nameSection}>
            <View style={styles.nameRow}>
              <CustomText variant="h1" weight="bold" color={colors.text} style={styles.name}>
                {profileData?.displayName || 'User Name'}
              </CustomText>

            </View>
            <CustomText variant="body" color={colors.textSecondary} style={styles.stats}>
              275 người bạn
            </CustomText>
            {profileData?.bio && (
              <View style={styles.emojiRow}>
                <CustomText variant="body" color={colors.text} style={styles.bioText}>
                  {profileData.bio}
                </CustomText>
              </View>
            )}
          </View>

          {/* Education/Work */}
          {(profileData?.work?.company || profileData?.work?.position || profileData?.education?.school || profileData?.education?.major) && (
            <View style={styles.infoSection}>
              {profileData?.work?.company && (
                <View style={styles.infoRow}>
                  <Icon name="business" size={20} color={colors.textSecondary} />
                  <CustomText variant="body" color={colors.textSecondary} style={styles.infoText}>
                    {profileData.work.company}
                    {profileData.work.position && ` - ${profileData.work.position}`}
                  </CustomText>
                </View>
              )}
              {profileData?.education?.school && (
                <View style={styles.infoRow}>
                  <Icon name="school" size={20} color={colors.textSecondary} />
                  <CustomText variant="body" color={colors.textSecondary} style={styles.infoText}>
                    {profileData.education.school}
                    {profileData.education.major && ` - ${profileData.education.major}`}
                  </CustomText>
                </View>
              )}
            </View>
          )}

          {/* Friends List */}
          {friends.length > 0 && (
            <View style={styles.friendsSection}>
              <CustomText variant="body" weight="semibold" color={colors.text} style={styles.friendsTitle}>
                Bạn bè
              </CustomText>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.friendsList}>
                {friends.map((friendItem) => {
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

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.editButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={handleEditProfile}
              activeOpacity={0.8}>
              <Icon name="edit" size={20} color={colors.text} />
              <CustomText variant="body" weight="semibold" color={colors.text}>
                Chỉnh sửa trang cá nhân
              </CustomText>
            </TouchableOpacity>
          </View>

          {/* Content Tabs */}
          <View style={styles.tabsContainer}>
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

          {/* Personal Information Section */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <CustomText variant="h3" weight="bold" color={colors.text}>
                Thông tin cá nhân
              </CustomText>
              <TouchableOpacity activeOpacity={0.7}>
                <Icon name="edit" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.infoList}>
              {profileData?.currentLocation && (
                <View style={styles.infoItem}>
                  <Icon name="location-on" size={20} color={colors.textSecondary} />
                  <CustomText variant="body" color={colors.text} style={styles.infoItemText}>
                    {profileData.currentLocation}
                  </CustomText>
                </View>
              )}
              {profileData?.hometown && (
                <View style={styles.infoItem}>
                  <Icon name="home" size={20} color={colors.textSecondary} />
                  <CustomText variant="body" color={colors.text} style={styles.infoItemText}>
                    {profileData.hometown}
                  </CustomText>
                </View>
              )}
              {profileData?.dateOfBirth && (
                <View style={styles.infoItem}>
                  <Icon name="cake" size={20} color={colors.textSecondary} />
                  <CustomText variant="body" color={colors.text} style={styles.infoItemText}>
                    {formatDateOfBirth(profileData.dateOfBirth)}
                  </CustomText>
                </View>
              )}
              {profileData?.maritalStatus && (
                <View style={styles.infoItem}>
                  <Icon name="favorite" size={20} color={colors.textSecondary} />
                  <CustomText variant="body" color={colors.text} style={styles.infoItemText}>
                    {getMaritalStatusLabel(profileData.maritalStatus)}
                  </CustomText>
                </View>
              )}
              {profileData?.gender && (
                <View style={styles.infoItem}>
                  <Icon name="wc" size={20} color={colors.textSecondary} />
                  <CustomText variant="body" color={colors.text} style={styles.infoItemText}>
                    {getGenderLabel(profileData.gender)}
                  </CustomText>
                </View>
              )}
            </View>
          </View>

          {/* Education Section */}
          <View style={[styles.section, { backgroundColor: colors.surface, marginTop: 12 }]}>
            <View style={styles.sectionHeader}>
              <CustomText variant="h3" weight="bold" color={colors.text}>
                Học vấn
              </CustomText>
              <TouchableOpacity activeOpacity={0.7}>
                <Icon name="edit" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.infoList}>
              {profileData?.education?.school && (
                <View style={styles.infoItem}>
                  <Icon name="school" size={20} color={colors.textSecondary} />
                  <CustomText variant="body" color={colors.text} style={styles.infoItemText}>
                    {profileData.education.school}
                    {profileData.education.major && ` - ${profileData.education.major}`}
                  </CustomText>
                </View>
              )}
              {profileData?.work?.company && (
                <View style={styles.infoItem}>
                  <Icon name="work" size={20} color={colors.textSecondary} />
                  <CustomText variant="body" color={colors.text} style={styles.infoItemText}>
                    {profileData.work.company}
                    {profileData.work.position && ` - ${profileData.work.position}`}
                  </CustomText>
                </View>
              )}
            </View>
          </View>

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* Image Picker Modals */}
      <ImagePickerModal
        visible={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
        onSelectFromLibrary={handleAvatarSelectFromLibrary}
        onTakePhoto={handleAvatarTakePhoto}
        onDelete={handleDeleteAvatar}
        showDelete={!!profileData?.avatar}
        title="Chọn avatar"
      />

      <ImagePickerModal
        visible={showCoverPicker}
        onClose={() => setShowCoverPicker(false)}
        onSelectFromLibrary={handleCoverSelectFromLibrary}
        onTakePhoto={handleCoverTakePhoto}
        onDelete={handleDeleteCover}
        showDelete={!!profileData?.coverPhoto}
        title="Chọn ảnh bìa"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  topBarIcon: {
    marginRight: -8,
  },
  coverArea: {
    height: 200,
    width: '100%',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverEditButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  coverContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
  },
  cameraIconButton: {
    padding: 4,
  },
  profileSection: {
    paddingHorizontal: 16,
    marginTop: -60,
  },
  avatarWrapper: {
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000000',
  },
  nameSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 28,
  },
  nameRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stats: {
    marginTop: 4,
    fontSize: 14,
  },
  emojiRow: {
    marginTop: 8,
  },
  bioText: {
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  infoSection: {
    marginBottom: 16,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
  },
  friendsSection: {
    marginBottom: 16,
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
  actionButtons: {
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  editButton: {
    borderWidth: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  activeTab: {
    // Active tab styling
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
  },
  section: {
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoItemText: {
    flex: 1,
    fontSize: 14,
  },
});

export default ProfileScreen;
