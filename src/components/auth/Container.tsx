import React, { ReactNode } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ContainerProps {
  children: ReactNode;
  scrollable?: boolean;
  safeArea?: boolean;
}

const Container = ({ children, scrollable = false, safeArea = true }: ContainerProps) => {
  const { colors } = useTheme();

  const content = (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      {scrollable ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={styles.content}>{children}</View>
      )}
    </KeyboardAvoidingView>
  );

  if (safeArea) {
    return <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>{content}</SafeAreaView>;
  }

  return content;
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
});

export default Container;

