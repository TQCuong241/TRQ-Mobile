import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import CustomText from './CustomText';
import Icon from './Icon';
import { openNotificationFromPush } from '../navigation/NavigationService';

interface FriendRequestBannerProps {
  visible: boolean;
  senderName: string;
  onHide: () => void;
}

const FriendRequestBanner: React.FC<FriendRequestBannerProps> = ({
  visible,
  senderName,
  onHide,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
      opacity.value = withTiming(1, { duration: 200 });

      // Auto hide sau 5s
      const timer = setTimeout(() => {
        hideBanner();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      hideBanner();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const hideBanner = () => {
    translateY.value = withTiming(-120, { duration: 250 });
    opacity.value = withTiming(0, { duration: 200 });
    onHide();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  const handlePress = () => {
    // Điều hướng tới màn Friend Requests trong tab Friends (dùng NavigationService)
    openNotificationFromPush({
      source: 'friend_request_banner',
    });
    hideBanner();
  };

  return (
    <Animated.View
      style={[
        styles.banner,
        { paddingTop: insets.top + 6 },
        animatedStyle,
      ]}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.touchArea}
        onPress={handlePress}>
        <View style={styles.left}>
          <Icon name="person-add" size={18} color="#FFFFFF" />
          <View style={styles.textContainer}>
            <CustomText
              variant="caption"
              weight="semibold"
              color="#FFFFFF"
              style={styles.label}>
              Lời mời kết bạn mới
            </CustomText>
            <CustomText variant="body" weight="semibold" color="#FFFFFF">
              {senderName}
            </CustomText>
          </View>
        </View>
        <View style={styles.right}>
          <CustomText variant="caption" weight="semibold" color="#BBDEFB">
            Xem
          </CustomText>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(33, 150, 243, 0.95)',
    paddingHorizontal: 12,
    zIndex: 9999,
  },
  touchArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    opacity: 0.85,
  },
  right: {
    marginLeft: 8,
  },
});

export default FriendRequestBanner;


