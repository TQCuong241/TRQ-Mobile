import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Keyboard, TextInput, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Container from '../../components/auth/Container';
import Button from '../../components/auth/Button';
import StepIndicator from '../../components/auth/StepIndicator';
import CustomText from '../../components/CustomText';
import Icon from '../../components/Icon';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { AuthStackParamList } from '../../types/navigation';
import { authService } from '../../services';
import { useAlert } from '../../hooks/useAlert';

type OTPVerificationScreenRouteProp = RouteProp<AuthStackParamList, 'OTPVerification'>;
type OTPVerificationScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'OTPVerification'>;

const OTPVerificationScreen = () => {
  const navigation = useNavigation<OTPVerificationScreenNavigationProp>();
  const route = useRoute<OTPVerificationScreenRouteProp>();
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const { login } = useAuth();

  const email = route.params?.email || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60); // Bắt đầu với 60s
  const [isVerified, setIsVerified] = useState(false); // Trạng thái đã verify thành công
  const [isError, setIsError] = useState(false); // Trạng thái OTP sai

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Countdown timer - bắt đầu ngay khi vào màn hình
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Tự động verify khi nhập đủ 6 ký tự
  useEffect(() => {
    const otpCode = otp.join('');
    if (otpCode.length === 6 && !loading && !isVerified && !isError) {
      // Delay nhỏ để đảm bảo state đã update
      const timer = setTimeout(() => {
        handleVerify();
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp.join(''), loading, isVerified, isError]);

  // Tự động navigate sau 1.5s khi verify thành công
  useEffect(() => {
    if (isVerified) {
      const timer = setTimeout(() => {
        // Token đã được lưu, AppNavigator sẽ tự động switch sang Main app
        // Không cần navigate thủ công
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isVerified]);

  const handleOTPChange = (value: string, index: number) => {
    // Reset error state khi user bắt đầu nhập lại
    if (isError) {
      setIsError(false);
    }

    if (value.length > 1) {
      // Paste nhiều ký tự (chữ + số)
      const chars = value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
      const newOtp = [...otp];
      chars.split('').forEach((char, i) => {
        if (index + i < 6) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);
      // Focus vào ô cuối cùng đã nhập
      const nextIndex = Math.min(index + chars.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      // Nhập từng ký tự (chữ + số)
      const char = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (char) {
        const newOtp = [...otp];
        newOtp[index] = char;
        setOtp(newOtp);

        // Tự động focus ô tiếp theo
        if (index < 5) {
          inputRefs.current[index + 1]?.focus();
        }
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    Keyboard.dismiss();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      return;
    }

    setLoading(true);
    setIsError(false); // Reset error state
    setIsVerified(false); // Reset verified state trước khi verify
    try {
      const response = await authService.verifyLoginOTP({
        email,
        otp: otpCode,
      });

      if (response.success && response.data) {
        // Đánh dấu verified TRƯỚC khi lưu token để UI update ngay
        setIsVerified(true);
        setLoading(false);
        
        // Lưu token vào storage
        const authData = response.data;
        if (authData.token && authData.refreshToken) {
          await login(authData.token, authData.refreshToken, authData.user);
        }
        
        // Không hiển thị alert, chỉ chuyển màu xanh và tự động navigate
      } else {
        setLoading(false);
        setIsVerified(false);
        setIsError(true); // Đánh dấu OTP sai
        // Clear OTP on error và focus lại ô đầu tiên sau 1s
        setTimeout(() => {
          setOtp(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
        }, 1000);
      }
    } catch (error: any) {
      setLoading(false);
      setIsVerified(false);
      setIsError(true); // Đánh dấu OTP sai
      // Clear OTP on error và focus lại ô đầu tiên sau 1s
      setTimeout(() => {
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }, 1000);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;

    setResendLoading(true);
    try {
      const password = route.params?.password || '';
      if (!password) {
        showAlert('Lỗi', 'Không thể gửi lại OTP. Vui lòng đăng nhập lại.', [{ text: 'OK' }], 'error');
        setResendLoading(false);
        return;
      }

      const response = await authService.sendLoginOTP({ email, password });
      if (response.success) {
        setCountdown(60); // 60 seconds countdown
        showAlert('Thành công', 'OTP đã được gửi lại đến email của bạn', [{ text: 'OK' }], 'success');
      } else {
        showAlert('Lỗi', response.message || 'Không thể gửi lại OTP', [{ text: 'OK' }], 'error');
      }
    } catch (error: any) {
      showAlert('Lỗi', error.message || 'Có lỗi xảy ra', [{ text: 'OK' }], 'error');
    } finally {
      setResendLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <Container scrollable={false} safeArea>
      <View style={styles.content}>
        {/* Step Indicator */}
        <View style={styles.stepIndicatorContainer}>
          <StepIndicator currentStep={2} totalSteps={2} stepLabels={['Đăng nhập', 'Xác thực OTP']} />
        </View>

        {/* Back Button */}
        <View style={styles.backButtonContainer}>
          <TouchableOpacity
            onPress={handleBack}
            style={[styles.backButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
            activeOpacity={0.7}>
            <Icon name="arrow-back" size={18} color={colors.text} />
            <CustomText variant="body" color={colors.text} weight="semibold" style={styles.backButtonText}>
              Quay lại
            </CustomText>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.formContainer}>
          <CustomText variant="h2" weight="bold" color={colors.text} style={styles.title}>
            Nhập mã OTP
          </CustomText>
          <CustomText variant="body" color={colors.textSecondary} style={styles.description}>
            Chúng tôi đã gửi mã OTP đến email {email}
          </CustomText>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[
                  styles.otpInput,
                  {
                    borderColor: isVerified
                      ? '#4CAF50' // Xanh lá tươi khi verified
                      : isError
                        ? colors.error
                        : digit
                          ? colors.primary
                          : colors.border,
                    backgroundColor: isVerified
                      ? '#E8F5E9' // Xanh lá nhạt khi verified
                      : isError
                        ? colors.error + '20'
                        : colors.inputBackground,
                    borderWidth: isVerified ? 2 : 1.5,
                    color: isVerified ? '#2E7D32' : colors.text, // Màu chữ xanh đậm khi verified
                  },
                ]}
                value={digit}
                onChangeText={(value) => handleOTPChange(value, index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                keyboardType="default"
                autoCapitalize="characters"
                maxLength={1}
                selectTextOnFocus
                autoFocus={index === 0 && !isVerified && !isError}
                editable={!isVerified && !loading}
              />
            ))}
          </View>

          {/* Resend OTP */}
          {!isVerified && (
            <View style={styles.resendContainer}>
              <CustomText variant="body" color={colors.textSecondary}>
                Không nhận được mã?{' '}
              </CustomText>
              {countdown > 0 ? (
                <CustomText variant="body" color={colors.primary} weight="semibold">
                  Gửi lại sau {countdown}s
                </CustomText>
              ) : (
                <TouchableOpacity onPress={handleResendOTP} disabled={resendLoading} activeOpacity={0.7}>
                  <CustomText variant="body" color={colors.primary} weight="semibold">
                    Gửi lại
                  </CustomText>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Success message */}
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
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 16,
    marginBottom: 24,
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
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginBottom: 32,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
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
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#34C75920',
  },
  successText: {
    marginLeft: 8,
  },
  bottomActions: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  bottomButton: {
    width: '100%',
  },
});

export default OTPVerificationScreen;

