import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme, type ThemeMode } from '../contexts/ThemeContext';
import CustomText from '../components/CustomText';
import { useNavigation } from '@react-navigation/native';

function ThemeSettingsScreen() {
  const navigation = useNavigation();
  const { colors, themeMode, setThemeMode } = useTheme();

  const themeOptions: { mode: ThemeMode; label: string; icon: string; description: string }[] = [
    {
      mode: 'system',
      label: 'Hệ thống',
      icon: 'phone-android',
      description: 'Theo chế độ của hệ thống',
    },
    {
      mode: 'light',
      label: 'Sáng',
      icon: 'light-mode',
      description: 'Luôn sử dụng chế độ sáng',
    },
    {
      mode: 'dark',
      label: 'Tối',
      icon: 'dark-mode',
      description: 'Luôn sử dụng chế độ tối',
    },
  ];

  const handleSelectTheme = async (mode: ThemeMode) => {
    await setThemeMode(mode);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}>
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <CustomText variant="h2" weight="bold" color={colors.text} style={styles.title}>
            Chế độ hiển thị
          </CustomText>
        </View>

        <View style={styles.optionsContainer}>
          {themeOptions.map((option) => {
            const isSelected = themeMode === option.mode;
            return (
              <TouchableOpacity
                key={option.mode}
                style={[
                  styles.optionItem,
                  {
                    backgroundColor: colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                onPress={() => handleSelectTheme(option.mode)}
                activeOpacity={0.7}>
                <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                  <Icon name={option.icon} size={28} color={colors.primary} />
                </View>
                <View style={styles.optionContent}>
                  <CustomText variant="body" weight="semibold" color={colors.text}>
                    {option.label}
                  </CustomText>
                  <CustomText variant="caption" color={colors.textSecondary} style={styles.description}>
                    {option.description}
                  </CustomText>
                </View>
                {isSelected && (
                  <View style={[styles.checkContainer, { backgroundColor: colors.primary }]}>
                    <Icon name="check" size={20} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    flex: 1,
  },
  optionsContainer: {
    gap: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  description: {
    marginTop: 4,
  },
  checkContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ThemeSettingsScreen;

