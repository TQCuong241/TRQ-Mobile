import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Keyboard, ScrollView, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Container from '../../components/auth/Container';
import Input from '../../components/auth/Input';
import Button from '../../components/auth/Button';
import StepIndicator from '../../components/auth/StepIndicator';
import PasswordStrengthIndicator from '../../components/auth/PasswordStrengthIndicator';
import CustomText from '../../components/CustomText';
import Icon from '../../components/Icon';
import { useTheme } from '../../contexts/ThemeContext';
import { AuthStackParamList } from '../../types/navigation';
import { authService } from '../../services';
import { useAlert } from '../../hooks/useAlert';

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const RegisterScreen = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const [currentStep, setCurrentStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'forward' | 'backward' | null>(null);
  
  // Animation values cho transition
  const slideX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const totalSteps = 3;
  const stepLabels = ['Thông tin', 'Email', 'Mật khẩu'];

  const validateStep1 = () => {
    const newErrors: { name?: string } = {};
    if (!name.trim()) {
      newErrors.name = 'Vui lòng nhập họ và tên';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Họ và tên phải có ít nhất 2 ký tự';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = async () => {
    const newErrors: { email?: string } = {};
    if (!email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
      setErrors(newErrors);
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email không hợp lệ';
      setErrors(newErrors);
      return false;
    }

    // Check email đã tồn tại chưa
    setCheckingEmail(true);
    try {
      const response = await authService.checkEmail(email);
      if (response.success && response.data?.exists) {
        newErrors.email = 'Email này đã được sử dụng. Vui lòng sử dụng email khác.';
        setErrors(newErrors);
        setCheckingEmail(false);
        return false;
      }
      setCheckingEmail(false);
      return true;
    } catch (error: any) {
      newErrors.email = error.message || 'Có lỗi xảy ra khi kiểm tra email';
      setErrors(newErrors);
      setCheckingEmail(false);
      return false;
    }
  };

  const validateStep3 = () => {
    const newErrors: {
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!password.trim()) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu không khớp';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const goToStep = (step: number, direction: 'forward' | 'backward') => {
    setAnimationDirection(direction);
    setCurrentStep(step);
    setErrors({});
  };

  // Trigger animation when step changes
  useEffect(() => {
    if (animationDirection) {
      if (animationDirection === 'forward') {
        // Moving forward: slide in from right
        slideX.value = 50; // Set initial value
        slideX.value = withSpring(0, { 
          damping: 15, 
          stiffness: 200,
        });
      } else {
        // Moving backward: slide in from left
        slideX.value = -50; // Set initial value
        slideX.value = withSpring(0, { 
          damping: 15, 
          stiffness: 200,
        });
      }
      opacity.value = withTiming(1, { duration: 300 });
      setAnimationDirection(null);
    }
  }, [currentStep, animationDirection]);

  const handleNext = async () => {
    Keyboard.dismiss();
    if (currentStep === 1) {
      if (validateStep1()) {
        // Animation: slide out left
        slideX.value = withTiming(-50, { duration: 200 });
        opacity.value = withTiming(0, { duration: 200 }, (finished) => {
          if (finished) {
            runOnJS(goToStep)(2, 'forward');
          }
        });
      }
    } else if (currentStep === 2) {
      const isValid = await validateStep2();
      if (isValid) {
        // Animation: slide out left
        slideX.value = withTiming(-50, { duration: 200 });
        opacity.value = withTiming(0, { duration: 200 }, (finished) => {
          if (finished) {
            runOnJS(goToStep)(3, 'forward');
          }
        });
      }
    }
  };

  const handleBack = () => {
    Keyboard.dismiss();
    if (currentStep > 1) {
      // Animation: slide out right
      slideX.value = withTiming(50, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) {
          runOnJS(goToStep)(currentStep - 1, 'backward');
        }
      });
    }
  };

  // Reset animation khi step thay đổi từ bên ngoài
  useEffect(() => {
    // Reset về vị trí ban đầu khi step thay đổi
    slideX.value = withTiming(0, { duration: 0 });
    opacity.value = withTiming(1, { duration: 0 });
  }, [currentStep]);

  const handleRegister = async () => {
    Keyboard.dismiss();
    if (!validateStep3()) return;

    setLoading(true);
    try {
      const response = await authService.register({
        email,
        password,
        confirmPassword,
        displayName: name,
      });

      if (response.success) {
        setLoading(false);
        showAlert(
          'Đăng ký thành công',
          'Vui lòng kiểm tra email để xác thực tài khoản của bạn.',
          [
            {
              text: 'Đăng nhập',
              onPress: () => navigation.navigate('Login'),
            },
            {
              text: 'OK',
              style: 'cancel',
              onPress: () => navigation.navigate('Login'),
            },
          ],
          'success'
        );
      } else {
        setLoading(false);
        showAlert(
          'Lỗi',
          response.message || 'Đăng ký thất bại. Vui lòng thử lại.',
          [{ text: 'OK' }],
          'error'
        );
      }
    } catch (error: any) {
      setLoading(false);
      showAlert(
        'Lỗi',
        error.message || 'Có lỗi xảy ra. Vui lòng thử lại.',
        [{ text: 'OK' }],
        'error'
      );
    }
  };

  const animatedContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
    opacity: opacity.value,
  }));

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <CustomText variant="h2" weight="bold" color={colors.text} style={styles.stepTitle}>
              Thông tin cá nhân
            </CustomText>
            <CustomText variant="body" color={colors.textSecondary} style={styles.stepDescription}>
              Vui lòng nhập họ và tên của bạn
            </CustomText>
            <Input
              label="Họ và tên"
              placeholder="Nhập họ và tên"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors({ ...errors, name: undefined });
              }}
              error={errors.name}
              leftIcon="person-outline"
              autoCapitalize="words"
            />
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <CustomText variant="h2" weight="bold" color={colors.text} style={styles.stepTitle}>
              Địa chỉ email
            </CustomText>
            <CustomText variant="body" color={colors.textSecondary} style={styles.stepDescription}>
              Vui lòng nhập email của bạn
            </CustomText>
            <Input
              label="Email"
              placeholder="Nhập email của bạn"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              error={errors.email}
              leftIcon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <CustomText variant="h2" weight="bold" color={colors.text} style={styles.stepTitle}>
              Tạo mật khẩu
            </CustomText>
            <CustomText variant="body" color={colors.textSecondary} style={styles.stepDescription}>
              Nhập mật khẩu cho tài khoản của bạn
            </CustomText>
            <Input
              label="Mật khẩu"
              placeholder="Nhập mật khẩu"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              error={errors.password}
              leftIcon="lock-closed-outline"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {password && <PasswordStrengthIndicator password={password} />}
            <Input
              label="Xác nhận mật khẩu"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
              }}
              error={errors.confirmPassword}
              leftIcon="lock-closed-outline"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Container scrollable={false} safeArea>
      <View style={styles.content}>
        {/* Step Indicator */}
        <View style={styles.stepIndicatorContainer}>
          <StepIndicator currentStep={currentStep} totalSteps={totalSteps} stepLabels={stepLabels} />
        </View>

        {/* Form Content - Scrollable với Animation */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.formContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.animatedContent, animatedContentStyle]}>
            {/* Nút Quay lại - gần form content */}
            {currentStep > 1 && (
              <View style={styles.backButtonContainer}>
                <TouchableOpacity
                  onPress={handleBack}
                  style={[styles.backButton, { 
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  }]}
                  activeOpacity={0.7}>
                  <Icon name="arrow-back" size={18} color={colors.text} />
                  <CustomText variant="body" color={colors.text} weight="semibold" style={styles.backButtonText}>
                    Quay lại
                  </CustomText>
                </TouchableOpacity>
              </View>
            )}
            {renderStepContent()}
          </Animated.View>
        </ScrollView>

        {/* Footer với link đăng nhập */}
        {currentStep === 1 && (
          <View style={styles.footer}>
            <CustomText variant="body" color={colors.textSecondary}>
              Đã có tài khoản?{' '}
            </CustomText>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
              <CustomText variant="body" color={colors.primary} weight="semibold">
                Đăng nhập
              </CustomText>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Action Button */}
        <View style={[styles.bottomActions, { backgroundColor: colors.background }]}>
          {currentStep < 3 ? (
            <Button
              title={checkingEmail ? 'Đang kiểm tra...' : 'Tiếp theo'}
              rightIcon="arrow-forward"
              onPress={handleNext}
              loading={checkingEmail}
              disabled={checkingEmail}
              style={styles.bottomButton}
            />
          ) : (
            <Button
              title="Đăng ký"
              onPress={handleRegister}
              loading={loading}
              style={styles.bottomButton}
            />
          )}
        </View>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  stepIndicatorContainer: {
    marginTop: 30,
  },
  backButtonContainer: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 16,
    marginBottom: 38,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
    minWidth: 120,
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
  backButtonText: {
    marginLeft: 6,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  animatedContent: {
    width: '100%',
  },
  stepContent: {
    width: '100%',
  },
  stepTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    textAlign: 'center',
    marginBottom: 32,
  },
  bottomActions: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  bottomButton: {
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
});

export default RegisterScreen;
