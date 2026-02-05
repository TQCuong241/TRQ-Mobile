import React, { useEffect } from 'react';
import { TouchableOpacity, TouchableOpacityProps, StyleSheet, ActivityIndicator, View, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import CustomText from '../CustomText';
import Icon from '../Icon';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: string;
  rightIcon?: string;
}

const Button = ({
  title,
  variant = 'primary',
  loading = false,
  fullWidth = true,
  leftIcon,
  rightIcon,
  disabled,
  style,
  ...props
}: ButtonProps) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const iconTranslateX = useSharedValue(0);
  const iconOpacity = useSharedValue(1);

  useEffect(() => {
    if (rightIcon) {
      // Animation khi component mount - icon slide in từ bên phải
      iconTranslateX.value = -10;
      iconOpacity.value = 0;
      iconTranslateX.value = withSpring(0, {
        damping: 15,
        stiffness: 200,
      });
      iconOpacity.value = withTiming(1, { duration: 400 });
    }
  }, [rightIcon]);

  const handlePressIn = () => {
    scale.value = withSpring(0.96, {
      damping: 15,
      stiffness: 300,
    });
    if (rightIcon) {
      // Icon slide sang phải khi nhấn
      iconTranslateX.value = withSpring(6, {
        damping: 12,
        stiffness: 400,
      });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });
    if (rightIcon) {
      // Icon quay về vị trí ban đầu
      iconTranslateX.value = withSpring(0, {
        damping: 15,
        stiffness: 300,
      });
    }
  };

  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: disabled ? colors.border : colors.primary,
        };
      case 'secondary':
        return {
          backgroundColor: colors.surface,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.primary,
        };
      default:
        return {
          backgroundColor: colors.primary,
        };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'secondary':
        return colors.text;
      case 'outline':
        return colors.primary;
      default:
        return '#FFFFFF';
    }
  };

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: iconTranslateX.value }],
      opacity: iconOpacity.value,
    };
  });

  return (
    <AnimatedTouchableOpacity
      style={[
        styles.button,
        getButtonStyle(),
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        animatedButtonStyle,
        style,
      ]}
      disabled={disabled || loading}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      {...props}>
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <View style={styles.content}>
          {leftIcon && <Icon name={leftIcon} size={20} color={getTextColor()} style={styles.leftIcon} />}
          <CustomText variant="body" weight="semibold" color={getTextColor()}>
            {title}
          </CustomText>
          {rightIcon && (
            <Animated.View style={[styles.rightIconContainer, animatedIconStyle]}>
              <Icon name={rightIcon} size={20} color={getTextColor()} />
            </Animated.View>
          )}
        </View>
      )}
    </AnimatedTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
  rightIconContainer: {
    marginLeft: 8,
  },
});

export default Button;

