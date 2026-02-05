import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import CustomText from '../components/CustomText';
import { conversationService, ConversationWithMember, friendService, type Friend } from '../services';
import { API_CONFIG } from '../config/api';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'HomeMain'
>;

function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { colors } = useTheme();
  const { isAuthenticated } = useAuth();
  const { socket } = useSocket();
  const [conversations, setConversations] = useState<ConversationWithMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  const refreshFriends = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await friendService.getFriends();
      if (response.success && response.data) {
        setFriends(response.data);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  }, [isAuthenticated]);

  const loadConversations = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const response = await conversationService.getConversations(pageNum, 20);
      if (response.success && response.data) {
        const conversationsList = response.data.conversations;

        if (append) {
          setConversations((prev) => [...prev, ...conversationsList]);
        } else {
          setConversations(conversationsList);
        }
        setHasMore(pageNum < response.data.totalPages);
      }
    } catch (error: any) {
      const errorMessage = error?.message || '';
      if (!errorMessage.includes('Chưa cung cấp token') && 
          !errorMessage.includes('Session expired')) {
        console.error('Error loading conversations:', error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadConversations(1, false);
      refreshFriends();
    }
  }, [isAuthenticated, loadConversations, refreshFriends]);

  // Track danh sách user online theo realtime socket (xem API_USERS_GUIDE.md)
  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handleUsersOnlineList = ({ userIds }: { userIds: string[]; total?: number }) => {
      setOnlineUserIds(new Set((userIds || []).map((id) => id.toString())));
    };

    const handleUserOnline = ({ userId }: { userId: string }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (userId) {
          next.add(userId.toString());
        }
        return next;
      });
    };

    const handleUserOffline = ({ userId }: { userId: string }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (userId) {
          next.delete(userId.toString());
        }
        return next;
      });
    };

    socket.on('users:online:list', handleUsersOnlineList);
    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);

    return () => {
      socket.off('users:online:list', handleUsersOnlineList);
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
    };
  }, [socket, isAuthenticated]);

  // Listen to socket events for real-time updates
  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handleConversationsUpdated = () => {
      // Refresh conversations list when có thay đổi về conversations (tin nhắn mới, v.v.)
      loadConversations(1, false);
    };

    const handleMessageNew = (payload: any) => {
      try {
        if (!payload) return;
        const conversationId =
          payload.conversationId || payload.conversation?._id || payload.message?.conversationId;
        if (!conversationId) return;

        // Chỉ cần reload lại danh sách để cập nhật lastMessage & thứ tự phòng
        loadConversations(1, false);
      } catch (error) {
        console.warn('⚠️ [HomeScreen] Invalid message:new payload', error);
      }
    };

    const handleFriendAdded = () => {
      // Khi kết bạn thành công → backend tự tạo phòng PRIVATE
      // Refresh lại danh sách phòng để hiện phòng mới
      loadConversations(1, false);
    };

    const handleFriendRequestUpdated = (data: any) => {
      // Khi lời mời được accept cũng đảm bảo refresh
      if (data?.action === 'accepted') {
        loadConversations(1, false);
      }
    };

    socket.on('conversations:updated', handleConversationsUpdated);
    socket.on('message:new', handleMessageNew);
    socket.on('friend:added', handleFriendAdded);
    socket.on('friend:request:updated', handleFriendRequestUpdated);

    return () => {
      socket.off('conversations:updated', handleConversationsUpdated);
      socket.off('message:new', handleMessageNew);
      socket.off('friend:added', handleFriendAdded);
      socket.off('friend:request:updated', handleFriendRequestUpdated);
    };
  }, [socket, isAuthenticated, loadConversations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    loadConversations(1, false);
  }, [loadConversations]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadConversations(nextPage, true);
    }
  }, [loading, hasMore, page, loadConversations]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const buildAvatarUrl = (path: string | null | undefined) => {
    if (!path) return null;
    // Nếu backend đã trả full URL thì dùng luôn
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    // Nếu là đường dẫn tương đối (ví dụ: /uploads/avatars/xxx.jpg)
    const base = API_CONFIG.BASE_URL.replace('/api/v1', '');
    if (path.startsWith('/')) {
      return `${base}${path}`;
    }
    return `${base}/${path}`;
  };

  const getConversationName = (conversation: ConversationWithMember['conversation']) => {
    if (conversation.type === 'GROUP') {
      return conversation.name || 'Nhóm chat';
    }

    // PRIVATE: dùng otherUserName từ backend (xem API_CONVERSATIONS_GUIDE.md 166-185)
    if (conversation.type === 'PRIVATE') {
      if (conversation.otherUserName) {
        return conversation.otherUserName;
      }
      // fallback
      return 'Chat riêng';
    }

    return 'Chat riêng';
  };

  const getConversationAvatar = (conversation: ConversationWithMember['conversation']) => {
    if (conversation.type === 'GROUP' && conversation.avatar) {
      return buildAvatarUrl(conversation.avatar);
    }

    // PRIVATE: dùng otherUserAvatar nếu có
    if (conversation.type === 'PRIVATE' && conversation.otherUserAvatar) {
      return buildAvatarUrl(conversation.otherUserAvatar);
    }

    return null;
  };

  // Helper: Kiểm tra xem một conversation có user đang online không
  const isConversationUserOnline = (conversation: ConversationWithMember['conversation']) => {
    if (conversation.type === 'PRIVATE' && conversation.otherUserId) {
      const userId = conversation.otherUserId.toString();
      // Kiểm tra trong onlineUserIds hoặc trong friends list
      if (onlineUserIds.has(userId)) return true;
      const friend = friends.find((f) => f.friend._id?.toString() === userId);
      return friend?.friend.onlineStatus === 'online';
    }
    return false;
  };

  const renderConversationItem = ({ item }: { item: ConversationWithMember }) => {
    const { conversation, memberSettings } = item;
    const conversationName = getConversationName(conversation);
    const avatar = getConversationAvatar(conversation);
    const lastMessage = conversation.lastMessage;
    const unreadCount = memberSettings.unreadCount;
    const isPinned = memberSettings.isPinned;
    const isMuted = memberSettings.isMuted;
    const isOnline = isConversationUserOnline(conversation);

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          { backgroundColor: colors.card, borderColor: colors.border },
          isPinned && { borderLeftWidth: 4, borderLeftColor: colors.primary },
        ]}
        activeOpacity={0.7}
        onPress={() => {
          navigation.navigate('Chat', {
            conversationId: conversation._id,
            title: conversationName,
            avatarUrl: avatar,
          });
        }}>
        <View style={styles.avatarWrapper}>
          <View style={[styles.avatarContainer, { backgroundColor: colors.surface }]}>
            {avatar ? (
              <Image
                source={{ uri: avatar }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : conversation.type === 'GROUP' ? (
              <Icon name="group" size={28} color={colors.primary} />
            ) : (
              <Icon name="person" size={28} color={colors.primary} />
            )}
          </View>
          {isOnline && (
            <View style={styles.onlineDotConversation} />
          )}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <CustomText
              variant="body"
              weight="semibold"
              color={colors.text}
              style={styles.conversationName}
              numberOfLines={1}>
              {conversationName}
            </CustomText>
            {lastMessage && (
              <CustomText variant="caption" color={colors.textSecondary} style={styles.time}>
                {formatTime(lastMessage.createdAt)}
              </CustomText>
            )}
          </View>

          <View style={styles.conversationFooter}>
            {lastMessage ? (
              <CustomText
                variant="caption"
                color={colors.textSecondary}
                style={styles.lastMessage}
                numberOfLines={1}>
                {lastMessage.text || 'Đã gửi một hình ảnh'}
              </CustomText>
            ) : (
              <CustomText variant="caption" color={colors.textSecondary} style={styles.lastMessage}>
                Chưa có tin nhắn
              </CustomText>
            )}

            <View style={styles.rightIcons}>
              {isMuted && (
                <Icon name="notifications-off" size={16} color={colors.textSecondary} style={styles.icon} />
              )}
              {unreadCount > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                  <CustomText variant="caption" weight="semibold" color="#FFF" style={styles.unreadText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </CustomText>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <CustomText variant="body" color={colors.textSecondary} style={styles.emptyText}>
            Đang tải...
          </CustomText>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Icon name="chat-bubble-outline" size={64} color={colors.textSecondary} />
        <CustomText variant="h3" weight="semibold" color={colors.text} style={styles.emptyTitle}>
          Chưa có cuộc trò chuyện
        </CustomText>
        <CustomText variant="body" color={colors.textSecondary} style={styles.emptyText}>
          Bắt đầu trò chuyện với bạn bè của bạn
        </CustomText>
      </View>
    );
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Icon name="lock" size={64} color={colors.textSecondary} />
          <CustomText variant="h3" weight="semibold" color={colors.text} style={styles.emptyTitle}>
            Vui lòng đăng nhập
          </CustomText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header kiểu Messenger */}
      <View style={styles.header}>
        <CustomText variant="h2" weight="bold" color={colors.text} style={styles.headerTitle}>
          Tin nhắn
        </CustomText>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIconButton}>
            <Icon name="photo-camera" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}>
            <Icon name="edit" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Thanh tìm kiếm giả lập */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
          <Icon name="search" size={20} color={colors.textSecondary} />
          <CustomText
            variant="body"
            color={colors.textSecondary}
            style={styles.searchPlaceholder}>
            Tìm kiếm
          </CustomText>
        </View>
      </View>

      {/* Danh sách chính */}
      <FlatList
        data={conversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.conversation._id}
        contentContainerStyle={conversations.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          (() => {
            // Lọc conversations đang online
            const onlineConversations = conversations.filter((item) =>
              isConversationUserOnline(item.conversation)
            );
            // Lọc friends đang online (không trùng với conversations)
            const onlineFriends = friends.filter((f) => {
              const userId = f.friend._id?.toString() || '';
              const isOnline = onlineUserIds.has(userId) || f.friend.onlineStatus === 'online';
              if (!isOnline) return false;
              const hasConversation = conversations.some(
                (c) => c.conversation.type === 'PRIVATE' &&
                       c.conversation.otherUserId?.toString() === userId
              );
              return !hasConversation;
            });

            // Chỉ hiển thị nếu có người đang online
            if (onlineConversations.length === 0 && onlineFriends.length === 0) {
              return null;
            }

            return (
              <View style={styles.storiesWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.storiesList}>
                  {/* Hiển thị conversations đang online */}
                  {onlineConversations.slice(0, 10).map((item) => {
                    const avatar = getConversationAvatar(item.conversation);
                    const name = getConversationName(item.conversation);
                    return (
                      <TouchableOpacity
                        key={item.conversation._id}
                        style={styles.storyItem}
                        activeOpacity={0.7}
                        onPress={() => {
                          navigation.navigate('Chat', {
                            conversationId: item.conversation._id,
                            title: name,
                            avatarUrl: avatar,
                          });
                        }}>
                        <View style={styles.storyAvatarWrapper}>
                          <View style={styles.storyAvatarBorder}>
                            {avatar ? (
                              <Image
                                source={{ uri: avatar }}
                                style={styles.storyAvatar}
                                resizeMode="cover"
                              />
                            ) : (
                              <View
                                style={[
                                  styles.storyAvatar,
                                  { backgroundColor: colors.primary },
                                ]}
                              />
                            )}
                            <View style={styles.onlineDot} />
                          </View>
                        </View>
                        <CustomText
                          variant="caption"
                          color={colors.text}
                          numberOfLines={1}
                          style={styles.storyName}>
                          {name}
                        </CustomText>
                      </TouchableOpacity>
                    );
                  })}
                  {/* Hiển thị bạn bè đang online (không trùng với conversations) */}
                  {onlineFriends.slice(0, 10).map((item) => {
                    const user = item.friend;
                    const avatarUrl = user.avatar ? buildAvatarUrl(user.avatar) : null;
                    const displayName = user.displayName || user.username;
                    return (
                      <TouchableOpacity
                        key={`friend-${user._id}`}
                        style={styles.storyItem}
                        activeOpacity={0.7}
                        onPress={async () => {
                          try {
                            // Tạo hoặc lấy conversation PRIVATE với friend này
                            const response = await conversationService.createOrGetPrivateConversation({
                              userId: user._id.toString(),
                            });
                            if (response.success && response.data) {
                              const conversation = response.data.conversation;
                              const conversationAvatar = conversation.type === 'PRIVATE' && conversation.otherUserAvatar
                                ? buildAvatarUrl(conversation.otherUserAvatar)
                                : avatarUrl;
                              navigation.navigate('Chat', {
                                conversationId: conversation._id,
                                title: displayName,
                                avatarUrl: conversationAvatar,
                              });
                            }
                          } catch (error) {
                            console.error('Error creating/getting private conversation:', error);
                          }
                        }}>
                        <View style={styles.storyAvatarWrapper}>
                          <View style={styles.storyAvatarBorder}>
                            {avatarUrl ? (
                              <Image
                                source={{ uri: avatarUrl }}
                                style={styles.storyAvatar}
                                resizeMode="cover"
                              />
                            ) : (
                              <View
                                style={[
                                  styles.storyAvatar,
                                  { backgroundColor: colors.primary },
                                ]}
                              />
                            )}
                            <View style={styles.onlineDot} />
                          </View>
                        </View>
                        <CustomText
                          variant="caption"
                          color={colors.text}
                          numberOfLines={1}
                          style={styles.storyName}>
                          {displayName}
                        </CustomText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            );
          })()
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 26,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchPlaceholder: {
    marginLeft: 8,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E', // xanh lá
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  onlineDotConversation: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E', // xanh lá
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  storiesWrapper: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  storiesList: {
    paddingHorizontal: 12,
  },
  storyItem: {
    width: 68,
    alignItems: 'center',
    marginRight: 12,
  },
  storyAvatarWrapper: {
    marginBottom: 4,
  },
  storyAvatarBorder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#1877F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  storyName: {
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: 0,
  },
  emptyList: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarWrapper: {
    width: 56,
    height: 56,
    marginRight: 12,
    position: 'relative',
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    marginRight: 8,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    marginRight: 4,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 11,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
  },
});

export default HomeScreen;
