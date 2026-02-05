import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import CustomText from '../CustomText';

interface PasswordStrengthIndicatorProps {
  password: string;
}

type StrengthLevel = 'weak' | 'medium' | 'strong' | 'very-strong';

const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const { colors } = useTheme();

  const calculateStrength = (pwd: string): StrengthLevel => {
    if (!pwd) return 'weak';

    let score = 0;

    // Length check
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;

    // Character variety
    if (/[a-z]/.test(pwd)) score += 1; // lowercase
    if (/[A-Z]/.test(pwd)) score += 1; // uppercase
    if (/[0-9]/.test(pwd)) score += 1; // numbers
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1; // special chars

    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    if (score <= 5) return 'strong';
    return 'very-strong';
  };

  const getStrengthInfo = (strength: StrengthLevel) => {
    switch (strength) {
      case 'weak':
        return {
          label: 'Yếu',
          color: colors.error,
          percentage: 25,
        };
      case 'medium':
        return {
          label: 'Trung bình',
          color: '#FF9500',
          percentage: 50,
        };
      case 'strong':
        return {
          label: 'Mạnh',
          color: '#34C759',
          percentage: 75,
        };
      case 'very-strong':
        return {
          label: 'Rất mạnh',
          color: colors.success,
          percentage: 100,
        };
      default:
        return {
          label: 'Yếu',
          color: colors.error,
          percentage: 0,
        };
    }
  };

  if (!password) return null;

  const strength = calculateStrength(password);
  const info = getStrengthInfo(strength);

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <CustomText variant="caption" color={colors.textSecondary}>
          Độ mạnh mật khẩu:
        </CustomText>
        <CustomText variant="caption" color={info.color} weight="semibold" style={styles.label}>
          {info.label}
        </CustomText>
      </View>
      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${info.percentage}%`,
              backgroundColor: info.color,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 4,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    marginLeft: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

export default PasswordStrengthIndicator;

