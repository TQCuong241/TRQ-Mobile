import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import CustomText from './CustomText';
import Icon from './Icon';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: AlertButton[];
  onClose?: () => void;
  type?: 'success' | 'error' | 'info' | 'warning';
}

const CustomAlert = ({
  visible,
  title,
  message,
  buttons = [{ text: 'OK' }],
  onClose,
  type = 'info',
}: CustomAlertProps) => {
  const { colors } = useTheme();
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const getIconName = () => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      default:
        return 'information-circle';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return '#4CAF50'; // Tươi sáng hơn
      case 'error':
        return '#F44336'; // Đỏ tươi
      case 'warning':
        return '#FF9800'; // Cam tươi
      default:
        return '#2196F3'; // Xanh dương tươi
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#E8F5E9'; // Xanh lá nhạt
      case 'error':
        return '#FFEBEE'; // Đỏ nhạt
      case 'warning':
        return '#FFF3E0'; // Cam nhạt
      default:
        return '#E3F2FD'; // Xanh dương nhạt
    }
  };

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    if (onClose) {
      onClose();
    }
  };

  const getButtonStyle = (buttonStyle?: string) => {
    if (buttonStyle === 'destructive') {
      return { backgroundColor: '#F44336' }; // Đỏ tươi
    }
    if (buttonStyle === 'cancel') {
      return { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0' };
    }
    return { backgroundColor: '#2196F3' }; // Xanh dương tươi
  };

  const getButtonTextColor = (buttonStyle?: string) => {
    if (buttonStyle === 'cancel') {
      return '#424242'; // Xám đậm
    }
    return '#FFFFFF';
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modal,
                {
                  backgroundColor: '#FFFFFF',
                },
                modalStyle,
              ]}>
              {/* Icon */}
              <View style={styles.iconContainer}>
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: getBackgroundColor(),
                    },
                  ]}>
                  <Icon name={getIconName()} size={48} color={getIconColor()} />
                </View>
              </View>

              {/* Title */}
              <CustomText variant="h3" weight="bold" color="#212121" style={styles.title}>
                {title}
              </CustomText>

              {/* Message */}
              <CustomText variant="body" color="#757575" style={styles.message}>
                {message}
              </CustomText>

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                {buttons.map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      getButtonStyle(button.style),
                      buttons.length > 1 && styles.buttonMultiple,
                    ]}
                    onPress={() => handleButtonPress(button)}
                    activeOpacity={0.8}>
                    <CustomText
                      variant="body"
                      weight="semibold"
                      color={getButtonTextColor(button.style)}>
                      {button.text}
                    </CustomText>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonMultiple: {
    flex: 1,
  },
});

export default CustomAlert;

