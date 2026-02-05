import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
  Platform,
  Text,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useFriendRequest } from '../contexts/FriendRequestContext';
import { useSocket } from '../contexts/SocketContext';
import CustomText from '../components/CustomText';
import type { FriendRequest, Friend } from '../services';
import { friendService, type UserInfo } from '../services';
import { useAlert } from '../hooks/useAlert';
import { RootStackParamList } from '../types/navigation';
import { API_CONFIG } from '../config/api';

type SearchFriendsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TabType = 'all' | 'displayName' | 'email' | 'username';

// Helper component to highlight matching text
const HighlightText = ({ text, query, highlightColor, normalColor }: { text: string; query: string; highlightColor: string; normalColor: string }) => {
  if (!query || !text) {
    return <CustomText variant="body" color={normalColor}>{text}</CustomText>;
  }
  
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <CustomText variant="body" color={normalColor}>
      {parts.map((part, index) => {
        if (part.toLowerCase() === query.toLowerCase()) {
          return (
            <Text key={index} style={{ color: highlightColor, fontWeight: '600' }}>
              {part}
            </Text>
          );
        }
        return part;
      })}
    </CustomText>
  );
};

function SearchFriendsScreen() {
  const navigation = useNavigation<SearchFriendsScreenNavigationProp>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { refreshFriendRequestCount } = useFriendRequest();
  const { socket } = useSocket();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchResults, setSearchResults] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [friendRequestsMap, setFriendRequestsMap] = useState<{ [userId: string]: { id: string; type: 'sent' | 'received' } }>({});
  const [friendsMap, setFriendsMap] = useState<{ [userId: string]: boolean }>({});
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tabs: { label: string; value: TabType }[] = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Họ và tên', value: 'displayName' },
    { label: 'Email', value: 'email' },
    { label: 'Username', value: 'username' },
  ];

  // Load friend requests + friends list để check status
  useEffect(() => {
    loadFriendRequestsStatus();
    loadFriendsStatus();
  }, []);

  const loadFriendsStatus = async () => {
    try {
      const response = await friendService.getFriends();
      if (response.success && response.data) {
        const friendsList = Array.isArray(response.data) ? response.data : [];
        const map: { [userId: string]: boolean } = {};
        friendsList.forEach((f) => {
          const friendId =
            typeof f.friend === 'string' ? (f.friend as string) : f.friend?._id;
          if (friendId) {
            map[friendId] = true;
          }
        });
        setFriendsMap(map);
      }
    } catch (error: any) {
      console.error('Error loading friends status:', error);
    }
  };

  // Auto search với debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 1) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch();
      }, 500); // Debounce 500ms
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, activeTab]);

  const loadFriendRequestsStatus = async () => {
    if (!user?._id) return;

    try {
      // Load sent friend requests
      const sentRequestsResponse = await friendService.getFriendRequests('sent');
      if (sentRequestsResponse.success && sentRequestsResponse.data) {
        const sentRequests = Array.isArray(sentRequestsResponse.data) ? sentRequestsResponse.data : [];
        const sentMap: { [userId: string]: { id: string; type: 'sent' | 'received' } } = {};
        sentRequests.forEach((r) => {
          const receiverId = typeof r.receiverId === 'string' ? r.receiverId : r.receiverId?._id;
          if (receiverId) {
            sentMap[receiverId] = { id: r._id, type: 'sent' };
          }
        });

        // Load received friend requests
        const receivedRequestsResponse = await friendService.getFriendRequests('received');
        if (receivedRequestsResponse.success && receivedRequestsResponse.data) {
          const receivedRequests = Array.isArray(receivedRequestsResponse.data) ? receivedRequestsResponse.data : [];
          const receivedMap: { [userId: string]: { id: string; type: 'sent' | 'received' } } = {};
          receivedRequests.forEach((r) => {
            const senderId = typeof r.senderId === 'string' ? r.senderId : r.senderId?._id;
            if (senderId) {
              receivedMap[senderId] = { id: r._id, type: 'received' };
            }
          });

          // Merge both maps (received takes priority)
          setFriendRequestsMap({ ...sentMap, ...receivedMap });
        } else {
          setFriendRequestsMap(sentMap);
        }
      } else {
        // Try to load received requests even if sent failed
        const receivedRequestsResponse = await friendService.getFriendRequests('received');
        if (receivedRequestsResponse.success && receivedRequestsResponse.data) {
          const receivedRequests = Array.isArray(receivedRequestsResponse.data) ? receivedRequestsResponse.data : [];
          const receivedMap: { [userId: string]: { id: string; type: 'sent' | 'received' } } = {};
          receivedRequests.forEach((r) => {
            const senderId = typeof r.senderId === 'string' ? r.senderId : r.senderId?._id;
            if (senderId) {
              receivedMap[senderId] = { id: r._id, type: 'received' };
            }
          });
          setFriendRequestsMap(receivedMap);
        }
      }
    } catch (error: any) {
      console.error('Error loading friend requests status:', error);
    }
  };

  const handleAcceptFriendRequest = async (requestId: string, userId: string) => {
    try {
      const response = await friendService.acceptFriendRequest(requestId);
      if (response.success) {
        showAlert('Thành công', 'Đã chấp nhận lời mời kết bạn', [{ text: 'OK' }], 'success');
        // Remove from request map, đánh dấu là bạn bè và refresh search
        setFriendRequestsMap((prev) => {
          const newMap = { ...prev };
          delete newMap[userId];
          return newMap;
        });
        setFriendsMap((prev) => ({
          ...prev,
          [userId]: true,
        }));
        handleSearch();
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

  const handleRejectFriendRequest = async (requestId: string, userId: string) => {
    try {
      const response = await friendService.rejectFriendRequest(requestId);
      if (response.success) {
        showAlert('Thành công', 'Đã từ chối lời mời kết bạn', [{ text: 'OK' }], 'success');
        // Remove from map and refresh search
        setFriendRequestsMap((prev) => {
          const newMap = { ...prev };
          delete newMap[userId];
          return newMap;
        });
        handleSearch();
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

  const handleCancelFriendRequest = async (requestId: string, userId: string) => {
    try {
      const response = await friendService.cancelFriendRequest(requestId);
      if (response.success) {
        showAlert('Thành công', 'Đã thu hồi lời mời kết bạn', [{ text: 'OK' }], 'success');
        // Remove from map and refresh search
        setFriendRequestsMap((prev) => {
          const newMap = { ...prev };
          delete newMap[userId];
          return newMap;
        });
        handleSearch();
      } else {
        showAlert('Lỗi', response.message || 'Không thể thu hồi lời mời', [{ text: 'OK' }], 'error');
      }
    } catch (error: any) {
      console.error('Error canceling friend request:', error);
      showAlert('Lỗi', error.message || 'Có lỗi xảy ra', [{ text: 'OK' }], 'error');
    }
  };

  // Listen to socket events for real-time updates
  useEffect(() => {
    if (!socket) return;

    // Khi lời mời được xử lý (accept/reject/cancel) - update friendRequestsMap
    const handleFriendRequestUpdated = (data: {
      friendRequest: FriendRequest;
      action: 'accepted' | 'rejected' | 'cancelled';
    }) => {
      console.log('🔔 [SearchFriendsScreen] Friend request updated:', data);
      const { friendRequest } = data;
      
      // Xác định userId cần update
      const senderId = typeof friendRequest.senderId === 'string' 
        ? friendRequest.senderId 
        : friendRequest.senderId?._id;
      const receiverId = typeof friendRequest.receiverId === 'string' 
        ? friendRequest.receiverId 
        : friendRequest.receiverId?._id;

      // Update friendRequestsMap - xóa khỏi map nếu đã được xử lý
      setFriendRequestsMap((prev) => {
        const newMap = { ...prev };
        delete newMap[senderId || ''];
        delete newMap[receiverId || ''];
        return newMap;
      });

      // Refresh search results để update UI
      if (searchQuery.trim().length >= 1) {
        handleSearch();
      }
    };

    // Khi kết bạn thành công - update friendsMap + search
    const handleFriendAdded = (data: { friend: Friend }) => {
      console.log('🔔 [SearchFriendsScreen] Friend added:', data.friend);
      const friendId =
        typeof data.friend.friend === 'string'
          ? (data.friend.friend as string)
          : data.friend.friend?._id;
      if (friendId) {
        setFriendsMap((prev) => ({
          ...prev,
          [friendId]: true,
        }));
      }
      // Refresh search để update UI
      if (searchQuery.trim().length >= 1) {
        handleSearch();
      }
    };

    const handleFriendRemoved = (data: { friendId: string }) => {
      console.log('🔔 [SearchFriendsScreen] Friend removed:', data.friendId);
      setFriendsMap((prev) => {
        const newMap = { ...prev };
        delete newMap[data.friendId];
        return newMap;
      });
      if (searchQuery.trim().length >= 1) {
        handleSearch();
      }
    };

    socket.on('friend:request:updated', handleFriendRequestUpdated);
    socket.on('friend:added', handleFriendAdded);
    socket.on('friend:removed', handleFriendRemoved);

    return () => {
      socket.off('friend:request:updated', handleFriendRequestUpdated);
      socket.off('friend:added', handleFriendAdded);
      socket.off('friend:removed', handleFriendRemoved);
    };
  }, [socket, searchQuery]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    console.log('🔍 [Search] Bắt đầu tìm kiếm:', {
      query: searchQuery.trim(),
      activeTab,
      userId: user?._id,
    });

    try {
      setLoading(true);
      
      const searchParams = {
        query: searchQuery.trim(),
      };
      console.log('📤 [Search] Gọi API với params:', searchParams);
      
      const response = await friendService.searchUsers(searchParams);
      
      console.log('📥 [Search] Response từ API:', {
        success: response.success,
        message: response.message,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        dataLength: Array.isArray(response.data) ? response.data.length : 'N/A',
        data: response.data,
      });

      if (response.success) {
        let results: UserInfo[] = [];
        if (response.data) {
          if (Array.isArray(response.data)) {
            results = response.data;
            console.log('✅ [Search] Response.data là array, số lượng:', results.length);
          } else if (typeof response.data === 'object') {
            results = (response.data as any).users || (response.data as any).data || [];
            console.log('⚠️ [Search] Response.data là object, đã extract:', {
              hasUsers: !!(response.data as any).users,
              hasData: !!(response.data as any).data,
              extractedLength: results.length,
            });
          }
        } else {
          console.log('⚠️ [Search] Response.data là undefined hoặc null');
        }
        
        // Lọc bỏ chính mình
        let filteredResults = results.filter((u) => u && u._id && u._id !== user?._id);
        
        // Filter theo tab type nếu không phải "all"
        if (activeTab !== 'all') {
          const queryLower = searchQuery.trim().toLowerCase();
          filteredResults = filteredResults.filter((u) => {
            if (activeTab === 'displayName') {
              return u.displayName?.toLowerCase().includes(queryLower);
            } else if (activeTab === 'email') {
              return u.email?.toLowerCase().includes(queryLower);
            } else if (activeTab === 'username') {
              return u.username?.toLowerCase().includes(queryLower);
            }
            return true;
          });
        }
        
        console.log('🔍 [Search] Sau khi lọc:', {
          beforeFilter: results.length,
          afterFilter: filteredResults.length,
          activeTab,
        });
        
        setSearchResults(filteredResults);
        
        if (filteredResults.length === 0 && results.length === 0) {
          console.log('ℹ️ [Search] Không tìm thấy kết quả');
        } else {
          console.log('✅ [Search] Tìm thấy', filteredResults.length, 'kết quả');
        }
      } else {
        console.log('❌ [Search] API trả về success=false:', response.message);
        setSearchResults([]);
      }
    } catch (error: any) {
      console.error('❌ [Search] Error searching users:', {
        error,
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      setSearchResults([]);
    } finally {
      setLoading(false);
      console.log('🏁 [Search] Kết thúc tìm kiếm');
    }
  };

  const getAvatarUrl = (avatarPath?: string | null) => {
    if (!avatarPath) return null;
    if (avatarPath.startsWith('http')) {
      return avatarPath;
    }
    return `${API_CONFIG.BASE_URL.replace('/api/v1', '')}${avatarPath}`;
  };

  const handleSendFriendRequest = async (userId: string) => {
    try {
      const response = await friendService.sendFriendRequest(userId);
      if (response.success) {
        showAlert('Thành công', 'Đã gửi lời mời kết bạn', [{ text: 'OK' }], 'success');
        // Update friend requests map
        if (response.data && typeof response.data === 'object' && '_id' in response.data) {
          setFriendRequestsMap((prev) => ({
            ...prev,
            [userId]: { id: (response.data as any)._id, type: 'sent' },
          }));
        }
        handleSearch();
      } else {
        showAlert('Lỗi', response.message || 'Không thể gửi lời mời', [{ text: 'OK' }], 'error');
      }
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      showAlert('Lỗi', error.message || 'Có lỗi xảy ra', [{ text: 'OK' }], 'error');
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Bar với Search */}
      <View style={[styles.headerBar, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.searchBarContainer}>
          <Icon name="search" size={20} color={colors.primary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Tìm kiếm..."
            placeholderTextColor={colors.textSecondary + '80'}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} activeOpacity={0.7} style={styles.clearButton}>
              <Icon name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity activeOpacity={0.7} style={styles.qrButton}>
          <Icon name="qr-code-scanner" size={24} color="#FFFFFF" />
        </TouchableOpacity>
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {loading && searchQuery.length > 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : searchResults.length > 0 ? (
          <>
            <View style={styles.resultsHeader}>
              <CustomText variant="body" weight="semibold" color={colors.text}>
                Liên hệ ({searchResults.length})
              </CustomText>
            </View>
            <View style={styles.resultsList}>
              {searchResults.map((userInfo) => (
                <TouchableOpacity
                  key={userInfo._id}
                  style={[styles.contactItem, { backgroundColor: colors.background }]}
                  onPress={() => navigation.navigate('UserProfile', { userId: userInfo._id })}
                  activeOpacity={0.7}>
                  <View style={styles.contactInfo}>
                    {getAvatarUrl(userInfo.avatar) ? (
                      <Image
                        source={{ uri: getAvatarUrl(userInfo.avatar) || undefined }}
                        style={styles.avatar}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
                        <Icon name="account-circle" size={50} color={colors.textSecondary} />
                      </View>
                    )}
                    <View style={styles.contactName}>
                      <HighlightText
                        text={userInfo.displayName}
                        query={searchQuery}
                        highlightColor={colors.primary}
                        normalColor={colors.text}
                      />
                    </View>
                  </View>
                  {(() => {
                    const isFriend = friendsMap[userInfo._id];
                    const requestInfo = friendRequestsMap[userInfo._id];
                    const hasReceivedRequest = requestInfo?.type === 'received';
                    const hasSentRequest = requestInfo?.type === 'sent';

                    if (isFriend) {
                      // Đã là bạn bè
                      return (
                        <View
                          style={[
                            styles.friendButton,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                              borderWidth: 1,
                            },
                          ]}>
                          <Icon name="check" size={18} color={colors.text} />
                          <CustomText
                            variant="body"
                            weight="semibold"
                            color={colors.text}
                            style={styles.friendButtonText}>
                            Bạn bè
                          </CustomText>
                        </View>
                      );
                    } else if (hasReceivedRequest) {
                      // Hiển thị 2 nút nếu nhận được lời mời
                      return (
                        <View style={styles.actionButtonsContainer}>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.acceptButton, { backgroundColor: colors.primary }]}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleAcceptFriendRequest(requestInfo.id, userInfo._id);
                            }}
                            activeOpacity={0.8}>
                            <Icon name="check" size={16} color="#FFFFFF" />
                            <CustomText variant="body" weight="semibold" color="#FFFFFF" style={styles.actionButtonText}>
                              Chấp nhận
                            </CustomText>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.rejectButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleRejectFriendRequest(requestInfo.id, userInfo._id);
                            }}
                            activeOpacity={0.8}>
                            <Icon name="close" size={16} color={colors.text} />
                            <CustomText variant="body" weight="semibold" color={colors.text} style={styles.actionButtonText}>
                              Hủy
                            </CustomText>
                          </TouchableOpacity>
                        </View>
                      );
                    } else if (hasSentRequest) {
                      // Hiển thị nút "Thu hồi" nếu đã gửi request
                      return (
                        <TouchableOpacity
                          style={[styles.friendButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleCancelFriendRequest(requestInfo.id, userInfo._id);
                          }}
                          activeOpacity={0.8}>
                          <Icon name="undo" size={18} color={colors.text} />
                          <CustomText variant="body" weight="semibold" color={colors.text} style={styles.friendButtonText}>
                            Thu hồi
                          </CustomText>
                        </TouchableOpacity>
                      );
                    } else {
                      // Hiển thị nút "Kết bạn" nếu chưa có request
                      return (
                        <TouchableOpacity
                          style={[styles.friendButton, { backgroundColor: colors.primary }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleSendFriendRequest(userInfo._id);
                          }}
                          activeOpacity={0.8}>
                          <Icon name="person-add" size={18} color="#FFFFFF" />
                          <CustomText variant="body" weight="semibold" color="#FFFFFF" style={styles.friendButtonText}>
                            Kết bạn
                          </CustomText>
                        </TouchableOpacity>
                      );
                    }
                  })()}
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : searchQuery.length > 0 ? (
          <View style={styles.emptyState}>
            <Icon name="search-off" size={48} color={colors.textSecondary} />
            <CustomText variant="body" color={colors.textSecondary} style={styles.emptyText}>
              Không tìm thấy kết quả
            </CustomText>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchIcon: {
    marginLeft: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  clearButton: {
    padding: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrButton: {
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  resultsList: {
    paddingHorizontal: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
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
  friendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  friendButtonText: {
    fontSize: 14,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  acceptButton: {},
  rejectButton: {
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    gap: 16,
  },
  emptyText: {
    textAlign: 'center',
  },
});

export default SearchFriendsScreen;
