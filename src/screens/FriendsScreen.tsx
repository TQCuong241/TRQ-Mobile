import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import CustomText from '../components/CustomText';
import { RootStackParamList } from '../types/navigation';
import { friendService, type Friend, type FriendRequest } from '../services';
import { API_CONFIG } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useFriendRequest } from '../contexts/FriendRequestContext';

type FriendsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TabType = 'friends' | 'groups';
type FilterType = 'all' | 'recent';

function FriendsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<FriendsScreenNavigationProp>();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { refreshFriendRequestCount, friendRequestCount } = useFriendRequest();

  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const tabs: { label: string; value: TabType }[] = [
    { label: 'Bạn bè', value: 'friends' },
    { label: 'Nhóm', value: 'groups' },
  ];

  useEffect(() => {
    loadFriends();
    loadFriendRequests();
  }, []);

  // Listen to socket events for real-time updates
  useEffect(() => {
    if (!socket) return;

    // Khi nhận lời mời mới
    const handleFriendRequestReceived = (data: { friendRequest: FriendRequest }) => {
      console.log('🔔 [FriendsScreen] Friend request received:', data.friendRequest);
      if (data.friendRequest.status === 'pending') {
        // Thêm vào danh sách nếu chưa có
        setFriendRequests((prev) => {
          const exists = prev.some((req) => req._id === data.friendRequest._id);
          if (!exists) {
            return [...prev, data.friendRequest];
          }
          return prev;
        });
        // Refresh count
        refreshFriendRequestCount();
      }
    };

    // Khi lời mời được xử lý
    const handleFriendRequestUpdated = (data: {
      friendRequest: FriendRequest;
      action: 'accepted' | 'rejected' | 'cancelled';
    }) => {
      console.log('🔔 [FriendsScreen] Friend request updated:', data);
      // Xóa khỏi danh sách
      setFriendRequests((prev) =>
        prev.filter((req) => req._id !== data.friendRequest._id)
      );
      // Refresh count và friends list
      refreshFriendRequestCount();
      if (data.action === 'accepted') {
        loadFriends(); // Reload friends list khi accept
      }
    };

    // Khi kết bạn thành công
    const handleFriendAdded = (data: { friend: Friend }) => {
      console.log('🔔 [FriendsScreen] Friend added:', data.friend);
      // Reload full friends list để đảm bảo có đủ thông tin user (tránh hiển thị Unknown)
      loadFriends();
    };

    // Khi hủy kết bạn
    const handleFriendRemoved = (data: { friendId: string }) => {
      console.log('🔔 [FriendsScreen] Friend removed:', data.friendId);
      // Xóa khỏi danh sách hiện tại
      setFriends((prev) =>
        prev.filter((f) => {
          const friendId = typeof f.friend === 'string' ? f.friend : f.friend?._id;
          return friendId !== data.friendId;
        })
      );
      // Reload lại danh sách bạn bè từ server để đảm bảo đồng bộ
      loadFriends();
    };

    socket.on('friend:request:received', handleFriendRequestReceived);
    socket.on('friend:request:updated', handleFriendRequestUpdated);
    socket.on('friend:added', handleFriendAdded);
    socket.on('friend:removed', handleFriendRemoved);

    return () => {
      socket.off('friend:request:received', handleFriendRequestReceived);
      socket.off('friend:request:updated', handleFriendRequestUpdated);
      socket.off('friend:added', handleFriendAdded);
      socket.off('friend:removed', handleFriendRemoved);
    };
  }, [socket, refreshFriendRequestCount]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const response = await friendService.getFriends();
      if (response.success && response.data) {
        const friendsList = Array.isArray(response.data) ? response.data : [];
        setFriends(friendsList);
      }
    } catch (error: any) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const response = await friendService.getFriendRequests('received');
      if (response.success && response.data) {
        const requests = Array.isArray(response.data) ? response.data : [];
        setFriendRequests(requests);
      }
    } catch (error: any) {
      console.error('Error loading friend requests:', error);
    }
  };

  const getAvatarUrl = (avatarPath?: string | null) => {
    if (!avatarPath) return null;
    if (avatarPath.startsWith('http')) {
      return avatarPath;
    }
    return `${API_CONFIG.BASE_URL.replace('/api/v1', '')}${avatarPath}`;
  };

  // Group friends by first letter
  const groupFriendsByLetter = () => {
    const filtered = friends.filter((friend) => {
      const name = friend.friend?.displayName || friend.friend?.username || '';
      if (searchQuery) {
        return name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });

    const grouped: { [key: string]: Friend[] } = {};
    filtered.forEach((friend) => {
      const name = friend.friend?.displayName || friend.friend?.username || '';
      const firstLetter = name.charAt(0).toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(friend);
    });

    return Object.keys(grouped)
      .sort()
      .map((letter) => ({ letter, friends: grouped[letter] }));
  };

  const groupedFriends = groupFriendsByLetter();
  const totalFriends = friends.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header với Gradient Blue */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground || '#FFFFFF' }]}>
          <Icon name="search" size={20} color={colors.primary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.inputText || colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Tìm kiếm"
            placeholderTextColor={colors.inputPlaceholder || colors.textSecondary + '80'}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            onPress={() => navigation.navigate('SearchFriends')}
            activeOpacity={0.7}
            style={styles.iconButton}>
            <Icon name="person-add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} style={styles.iconButton}>
            <Icon name="qr-code-scanner" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.value}
            style={styles.tab}
            onPress={() => setActiveTab(tab.value)}
            activeOpacity={0.7}>
            <CustomText
              variant="body"
              weight={activeTab === tab.value ? 'semibold' : 'normal'}
              color={activeTab === tab.value ? colors.primary : colors.textSecondary}>
              {tab.label}
            </CustomText>
            {activeTab === tab.value && (
              <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'friends' && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Special Categories */}
          {friendRequestCount > 0 && (
            <TouchableOpacity
              style={[styles.specialItem, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('FriendRequests')}
              activeOpacity={0.7}>
              <View style={[styles.specialIcon, { backgroundColor: colors.primary + '20' }]}>
                <Icon name="people" size={24} color={colors.primary} />
              </View>
              <CustomText variant="body" weight="semibold" color={colors.text}>
                Lời mời kết bạn ({friendRequestCount})
              </CustomText>
              <Icon name="chevron-right" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Filter Buttons */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                {
                  backgroundColor: filterType === 'all' ? colors.surface : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setFilterType('all')}
              activeOpacity={0.7}>
              <CustomText variant="body" color={colors.text}>
                Tất cả {totalFriends}
              </CustomText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                {
                  backgroundColor: filterType === 'recent' ? colors.surface : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setFilterType('recent')}
              activeOpacity={0.7}>
              <CustomText variant="body" color={colors.text}>
                Mới truy cập
              </CustomText>
            </TouchableOpacity>
          </View>

          {/* Close Friends Section */}
          {friends.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Icon name="star" size={20} color="#FFA500" />
                <CustomText variant="body" weight="semibold" color={colors.text} style={styles.sectionTitle}>
                  Bạn thân
                </CustomText>
              </View>
              {/* Close friends list - có thể filter từ friends */}
            </>
          )}

          {/* Alphabetical Sections */}
          {groupedFriends.length > 0 ? (
            groupedFriends.map(({ letter, friends: letterFriends }) => (
              <View key={letter} style={styles.letterSection}>
                <CustomText variant="h2" weight="bold" color={colors.textSecondary} style={styles.letterHeader}>
                  {letter}
                </CustomText>
                {letterFriends.map((friend) => {
                  const friendInfo = friend.friend;
                  const avatarUrl = getAvatarUrl(friendInfo?.avatar);
                  return (
                    <TouchableOpacity
                      key={friend._id}
                      style={[styles.contactItem, { backgroundColor: colors.background }]}
                      activeOpacity={0.7}>
                      <View style={styles.contactInfo}>
                        {avatarUrl ? (
                          <Image source={{ uri: avatarUrl }} style={styles.avatar} resizeMode="cover" />
                        ) : (
                          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
                            <Icon name="account-circle" size={50} color={colors.textSecondary} />
                          </View>
                        )}
                        <CustomText variant="body" color={colors.text} style={styles.contactName}>
                          {friendInfo?.displayName || friendInfo?.username || 'Unknown'}
                        </CustomText>
                      </View>
                      <View style={styles.contactActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: colors.surface }]}
                          activeOpacity={0.7}>
                          <Icon name="phone" size={20} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: colors.surface }]}
                          activeOpacity={0.7}>
                          <Icon name="videocam" size={20} color={colors.text} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Icon name="people-outline" size={48} color={colors.textSecondary} />
              <CustomText variant="body" color={colors.textSecondary} style={styles.emptyText}>
                {searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có bạn bè nào'}
              </CustomText>
            </View>
          )}
        </ScrollView>
      )}

      {/* Groups Tab Content */}
      {activeTab === 'groups' && (
        <View style={styles.emptyState}>
          <Icon name="group" size={48} color={colors.textSecondary} />
          <CustomText variant="body" color={colors.textSecondary} style={styles.emptyText}>
            Chưa có nhóm nào
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    // backgroundColor được set trong inline style để support dark mode
  },
  searchIcon: {
    marginLeft: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  specialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    gap: 12,
  },
  specialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
  },
  letterSection: {
    marginTop: 8,
  },
  letterHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 24,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactName: {
    flex: 1,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
});

export default FriendsScreen;
