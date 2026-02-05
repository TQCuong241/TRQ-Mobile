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

interface MessageBannerProps {
  visible: boolean;
  title: string;
  body: string;
  onPress?: () => void;
  onHide: () => void;
}

const MessageBanner: React.FC<MessageBannerProps> = ({
  visible,
  title,
  body,
  onPress,
  onHide,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  const hideBanner = () => {
    translateY.value = withTiming(-120, { duration: 250 });
    opacity.value = withTiming(0, { duration: 200 });
    onHide();
  };

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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
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
          <Icon name="chatbubble" size={18} color="#FFFFFF" />
          <View style={styles.textContainer}>
            <CustomText
              variant="caption"
              weight="semibold"
              color="#FFFFFF"
              style={styles.label}>
              {title || 'Tin nhắn mới'}
            </CustomText>
            <CustomText
              variant="body"
              weight="normal"
              color="#FFFFFF"
              numberOfLines={2}>
              {body}
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
    backgroundColor: 'rgba(25, 118, 210, 0.96)',
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
    opacity: 0.9,
    marginBottom: 2,
  },
  right: {
    marginLeft: 8,
  },
});

export default MessageBanner;


