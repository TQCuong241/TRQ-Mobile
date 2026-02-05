import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useConnection } from '../contexts/ConnectionContext';
import CustomText from './CustomText';
import Icon from './Icon';

const ConnectionBanner = () => {
  const { isServerOnline } = useConnection();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(isServerOnline ? -100 : 0);
  const opacity = useSharedValue(isServerOnline ? 0 : 1);

  React.useEffect(() => {
    if (isServerOnline) {
      translateY.value = withTiming(-100, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
    } else {
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });
    }
  }, [isServerOnline]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  if (isServerOnline) return null;

  return (
    <Animated.View style={[styles.banner, { paddingTop: insets.top + 6 }, animatedStyle]}>
      <View style={styles.content}>
        <Icon name="warning" size={16} color="#FFFFFF" />
        <CustomText variant="body" weight="semibold" color="#FFFFFF" style={styles.text}>
          Mất kết nối
        </CustomText>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(244, 67, 54, 0.85)',
    paddingVertical: 2,
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  text: {
    fontSize: 12,
  },
});

export default ConnectionBanner;

