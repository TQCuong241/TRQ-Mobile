import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CustomText from './CustomText';
import { useTheme } from '../contexts/ThemeContext';

interface ImagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectFromLibrary: () => void;
  onTakePhoto: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
  title?: string;
}

function ImagePickerModal({
  visible,
  onClose,
  onSelectFromLibrary,
  onTakePhoto,
  onDelete,
  showDelete = false,
  title = 'Chọn ảnh',
}: ImagePickerModalProps) {
  const { colors } = useTheme();

  const options = [
    {
      icon: 'photo-library',
      label: 'Chọn từ thư viện',
      onPress: () => {
        onClose();
        onSelectFromLibrary();
      },
      color: colors.primary,
    },
    {
      icon: 'camera-alt',
      label: 'Chụp ảnh',
      onPress: () => {
        onClose();
        onTakePhoto();
      },
      color: colors.primary,
    },
  ];

  if (showDelete && onDelete) {
    options.push({
      icon: 'delete',
      label: 'Xóa',
      onPress: () => {
        onClose();
        onDelete();
      },
      color: '#FF3B30',
    });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
              <View style={styles.header}>
                <CustomText variant="h3" weight="bold" color={colors.text}>
                  {title}
                </CustomText>
                <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                  <Icon name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsContainer}>
                {options.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.option,
                      {
                        backgroundColor: colors.surface,
                        borderBottomColor: colors.border,
                        borderBottomWidth: index < options.length - 1 ? 1 : 0,
                      },
                    ]}
                    onPress={option.onPress}
                    activeOpacity={0.7}>
                    <View style={[styles.iconContainer, { backgroundColor: option.color + '15' }]}>
                      <Icon name={option.icon} size={28} color={option.color} />
                    </View>
                    <CustomText variant="body" weight="medium" color={colors.text} style={styles.optionLabel}>
                      {option.label}
                    </CustomText>
                    <Icon name="chevron-right" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.surface }]}
                onPress={onClose}
                activeOpacity={0.7}>
                <CustomText variant="body" weight="semibold" color={colors.text}>
                  Hủy
                </CustomText>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  optionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLabel: {
    flex: 1,
  },
  cancelButton: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ImagePickerModal;

