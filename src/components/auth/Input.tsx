import React, { useState, useEffect } from 'react';
import { View, TextInput, TextInputProps, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import CustomText from '../CustomText';
import Icon from '../Icon';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  secureTextEntry?: boolean;
}

const Input = ({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  secureTextEntry = false,
  value,
  placeholder,
  ...props
}: InputProps) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const showPasswordToggle = secureTextEntry;
  const displaySecureTextEntry = secureTextEntry && !isPasswordVisible;

  // Floating label animation values
  const labelPosition = useSharedValue(0);
  const labelScale = useSharedValue(1);
  const labelOpacity = useSharedValue(0.6);

  // Xác định khi nào label nên float lên
  const hasValue = value && value.length > 0;
  const shouldFloat = isFocused || hasValue;

  useEffect(() => {
    if (shouldFloat) {
      // Label trôi lên phía trên input (từ giữa input lên -32px để nằm hoàn toàn trên border với khoảng trống)
      labelPosition.value = withTiming(-32, {
        duration: 250,
      });
      labelScale.value = withTiming(0.85, {
        duration: 250,
      });
      labelOpacity.value = withTiming(1, { duration: 250 });
    } else {
      // Label trôi xuống về giữa input với transition mượt
      labelPosition.value = withTiming(0, {
        duration: 250,
      });
      labelScale.value = withTiming(1, {
        duration: 250,
      });
      labelOpacity.value = withTiming(0.6, { duration: 250 });
    }
  }, [shouldFloat]);

  const animatedLabelStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: labelPosition.value },
        { scale: labelScale.value },
      ],
      opacity: labelOpacity.value,
    };
  });

  // Sử dụng label hoặc placeholder làm floating label
  const floatingLabelText = label || placeholder || '';

  return (
    <View style={styles.container}>
      {/* Container bên ngoài để chừa không gian cho label */}
      <View style={styles.outerContainer}>
        {/* Floating Label - đóng vai trò như placeholder khi không float, nằm trên input khi float */}
        {floatingLabelText && (
          <Animated.View
            style={[
              styles.floatingLabel,
              {
                left: leftIcon ? 48 : 16, // Căn trái cùng trục với nội dung input
                backgroundColor: 'transparent', // Luôn transparent để tự nhiên
              },
              animatedLabelStyle,
            ]}>
            <CustomText
              variant={shouldFloat ? 'caption' : 'body'}
              weight="medium"
              color={isFocused && shouldFloat ? colors.primary : colors.inputPlaceholder}
              style={styles.labelText}>
              {floatingLabelText}
            </CustomText>
          </Animated.View>
        )}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.inputBackground,
              borderColor: error ? colors.error : isFocused ? colors.primary : colors.inputBorder,
              borderWidth: 1,
              marginTop: floatingLabelText && shouldFloat ? 8 : 0, // Khoảng trống giữa label và input khi float
            },
          ]}>
          {leftIcon && (
            <View style={styles.leftIconContainer}>
              <Icon name={leftIcon} size={20} color={colors.textSecondary} />
            </View>
          )}
          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.inputText,
                  paddingLeft: leftIcon ? 0 : 16,
                  paddingRight: rightIcon || showPasswordToggle ? 0 : 16,
                  paddingTop: floatingLabelText ? 16 : 14,
                  paddingBottom: floatingLabelText ? 16 : 14,
                },
              ]}
              placeholderTextColor="transparent" // Ẩn placeholder vì dùng floating label
              placeholder="" // Không dùng placeholder
              secureTextEntry={displaySecureTextEntry}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              value={value}
              {...props}
            />
          </View>
          {showPasswordToggle && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
              activeOpacity={0.7}>
              <Icon name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          {rightIcon && !showPasswordToggle && (
            <TouchableOpacity style={styles.iconButton} onPress={onRightIconPress} activeOpacity={0.7}>
              <Icon name={rightIcon} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {error && (
        <CustomText variant="caption" color={colors.error} style={styles.errorText}>
          {error}
        </CustomText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  outerContainer: {
    position: 'relative',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    minHeight: 52,
    position: 'relative',
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  floatingLabel: {
    position: 'absolute',
    top: '50%', // Bắt đầu từ giữa input
    marginTop: -10, // Để label nằm giữa khi không float
    zIndex: 1,
    pointerEvents: 'none',
    paddingHorizontal: 4, // Padding để label không sát viền
    justifyContent: 'center',
    alignSelf: 'flex-start', // Căn trái để cùng trục với nội dung input
  },
  labelText: {
    fontSize: 17, // Tăng thêm 3px so với body (16px) = 19px
  },
  leftIconContainer: {
    paddingLeft: 16,
    paddingRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  iconButton: {
    padding: 12,
  },
  errorText: {
    marginTop: 4,
  },
});

export default Input;

