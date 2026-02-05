import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  Image,
  StatusBar,
  Alert,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { RootStackParamList } from '../types/navigation';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import CustomText from '../components/CustomText';
import { conversationService, Message, ConversationWithMember, friendService } from '../services';
import { API_CONFIG } from '../config/api';
import { pickImage, pickMultipleImages } from '../utils/imagePicker';

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;
type ChatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;

interface ChatScreenProps {
  navigation: ChatScreenNavigationProp;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ navigation }) => {
  const route = useRoute<ChatScreenRouteProp>();
  const { conversationId, title, avatarUrl } = route.params;
  const { colors } = useTheme();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [inputText, setInputText] = useState('');
  const listRef = useRef<any>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true); // Track xem user có đang ở cuối không
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [headerTitle, setHeaderTitle] = useState<string | undefined>(title);
  const [headerAvatarUrl, setHeaderAvatarUrl] = useState<string | null | undefined>(avatarUrl);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState<boolean>(false);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);

  const currentUserId = user?._id;

  // Helper: Scroll về cuối (offset 0 với inverted)
  const scrollToBottom = useCallback((animated: boolean = true) => {
    if (listRef.current?.scrollToOffset) {
      listRef.current.scrollToOffset({ offset: 0, animated });
    }
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút`;
    if (hours < 24) return `${hours} giờ`;
    if (days < 7) return `${days} ngày`;
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatLastSeen = (dateString: string | null) => {
    if (!dateString) return 'Offline';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `Offline ${minutes} phút trước`;
    if (hours < 24) return `Offline ${hours} giờ trước`;
    if (days < 7) return `Offline ${days} ngày trước`;
    return 'Offline';
  };

  const formatDividerTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const buildAvatarUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
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

    if (conversation.type === 'PRIVATE') {
      if (conversation.otherUserName) {
        return conversation.otherUserName;
      }
      return 'Chat riêng';
    }

    return 'Chat riêng';
  };

  const getConversationAvatar = (conversation: ConversationWithMember['conversation']) => {
    if (conversation.type === 'GROUP' && conversation.avatar) {
      return buildAvatarUrl(conversation.avatar);
    }

    if (conversation.type === 'PRIVATE' && conversation.otherUserAvatar) {
      return buildAvatarUrl(conversation.otherUserAvatar);
    }

    return null;
  };

  // Ẩn bottom tabs khi đang ở màn Chat
  useEffect(() => {
    const parent = (navigation as any).getParent?.();
    if (parent) {
      parent.setOptions({ tabBarStyle: { display: 'none' } });
    }
    return () => {
      if (parent) {
        parent.setOptions({ tabBarStyle: undefined });
      }
    };
  }, [navigation]);

  const loadMessages = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const response = await conversationService.getMessages(conversationId, pageNum, 30);
        if (response.success && response.data) {
          const newMessages = response.data.messages || [];

          // Gộp và loại trùng theo _id để tránh key trùng
          setMessages((prev) => {
            // Với inverted list, tin mới nhất ở index 0 → sort DESC theo createdAt
            const combined = append ? [...prev, ...newMessages] : newMessages;
            const map = new Map<string, Message>();
            combined.forEach((m) => {
              if (m && m._id) {
                map.set(m._id, m);
              }
            });
            // Giữ thứ tự giảm dần theo createdAt (index 0 = tin mới nhất)
            return Array.from(map.values()).sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            );
          });

          setHasMore(pageNum < response.data.totalPages);
          setPage(pageNum);

          // Khi load lần đầu (không append), scroll về cuối
          // Nhưng chỉ scroll nếu đây là lần load đầu tiên hoặc user đang ở cuối
          if (!append) {
            const shouldScroll = isInitialLoadRef.current || isAtBottom;
            if (shouldScroll) {
              setIsAtBottom(true);
              setTimeout(() => {
                scrollToBottom(false); // Không animated để không giật khi vào màn hình
              }, 100);
            }
            isInitialLoadRef.current = false;
          }
        }
      } catch (error: any) {
        const msg = error?.message || '';
        if (!msg.includes('Chưa cung cấp token') && !msg.includes('Session expired')) {
          console.error('Error loading messages:', error);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [conversationId, scrollToBottom],
  );

  useEffect(() => {
    if (headerTitle) {
      navigation.setOptions({ title: headerTitle });
    }
  }, [navigation, headerTitle]);

  // Khi mở từ notification, có thể thiếu avatar/name → lấy từ danh sách conversations
  useEffect(() => {
    let isMounted = true;

    const fetchConversationInfo = async () => {
      try {
        // Nếu đã có đủ thông tin thì bỏ qua
        if (headerAvatarUrl && headerTitle) {
          return;
        }

        const response = await conversationService.getConversations(1, 50);
        if (response.success && response.data) {
          const match = response.data.conversations.find(
            (item) => item.conversation._id === conversationId,
          );

          if (match && isMounted) {
            const name = getConversationName(match.conversation);
            const avatar = getConversationAvatar(match.conversation);
            const conversation = match.conversation;

            if (!headerTitle) {
              setHeaderTitle(name);
            }
            if (!headerAvatarUrl && avatar) {
              setHeaderAvatarUrl(avatar);
            }
            // Lưu otherUserId nếu là PRIVATE conversation và kiểm tra online status
            if (conversation.type === 'PRIVATE' && conversation.otherUserId) {
              const userId = conversation.otherUserId.toString();
              setOtherUserId(userId);
              
              // Kiểm tra online status từ friends list
              friendService.getFriends().then((friendsResponse) => {
                if (friendsResponse.success && friendsResponse.data && isMounted) {
                  const friend = friendsResponse.data.find(
                    (f) => f.friend._id?.toString() === userId
                  );
                  if (friend) {
                    // Check onlineStatus từ friends list hoặc có thể dùng socket onlineUserIds
                    const isOnline = friend.friend.onlineStatus === 'online';
                    if (isMounted) {
                      setIsOtherUserOnline(isOnline);
                      if (!isOnline && friend.friend.lastSeenAt) {
                        setLastSeenAt(friend.friend.lastSeenAt);
                      }
                    }
                  }
                }
              }).catch(() => {
                // Ignore error
              });
            }
          }
        }
      } catch (error) {
        // Không cần log ồn nếu chỉ để lấy avatar/name
      }
    };

    fetchConversationInfo();

    return () => {
      isMounted = false;
    };
  }, [conversationId, headerAvatarUrl, headerTitle]);

  useEffect(() => {
    loadMessages(1, false);
  }, [loadMessages]);

  /**
   * Đánh dấu cuộc trò chuyện là đã đọc khi thoát màn Chat.
   *
   * Backend hiện đang tăng `unreadCount` cho các member khác mỗi khi có message mới.
   * Theo thiết kế, khi client gọi `GET /conversations/:id/messages` thì backend sẽ
   * reset `unreadCount` về 0 cho member đó và emit `conversations:updated`.
   *
   * Vì trong màn Chat chúng ta đang tự xử lý realtime bằng socket (không reload messages
   * từ API sau mỗi tin nhắn), nên khi user rời màn hình, ta chủ động gọi nhẹ một request
   * GET (limit = 1) để backend đánh dấu đã đọc, giúp HomeScreen hiển thị đúng badge.
   */
  useEffect(() => {
    return () => {
      // Dùng limit nhỏ để giảm tải, chỉ cần side-effect reset unreadCount
      conversationService
        .getMessages(conversationId, 1, 1)
        .catch((error) => {
          console.warn('⚠️ [ChatScreen] Failed to mark conversation as read on leave:', error);
        });
    };
  }, [conversationId]);

  // Track online status của otherUser qua socket
  useEffect(() => {
    if (!socket || !otherUserId) return;

    // Lắng nghe danh sách online ban đầu (khi socket connect)
    const handleUsersOnlineList = ({ userIds }: { userIds: string[] }) => {
      if (!userIds || !Array.isArray(userIds)) return;
      const isOnline = userIds.some((id) => id.toString() === otherUserId.toString());
      setIsOtherUserOnline(isOnline);
      if (!isOnline) {
        // Nếu không online, có thể set lastSeenAt nếu cần
      }
    };

    // User vừa online
    const handleUserOnline = ({ userId }: { userId: string }) => {
      if (userId && userId.toString() === otherUserId.toString()) {
        setIsOtherUserOnline(true);
        setLastSeenAt(null);
      }
    };

    // User vừa offline
    const handleUserOffline = ({ userId }: { userId: string }) => {
      if (userId && userId.toString() === otherUserId.toString()) {
        setIsOtherUserOnline(false);
        setLastSeenAt(new Date().toISOString());
      }
    };

    socket.on('users:online:list', handleUsersOnlineList);
    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);

    return () => {
      socket.off('users:online:list', handleUsersOnlineList);
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
    };
  }, [socket, otherUserId]);

  // Socket: join room + lắng nghe message mới / cập nhật conversations
  useEffect(() => {
    if (!socket) return;

    // Join conversation room
    socket.emit('conversation:join', { conversationId });

    const handleNewMessage = (payload: any) => {
      try {
        if (!payload) return;
        const payloadConversationId = payload.conversationId || payload.conversation?.conversationId;
        if (payloadConversationId !== conversationId) return;

        const message: Message | undefined = payload.message || payload;
        if (!message?._id) return;

        setMessages((prev) => {
          // Tránh trùng
          if (prev.find((m) => m._id === message._id)) return prev;

          const combined = [message, ...prev];
          const map = new Map<string, Message>();
          combined.forEach((m) => {
            if (m && m._id) {
              map.set(m._id, m);
            }
          });

          return Array.from(map.values()).sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
        });

        // Auto-scroll nếu user đang ở cuối
        if (isAtBottom) {
          // Dùng setTimeout để đảm bảo message đã được render
          setTimeout(() => {
            scrollToBottom(true);
          }, 100);
        }
      } catch (e) {
        // tránh crash UI nếu payload khác format
        console.warn('⚠️ [ChatScreen] Invalid message:new payload', e);
      }
    };

    const handleConversationsUpdated = () => {
      // Chỉ reload messages nếu user đang ở cuối, tránh làm gián đoạn khi đang đọc tin nhắn cũ
      if (isAtBottom) {
        loadMessages(1, false);
      }
      // Nếu không ở cuối, chỉ cập nhật state mà không reload để tránh scroll
    };

    socket.on('message:new', handleNewMessage);
    socket.on('conversations:updated', handleConversationsUpdated);

    return () => {
      socket.emit('conversation:leave', { conversationId });
      socket.off('message:new', handleNewMessage);
      socket.off('conversations:updated', handleConversationsUpdated);
    };
  }, [socket, conversationId, loadMessages, isAtBottom, scrollToBottom]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;

    // Xóa input và trả nút gửi về trạng thái bình thường NGAY LẬP TỨC
    setInputText('');

    // Đảm bảo đang ở cuối khi gửi tin
    setIsAtBottom(true);
    setShowScrollToBottom(false);

    // Gửi tin nhắn bất đồng bộ, UI không phải chờ response
    conversationService
      .sendMessage(conversationId, {
        type: 'TEXT',
        text,
      })
      .then(() => {
        // Sau khi gửi thành công, scroll về cuối để hiển thị tin vừa gửi
        setTimeout(() => {
          scrollToBottom(true);
        }, 100);
      })
      .catch((error) => {
        console.error('Error sending message:', error);
        Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng thử lại.');
      });
  };

  const handlePickImage = async (source: 'library' | 'camera') => {
    try {
      // Kiểm tra user đã đăng nhập chưa
      if (!user || !user._id) {
        Alert.alert('Lỗi', 'Vui lòng đăng nhập để gửi ảnh');
        return;
      }

      let images: Array<{ uri: string; type: string; name: string }> = [];

      if (source === 'library') {
        // Cho phép chọn nhiều ảnh từ thư viện
        images = await pickMultipleImages(10);
      } else {
        // Chụp ảnh chỉ chọn 1 ảnh
        const imageResult = await pickImage(source);
        if (imageResult) {
          images = [imageResult];
        }
      }

      if (images.length === 0) return;

      // Upload và gửi từng ảnh
      for (const imageResult of images) {
        try {
          const uploadResponse = await conversationService.uploadImage(
            conversationId,
            imageResult.uri,
            imageResult.type,
            imageResult.name
          );

          if (uploadResponse && uploadResponse.success && uploadResponse.data) {
            const mediaUrl = uploadResponse.data.url;
            
            // Gửi message với type IMAGE
            await conversationService.sendMessage(conversationId, {
              type: 'IMAGE',
              mediaUrl,
            });
          }
        } catch (error: any) {
          console.error('Error uploading image:', error);
          // Tiếp tục với ảnh tiếp theo nếu có lỗi
        }
      }

      // Scroll về cuối sau khi gửi
      setTimeout(() => {
        scrollToBottom(true);
      }, 100);
    } catch (error: any) {
      console.error('Error picking/uploading image:', error);
      const errorMessage = error?.message || 'Không thể gửi ảnh. Vui lòng thử lại.';
      Alert.alert('Lỗi', errorMessage);
    }
  };

  const renderMessageItem = ({ item, index }: { item: Message; index: number }) => {
    const isMine = currentUserId && item.senderId === currentUserId;
    const isImage = item.type === 'IMAGE';
    const text = item.content?.text || (isImage ? 'Đã gửi một hình ảnh' : '');
    const imageUrl = isImage && item.content?.mediaUrl 
      ? buildAvatarUrl(item.content.mediaUrl) 
      : null;

    const thresholdMs = 15 * 60 * 1000; // 15 phút

    // Tính toán xem có cần hiển thị thanh phân cách thời gian không
    const showDivider = (() => {
      // Với sort DESC (index 0 là mới nhất), phần tử "đầu tiên" theo thời gian
      // sẽ nằm ở cuối mảng
      if (index === messages.length - 1) return true;

      const currentDate = new Date(item.createdAt);
      const prevDate = new Date(messages[index + 1].createdAt); // tin cũ hơn
      const diff = Math.abs(currentDate.getTime() - prevDate.getTime());

      return diff >= thresholdMs;
    })();

    // Kiểm tra khoảng cách thời gian để nhóm tin nhắn (bắt đầu / kết thúc 1 đoạn)
    const isFirstInGroup = (() => {
      // "Đầu đoạn" theo thời gian = gần với tin cũ hơn
      if (index === messages.length - 1) return true;

      const prevMsg = messages[index + 1]; // tin cũ hơn
      if (prevMsg.senderId !== item.senderId) return true;

      const currentTime = new Date(item.createdAt).getTime();
      const prevTime = new Date(prevMsg.createdAt).getTime();
      const diff = Math.abs(currentTime - prevTime);

      return diff >= thresholdMs;
    })();

    const isLastInGroup = (() => {
      // "Cuối đoạn" theo thời gian = gần với tin mới hơn
      if (index === 0) return true;

      const nextMsg = messages[index - 1]; // tin mới hơn
      if (nextMsg.senderId !== item.senderId) return true;

      const currentTime = new Date(item.createdAt).getTime();
      const nextTime = new Date(nextMsg.createdAt).getTime();
      const diff = Math.abs(nextTime - currentTime);

      return diff >= thresholdMs;
    })();

    // Tìm đoạn liên tiếp (group) của cùng sender trong khoảng < 15p
    let groupStart = index;
    // Đi về phía tin cũ hơn
    while (groupStart < messages.length - 1) {
      const prev = messages[groupStart + 1];
      if (prev.senderId !== item.senderId) break;
      const prevTime = new Date(prev.createdAt).getTime();
      const curTime = new Date(messages[groupStart].createdAt).getTime();
      if (Math.abs(curTime - prevTime) >= thresholdMs) break;
      groupStart++;
    }

    let groupEnd = index;
    // Đi về phía tin mới hơn
    while (groupEnd > 0) {
      const cur = messages[groupEnd];
      const next = messages[groupEnd - 1];
      if (next.senderId !== item.senderId) break;
      const curTime = new Date(cur.createdAt).getTime();
      const nextTime = new Date(next.createdAt).getTime();
      if (Math.abs(nextTime - curTime) >= thresholdMs) break;
      groupEnd--;
    }

    const groupLength = groupEnd - groupStart + 1;
    const tailIndex = groupStart + Math.floor(groupLength / 2); // vị trí giữa đoạn
    const isTailInGroup = index === tailIndex;

    // Avatar hiển thị ở tin cuối cùng của đoạn (giống Zalo)
    const showAvatar = !isMine && isLastInGroup;

    return (
      <View>
        {showDivider && (
          <View style={styles.timeDividerContainer}>
            <View style={styles.timeDividerLine} />
            <CustomText variant="caption" color={colors.textSecondary} style={styles.timeDividerText}>
              {formatDividerTime(item.createdAt)}
            </CustomText>
            <View style={styles.timeDividerLine} />
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            setSelectedMessageId((prev) => (prev === item._id ? null : item._id))
          }>
          <View
            style={[
              styles.messageRow,
              isMine ? styles.messageRowMine : styles.messageRowOther,
              isFirstInGroup ? styles.messageFirstInGroup : {},
              isLastInGroup ? styles.messageLastInGroup : {},
            ]}>
            {!isMine && showAvatar && (
              <View style={styles.avatarContainer}>
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatar}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: '#FF6B8B' }]} />
                )}
              </View>
            )}
            
            {!isMine && !showAvatar && (
              <View style={styles.avatarSpacer} />
            )}
            
            <View style={styles.messageColumn}>
              <View
                style={[
                  styles.messageBubble,
                  isMine ? styles.messageBubbleMine : styles.messageBubbleOther,
                  {
                    backgroundColor: isMine
                      ? '#FF6B8B' // Màu hồng đậm cho tin nhắn của mình
                      : '#FFFFFF', // Màu trắng cho tin nhắn người khác
                  },
                  isFirstInGroup ? (isMine ? styles.bubbleFirstMine : styles.bubbleFirstOther) : {},
                  isLastInGroup ? (isMine ? styles.bubbleLastMine : styles.bubbleLastOther) : {},
                  isTailInGroup ? (isMine ? styles.bubbleTailMine : styles.bubbleTailOther) : {},
                  isImage && styles.messageBubbleImage,
                ]}>
                {isImage && imageUrl ? (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                      setViewingImage(imageUrl);
                    }}>
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.messageImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ) : (
                  <CustomText
                    variant="body"
                    color={isMine ? '#FFFFFF' : '#000000'}
                    align="left"
                    style={isMine ? styles.myMessageText : styles.otherMessageText}>
                    {text || '[Tin nhắn hệ thống]'}
                  </CustomText>
                )}
              </View>
              
              {(selectedMessageId === item._id || isLastInGroup) && (
                <CustomText
                  variant="caption"
                  color={isMine ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)'}
                  style={[
                    styles.messageTime,
                    isMine ? styles.messageTimeMine : styles.messageTimeOther,
                  ]}>
                  {formatTime(item.createdAt)}
                </CustomText>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const keyExtractor = (item: Message) => item._id;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: '#FAD0D7' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
      <StatusBar backgroundColor="#FAD0D7" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <View style={styles.headerUserRow}>
            {headerAvatarUrl ? (
              <Image
                source={{ uri: headerAvatarUrl }}
                style={styles.headerAvatar}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.headerAvatarFallback, { backgroundColor: '#FF6B8B' }]}>
                <CustomText variant="body" color="#FFFFFF" weight="bold">
                  {title?.charAt(0) || 'A'}
                </CustomText>
              </View>
            )}
              <View style={styles.headerTextContainer}>
              <CustomText variant="h3" weight="bold" color="#000000">
                {headerTitle || 'Tin nhắn'}
              </CustomText>
              {otherUserId ? (
                <View style={styles.headerStatusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: isOtherUserOnline ? '#22C55E' : '#9CA3AF' },
                    ]}
                  />
                  <CustomText
                    variant="caption"
                    color="#666666"
                    style={styles.headerStatus}>
                    {isOtherUserOnline
                      ? 'Đang online'
                      : lastSeenAt
                      ? formatLastSeen(lastSeenAt)
                      : 'Offline'}
                  </CustomText>
                </View>
              ) : (
                <CustomText
                  variant="caption"
                  color="#666666"
                  style={styles.headerStatus}>
                  Đang hoạt động
                </CustomText>
              )}
            </View>
          </View>
        </View>
        
        <View style={styles.headerMoreButton} />
      </View>

      {/* Chat Content */}
      <ImageBackground
        source={{
          uri: 'https://images.pexels.com/photos/7134985/pexels-photo-7134985.jpeg?auto=compress&cs=tinysrgb&w=1080',
        }}
        style={styles.background}
        imageStyle={styles.backgroundImage}>
        
        {loading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B8B" />
          </View>
        ) : (
          <View style={styles.messagesWrapper}>
            <FlatList
              ref={listRef}
              inverted
              data={messages}
              renderItem={renderMessageItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
              onScroll={(event) => {
                const offsetY = event.nativeEvent.contentOffset.y;
                const atBottom = offsetY <= 40;

                // Track trạng thái scroll để quyết định có auto-scroll hay không
                setIsAtBottom(atBottom);

                if (atBottom) {
                  if (showScrollToBottom) setShowScrollToBottom(false);
                } else {
                  if (!showScrollToBottom) setShowScrollToBottom(true);
                }
              }}
              onEndReached={() => {
                if (!loadingMore && !loading && hasMore) {
                  loadMessages(page + 1, true);
                }
              }}
              onEndReachedThreshold={0.1}
              scrollEventThrottle={16}
              ListFooterComponent={
                loadingMore ? (
                  <ActivityIndicator size="small" color="#FF6B8B" />
                ) : null
              }
            />

            {showScrollToBottom && (
              <TouchableOpacity
                style={styles.scrollToBottomButton}
                activeOpacity={0.8}
                onPress={() => {
                  setIsAtBottom(true);
                  scrollToBottom(true);
                }}>
                <Icon name="arrow-downward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputInner}>
            <View style={styles.inputActionsLeft}>
              <TouchableOpacity
                style={styles.inputActionButton}
                onPress={() => handlePickImage('camera')}>
                <Icon name="photo-camera" size={24} color="#FF6B8B" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.inputActionButton}
                onPress={() => handlePickImage('library')}>
                <Icon name="image" size={24} color="#FF6B8B" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.inputActionButton}>
                <Icon name="mic" size={24} color="#FF6B8B" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputFieldWrapper}>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: '#FFFFFF',
                    color: '#000000',
                    borderColor: 'transparent',
                    shadowColor: '#000',
                    shadowOpacity: 0.08,
                    shadowOffset: { width: 0, height: 1 },
                    shadowRadius: 2,
                    elevation: 1,
                  },
                ]}
                placeholder="Nhắn tin"
                placeholderTextColor="#999999"
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
            </View>
            
            <View style={styles.inputActionsRight}>
              {inputText.trim().length === 0 ? (
                <>
                  <TouchableOpacity style={styles.inputActionButton}>
                    <Icon name="mood" size={24} color="#FF6B8B" />
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handleSend}
                  disabled={inputText.trim().length === 0}>
                  <Icon name="send" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ImageBackground>

      {/* Image Viewer Modal */}
      {viewingImage && (
        <TouchableOpacity
          style={styles.imageViewerOverlay}
          activeOpacity={1}
          onPress={() => setViewingImage(null)}>
          <View style={styles.imageViewerContainer}>
            <TouchableOpacity
              style={styles.imageViewerCloseButton}
              onPress={() => setViewingImage(null)}>
              <Icon name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Image
              source={{ uri: viewingImage }}
              style={styles.imageViewerImage}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  backgroundImage: {
    opacity: 0.15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FAD0D7',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 10,
  },
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  headerStatus: {
    fontSize: 12,
  },
  headerMoreButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesWrapper: {
    flex: 1,
    position: 'relative',
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    paddingBottom: 20,
  },
  timeDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  timeDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  timeDividerText: {
    paddingHorizontal: 12,
    color: '#666666',
    fontSize: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 2,
    maxWidth: '100%',
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageFirstInGroup: {
    marginTop: 8,
  },
  messageLastInGroup: {
    marginBottom: 4,
  },
  avatarContainer: {
    width: 36,
    alignItems: 'center',
    marginRight: 8,
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  avatarSpacer: {
    width: 36,
    marginRight: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  messageColumn: {
    maxWidth: '75%',
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  messageBubbleImage: {
    padding: 0,
    overflow: 'hidden',
    maxWidth: 280,
  },
  messageImage: {
    width: 250,
    height: 250,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
  },
  messageBubbleMine: {
    borderBottomRightRadius: 4,
    // Thêm shadow đậm hơn cho tin nhắn của mình
    shadowOpacity: 0.2,
    elevation: 4,
  },
  messageBubbleOther: {
    borderBottomLeftRadius: 4,
    // Shadow nhẹ hơn cho tin nhắn người khác
    shadowOpacity: 0.1,
    elevation: 2,
  },
  bubbleFirstMine: {
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
  },
  bubbleFirstOther: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 20,
  },
  bubbleLastMine: {
    borderBottomRightRadius: 20,
  },
  bubbleLastOther: {
    borderBottomLeftRadius: 20,
  },
  // Đuôi nhọn hướng về giữa đoạn tin nhắn liên tiếp
  bubbleTailMine: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  bubbleTailOther: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  myMessageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  otherMessageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTime: {
    marginTop: 4,
    fontSize: 11,
    opacity: 0.8,
  },
  messageTimeMine: {
    textAlign: 'right',
    marginRight: 6,
  },
  messageTimeOther: {
    textAlign: 'left',
    marginLeft: 6,
  },
  inputContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  inputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  inputActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  inputActionButton: {
    padding: 4,
    marginHorizontal: 4,
  },
  inputFieldWrapper: {
    flex: 1,
    marginHorizontal: 4,
  },
  textInput: {
    flex: 1,
    borderWidth: 0,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    maxHeight: 100,
    minHeight: 44,
  },
  inputActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  sendButton: {
    width: 30,
    height: 30,
    borderRadius: 22,
    backgroundColor: '#FF6B8B',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  scrollToBottomButton: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B8B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
  imageViewerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    zIndex: 1001,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerImage: {
    width: '100%',
    height: '100%',
  },
});

export default ChatScreen;