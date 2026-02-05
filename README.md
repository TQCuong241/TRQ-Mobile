# TRQ Mobile App

React Native CLI app với Navigation, Reanimated và Vector Icons.

## Tính năng

- ✅ React Navigation (Stack & Bottom Tabs)
- ✅ React Native Reanimated 3
- ✅ React Native Vector Icons
- ✅ TypeScript
- ✅ Safe Area Context

## Cài đặt

### Yêu cầu

- Node.js >= 20
- React Native CLI
- Android Studio (cho Android)
- Xcode (cho iOS - chỉ trên macOS)

### Bước 1: Cài đặt dependencies

```bash
cd TRQMobileApp
npm install
```

### Bước 2: Cài đặt fonts cho Vector Icons

Sau khi cài đặt dependencies, chạy lệnh sau để link fonts:

```bash
npx react-native-asset
```

Hoặc thủ công:

**Android:**
- Copy fonts từ `node_modules/react-native-vector-icons/Fonts/` 
- Đến `android/app/src/main/assets/fonts/`

**iOS:**
- Thêm fonts vào `ios/TRQMobileApp/Info.plist` trong key `UIAppFonts`

### Bước 3: Chạy ứng dụng

**Android:**
```bash
npm run android
```

**iOS:**
```bash
cd ios
pod install
cd ..
npm run ios
```

## Cấu trúc dự án

```
TRQMobileApp/
├── src/
│   ├── navigation/
│   │   └── AppNavigator.tsx    # Navigation configuration
│   └── screens/
│       ├── HomeScreen.tsx       # Home screen với Reanimated
│       ├── DetailsScreen.tsx   # Details screen với animations
│       └── ProfileScreen.tsx   # Profile screen
├── App.tsx                      # Root component
├── index.js                     # Entry point
└── babel.config.js              # Babel config với Reanimated plugin
```

## Sử dụng

### Navigation

App sử dụng React Navigation với:
- **Stack Navigator**: Điều hướng giữa các màn hình
- **Bottom Tab Navigator**: Tab bar ở dưới cùng

### Reanimated

Reanimated được cấu hình sẵn trong `babel.config.js`. Sử dụng các hooks như:
- `useSharedValue`
- `useAnimatedStyle`
- `withSpring`, `withTiming`, `withRepeat`

### Icons

Sử dụng Material Icons từ react-native-vector-icons:

```tsx
import Icon from 'react-native-vector-icons/MaterialIcons';

<Icon name="home" size={24} color="#007AFF" />
```

Các icon families khác có sẵn:
- MaterialIcons
- FontAwesome
- Ionicons
- và nhiều hơn nữa...

## Scripts

- `npm start` - Khởi động Metro bundler
- `npm run android` - Chạy trên Android
- `npm run ios` - Chạy trên iOS
- `npm test` - Chạy tests
- `npm run lint` - Kiểm tra code style

## Lưu ý

1. **Reanimated**: Plugin đã được thêm vào `babel.config.js`. Đảm bảo plugin này là plugin cuối cùng trong danh sách.

2. **Gesture Handler**: Import `react-native-gesture-handler` ở đầu file `index.js` (đã được thêm).

3. **Vector Icons**: Nếu icons không hiển thị, chạy lại `npx react-native-asset` hoặc kiểm tra fonts đã được copy đúng chưa.

## Tài liệu tham khảo

- [React Navigation](https://reactnavigation.org/)
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [React Native Vector Icons](https://github.com/oblador/react-native-vector-icons)
# TRQ-Mobile
