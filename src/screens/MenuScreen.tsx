import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTheme, type ThemeMode} from '../contexts/ThemeContext';
import CustomText from '../components/CustomText';
import {useAuth} from '../contexts/AuthContext';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import {API_CONFIG} from '../config/api';
import QRCode from 'react-native-qrcode-svg';

interface MenuItemProps {
  icon: string;
  title: string;
  onPress?: () => void;
  showDot?: boolean;
  iconColor?: string;
}

const MenuItem = ({
  icon,
  title,
  onPress,
  showDot = false,
  iconColor,
}: MenuItemProps) => {
  const {colors} = useTheme();
  const defaultIconColor = iconColor || colors.text;

  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.menuItemLeft}>
        <Icon name={icon} size={24} color={defaultIconColor} />
        <CustomText variant="body" color={colors.text} style={styles.menuItemText}>
          {title}
        </CustomText>
      </View>
      {showDot && <View style={styles.menuItemDot} />}
    </TouchableOpacity>
  );
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

type MenuScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

function MenuScreen() {
  const navigation = useNavigation<MenuScreenNavigationProp>();
  const {colors, themeMode, setThemeMode, isDark} = useTheme();
  const {user, logout, isAuthenticated} = useAuth();
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const themeOptions: { mode: ThemeMode; label: string; icon: string }[] = [
    {
      mode: 'light',
      label: 'Sáng',
      icon: 'light-mode',
    },
    {
      mode: 'dark',
      label: 'Tối',
      icon: 'dark-mode',
    },
    {
      mode: 'system',
      label: 'Hệ thống',
      icon: 'phone-android',
    },
  ];

  const handleSelectTheme = async (mode: ThemeMode) => {
    await setThemeMode(mode);
    setShowThemeModal(false);
  };

  const handleLoginLogout = async () => {
    if (isAuthenticated) {
      try {
        await logout();
        // Logout sẽ tự động navigate về Auth screen
      } catch (error) {
        console.error('Logout error:', error);
      }
    } else {
      // Nếu chưa đăng nhập, logout sẽ tự động navigate về Auth
      // Hoặc có thể thêm logic navigate ở đây nếu cần
    }
  };

  const getThemeLabel = () => {
    const option = themeOptions.find(opt => opt.mode === themeMode);
    return option ? option.label : 'Chế độ hiển thị';
  };

  const getThemeIcon = () => {
    const option = themeOptions.find(opt => opt.mode === themeMode);
    return option ? option.icon : 'dark-mode';
  };

  const getQRCodeContent = () => {
    if (!user || !user._id) return '';
    return `trq-users/${user._id}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={colors.background} 
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <CustomText variant="h1" weight="bold" color={colors.text} style={styles.headerTitle}>
            Menu
          </CustomText>
          <TouchableOpacity>
            <Icon name="apps" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* User Profile Section */}
        {isAuthenticated && user && (
          <TouchableOpacity
            style={styles.userProfileSection}
            activeOpacity={0.8}
            onPress={() => {
              // Navigate to profile
            }}>
            <View style={styles.userProfileLeft}>
              {(user as any).avatar ? (
                <Image 
                  source={{ uri: buildAvatarUrl((user as any).avatar) || undefined }} 
                  style={styles.userAvatar} 
                  resizeMode="cover" 
                />
              ) : (
                <View style={[styles.userAvatarFallback, { backgroundColor: colors.primary }]}>
                  <CustomText variant="h3" weight="bold" color="#FFFFFF">
                    {(user.displayName || user.username || 'U').charAt(0).toUpperCase()}
                  </CustomText>
                </View>
              )}
              <View style={styles.userInfo}>
                <CustomText variant="body" weight="medium" color={colors.text}>
                  {user.displayName || user.username || 'Người dùng'}
                </CustomText>
                <CustomText variant="caption" color={colors.textSecondary} style={styles.userSubtext}>
                  @{user.username || ''}
                </CustomText>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Separator */}
        <View style={[styles.separator, { backgroundColor: colors.border }]} />

        {/* QR Code Generator */}
        {isAuthenticated && user && (
          <MenuItem
            icon="qr-code"
            title="Tạo mã QR"
            onPress={() => setShowQRModal(true)}
          />
        )}

        {/* Theme Toggle */}
        <MenuItem
          icon={getThemeIcon()}
          title={`Chế độ hiển thị: ${getThemeLabel()}`}
          onPress={() => setShowThemeModal(true)}
        />

        {/* Login/Logout */}
        <MenuItem
          icon={isAuthenticated ? "logout" : "login"}
          title={isAuthenticated ? "Đăng xuất" : "Đăng nhập"}
          onPress={handleLoginLogout}
          iconColor={isAuthenticated ? colors.error : colors.text}
        />
      </ScrollView>

      {/* Theme Selection Modal */}
      <Modal
        visible={showThemeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowThemeModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowThemeModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <CustomText variant="h3" weight="bold" color={colors.text}>
                Chọn chế độ hiển thị
              </CustomText>
              <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {themeOptions.map((option) => {
              const isSelected = themeMode === option.mode;
              return (
                <TouchableOpacity
                  key={option.mode}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor: isSelected ? colors.primary + '15' : 'transparent',
                      borderLeftWidth: isSelected ? 3 : 0,
                      borderLeftColor: isSelected ? colors.primary : 'transparent',
                    },
                  ]}
                  onPress={() => handleSelectTheme(option.mode)}
                  activeOpacity={0.7}>
                  <View style={styles.themeOptionLeft}>
                    <Icon 
                      name={option.icon} 
                      size={24} 
                      color={isSelected ? colors.primary : colors.textSecondary} 
                    />
                    <CustomText 
                      variant="body" 
                      weight={isSelected ? "semibold" : "normal"}
                      color={isSelected ? colors.primary : colors.text}
                      style={styles.themeOptionText}>
                      {option.label}
                    </CustomText>
                  </View>
                  {isSelected && (
                    <Icon name="check" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowQRModal(false)}>
          <View style={[styles.qrModalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.qrModalHeader, { borderBottomColor: colors.border }]}>
              <CustomText variant="h3" weight="bold" color={colors.text}>
                Mã QR của bạn
              </CustomText>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.qrCodeContainer}>
              <View style={[styles.qrCodeWrapper, { backgroundColor: '#FFFFFF' }]}>
                <QRCode
                  value={getQRCodeContent()}
                  size={250}
                  color={colors.text}
                  backgroundColor="#FFFFFF"
                />
              </View>
              <CustomText 
                variant="body" 
                color={colors.textSecondary} 
                style={styles.qrCodeText}
                align="center">
                {getQRCodeContent()}
              </CustomText>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
  },
  userProfileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
  },
  userProfileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  userAvatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userSubtext: {
    marginTop: 2,
    fontSize: 12,
  },
  userBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    marginLeft: 16,
    fontSize: 16,
  },
  menuItemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  separator: {
    height: 1,
    marginVertical: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  themeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  themeOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  themeOptionText: {
    marginLeft: 16,
    fontSize: 16,
  },
  qrModalContent: {
    marginHorizontal: 20,
    borderRadius: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxWidth: '90%',
    alignSelf: 'center',
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  qrCodeContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  qrCodeWrapper: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrCodeText: {
    marginTop: 12,
    fontSize: 14,
    paddingHorizontal: 20,
  },
});

export default MenuScreen;

