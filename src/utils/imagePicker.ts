/**
 * Image Picker Helper
 * Helper function để chọn ảnh từ thư viện hoặc camera
 * 
 * Lưu ý: Cần cài đặt react-native-image-picker:
 * npm install react-native-image-picker
 * 
 * Hoặc với Expo:
 * npx expo install expo-image-picker
 */

import { Platform, Alert } from 'react-native';

export interface ImagePickerResult {
  uri: string;
  type: string;
  name: string;
}

/**
 * Chọn ảnh từ thư viện hoặc camera
 * @param source - 'library' | 'camera'
 */
export const pickImage = async (source: 'library' | 'camera'): Promise<ImagePickerResult | null> => {
  try {
    // Kiểm tra xem có react-native-image-picker không
    let ImagePicker: any;
    try {
      ImagePicker = require('react-native-image-picker');
    } catch (error) {
      // Nếu không có, thử expo-image-picker
      try {
        const expoImagePicker = await import('expo-image-picker');
        return await pickImageWithExpo(expoImagePicker, source);
      } catch (expoError) {
        Alert.alert(
          'Thông báo',
          'Cần cài đặt react-native-image-picker hoặc expo-image-picker để sử dụng chức năng này.\n\nChạy lệnh:\nnpm install react-native-image-picker',
          [{ text: 'OK' }]
        );
        return null;
      }
    }

    return new Promise((resolve) => {
      const options: any = {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
        includeBase64: false,
      };

      if (source === 'camera') {
        ImagePicker.launchCamera(options, (response: any) => {
          if (response.didCancel || response.errorMessage) {
            resolve(null);
          } else if (response.assets && response.assets[0]) {
            const asset = response.assets[0];
            resolve({
              uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
              type: asset.type || 'image/jpeg',
              name: asset.fileName || `image_${Date.now()}.jpg`,
            });
          } else {
            resolve(null);
          }
        });
      } else {
        ImagePicker.launchImageLibrary(options, (response: any) => {
          if (response.didCancel || response.errorMessage) {
            resolve(null);
          } else if (response.assets && response.assets[0]) {
            const asset = response.assets[0];
            resolve({
              uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
              type: asset.type || 'image/jpeg',
              name: asset.fileName || `image_${Date.now()}.jpg`,
            });
          } else {
            resolve(null);
          }
        });
      }
    });
  } catch (error) {
    console.error('Error picking image:', error);
    return null;
  }
};

/**
 * Chọn nhiều ảnh từ thư viện
 */
export const pickMultipleImages = async (maxCount: number = 10): Promise<ImagePickerResult[]> => {
  try {
    let ImagePicker: any;
    try {
      ImagePicker = require('react-native-image-picker');
    } catch (error) {
      try {
        const expoImagePicker = await import('expo-image-picker');
        return await pickMultipleImagesWithExpo(expoImagePicker, maxCount);
      } catch (expoError) {
        Alert.alert(
          'Thông báo',
          'Cần cài đặt react-native-image-picker hoặc expo-image-picker để sử dụng chức năng này.',
          [{ text: 'OK' }]
        );
        return [];
      }
    }

    return new Promise((resolve) => {
      const options: any = {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
        includeBase64: false,
        selectionLimit: maxCount,
      };

      ImagePicker.launchImageLibrary(options, (response: any) => {
        if (response.didCancel || response.errorMessage) {
          resolve([]);
        } else if (response.assets && response.assets.length > 0) {
          const images = response.assets.map((asset: any, index: number) => ({
            uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
            type: asset.type || 'image/jpeg',
            name: asset.fileName || `image_${Date.now()}_${index}.jpg`,
          }));
          resolve(images);
        } else {
          resolve([]);
        }
      });
    });
  } catch (error) {
    console.error('Error picking multiple images:', error);
    return [];
  }
};

/**
 * Chọn nhiều ảnh với Expo Image Picker
 */
const pickMultipleImagesWithExpo = async (
  expoImagePicker: any,
  maxCount: number
): Promise<ImagePickerResult[]> => {
  try {
    const { status } = await expoImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Thông báo', 'Cần quyền truy cập thư viện ảnh!');
      return [];
    }

    const result = await expoImagePicker.launchImageLibraryAsync({
      mediaTypes: expoImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024,
      selectionLimit: maxCount,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return [];
    }

    return result.assets.map((asset: any, index: number) => {
      const uri = asset.uri;
      const filename = uri.split('/').pop() || `image_${Date.now()}_${index}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      return {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        type,
        name: filename,
      };
    });
  } catch (error) {
    console.error('Error picking multiple images with Expo:', error);
    return [];
  }
};

/**
 * Chọn ảnh với Expo Image Picker
 */
const pickImageWithExpo = async (
  expoImagePicker: any,
  source: 'library' | 'camera'
): Promise<ImagePickerResult | null> => {
  try {
    // Request permission
    if (source === 'camera') {
      const { status } = await expoImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Thông báo', 'Cần quyền truy cập camera!');
        return null;
      }
    } else {
      const { status } = await expoImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Thông báo', 'Cần quyền truy cập thư viện ảnh!');
        return null;
      }
    }

    // Chọn ảnh
    const result =
      source === 'camera'
        ? await expoImagePicker.launchCameraAsync({
            mediaTypes: expoImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            maxWidth: 1024,
            maxHeight: 1024,
          })
        : await expoImagePicker.launchImageLibraryAsync({
            mediaTypes: expoImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            maxWidth: 1024,
            maxHeight: 1024,
          });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const uri = asset.uri;
    const filename = uri.split('/').pop() || `image_${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    return {
      uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
      type,
      name: filename,
    };
  } catch (error) {
    console.error('Error picking image with Expo:', error);
    return null;
  }
};

