import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Container from '../../components/auth/Container';
import Input from '../../components/auth/Input';
import Button from '../../components/auth/Button';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../contexts/ThemeContext';
import { AuthStackParamList } from '../../types/navigation';
import { authService } from '../../services';
import { useAlert } from '../../hooks/useAlert';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!password.trim()) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await authService.sendLoginOTP({
        email,
        password,
      });

      if (response.success) {
        setLoading(false);
        // Navigate to OTP verification screen
        navigation.navigate('OTPVerification', { email, password });
      } else {
        setLoading(false);
        showAlert('Lỗi', response.message || 'Đăng nhập thất bại. Vui lòng thử lại.', [{ text: 'OK' }], 'error');
      }
    } catch (error: any) {
      setLoading(false);
      showAlert('Lỗi', error.message || 'Có lỗi xảy ra. Vui lòng thử lại.', [{ text: 'OK' }], 'error');
    }
  };

  return (
    <Container scrollable safeArea>
      <View style={styles.content}>
        <View style={styles.header}>
          <CustomText variant="h1" weight="bold" color={colors.text} style={styles.title}>
            Chào mừng trở lại
          </CustomText>
          <CustomText variant="body" color={colors.textSecondary} style={styles.subtitle}>
            Đăng nhập để tiếp tục
          </CustomText>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            placeholder="Nhập email của bạn"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            leftIcon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Input
            label="Mật khẩu"
            placeholder="Nhập mật khẩu"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            leftIcon="lock-closed-outline"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => console.log('Forgot password')}
            activeOpacity={0.7}>
            <CustomText variant="caption" color={colors.primary} weight="medium">
              Quên mật khẩu?
            </CustomText>
          </TouchableOpacity>

          <Button title="Đăng nhập" onPress={handleLogin} loading={loading} style={styles.loginButton} />

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <CustomText variant="caption" color={colors.textSecondary} style={styles.dividerText}>
              hoặc
            </CustomText>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.footer}>
            <CustomText variant="body" color={colors.textSecondary}>
              Chưa có tài khoản?{' '}
            </CustomText>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.7}>
              <CustomText variant="body" color={colors.primary} weight="semibold">
                Đăng ký ngay
              </CustomText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -8,
  },
  loginButton: {
    marginBottom: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoginScreen;

