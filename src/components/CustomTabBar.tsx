import React, { useEffect } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native'
import { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
  SharedValue,
} from 'react-native-reanimated'
import CustomText from './CustomText'
import Icon from './Icon'
import { useTheme } from '../contexts/ThemeContext'
import { useFriendRequest } from '../contexts/FriendRequestContext'
import { useNotification } from '../contexts/NotificationContext'

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity)
const { width: SCREEN_WIDTH } = Dimensions.get('window')

const getIconName = (routeName: string, focused: boolean): string => {
  // Tab Home = màn Tin nhắn
  if (routeName === 'Home') {
    // Dùng icon chat cho tab Tin nhắn
    return focused ? 'chatbubble' : 'chatbubble-outline'
  }

  // Tab Settings = Menu (đã đổi tên)
  if (routeName === 'Settings') {
    return focused ? 'menu' : 'menu-outline'
  }

  const iconMap: { [key: string]: { focused: string; unfocused: string } } = {
    Friends: { focused: 'people', unfocused: 'people-outline' },
    Notifications: { focused: 'notifications', unfocused: 'notifications-outline' },
    Profile: { focused: 'person', unfocused: 'person-outline' },
    Search: { focused: 'search', unfocused: 'search-outline' },
  }

  const iconConfig = iconMap[routeName]
  if (iconConfig) {
    return focused ? iconConfig.focused : iconConfig.unfocused
  }

  return 'ellipse-outline'
}

const TabItem = ({
  route,
  index,
  isFocused,
  options,
  label,
  animatedValue,
  onPress,
  onLongPress,
  badgeCount,
}: {
  route: any
  index: number
  isFocused: boolean
  options: any
  label: string
  animatedValue: SharedValue<number>
  onPress: () => void
  onLongPress: () => void
  badgeCount?: number
}) => {
  const { colors } = useTheme()
  const iconName = getIconName(route.name, isFocused)
  const iconColor = isFocused ? colors.iconActive : colors.icon

  const iconAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      animatedValue.value,
      [0, 1],
      [1, 1.15],
      Extrapolate.CLAMP
    )
    const translateY = interpolate(
      animatedValue.value,
      [0, 1],
      [15, -3],
      Extrapolate.CLAMP
    )

    return {
      transform: [{ scale }, { translateY }],
    }
  })

  const labelAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animatedValue.value,
      [0, 1],
      [0.6, 1],
      Extrapolate.CLAMP
    )
    const translateY = interpolate(
      animatedValue.value,
      [0, 1],
      [5, 0],
      Extrapolate.CLAMP
    )

    return {
      opacity,
      transform: [{ translateY }],
    }
  })

  const indicatorAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      animatedValue.value,
      [0, 1],
      [0, 1],
      Extrapolate.CLAMP
    )
    const opacity = interpolate(
      animatedValue.value,
      [0, 1],
      [0, 1],
      Extrapolate.CLAMP
    )

    return {
      transform: [{ scale }],
      opacity,
    }
  })

  const pressScale = useSharedValue(1)

  const handlePressIn = () => {
    pressScale.value = withSpring(0.9, {
      damping: 10,
      stiffness: 300,
    })
  }

  const handlePressOut = () => {
    pressScale.value = withSpring(1, {
      damping: 10,
      stiffness: 300,
    })
  }

  const pressAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pressScale.value }],
    }
  })

  return (
    <AnimatedTouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarTestID}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.tabItem, pressAnimatedStyle]}
      activeOpacity={1}
    >
      <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
        <Icon name={iconName} size={24} color={iconColor} />
        {badgeCount !== undefined && badgeCount > 0 && (
          <View style={styles.badge}>
            <CustomText variant="caption" weight="bold" color="#FFFFFF" style={styles.badgeText}>
              {badgeCount > 99 ? '99+' : badgeCount}
            </CustomText>
          </View>
        )}
      </Animated.View>
      <Animated.View style={[styles.labelContainer, labelAnimatedStyle]}>
        <CustomText
          variant="caption"
          weight={isFocused ? 'semibold' : 'normal'}
          color={iconColor}
          style={styles.label}
        >
          {label}
        </CustomText>
      </Animated.View>
    </AnimatedTouchableOpacity>
  )
}

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { colors } = useTheme()
  const { friendRequestCount } = useFriendRequest()
  const { unreadCount } = useNotification()
  const animatedValues = state.routes.map(() => useSharedValue(0))
  const translateX = useSharedValue(0)
  const tabCount = state.routes.length
  const tabWidth = SCREEN_WIDTH / tabCount

  // Ẩn hoàn toàn tab bar nếu tab hiện tại set tabBarStyle.display = 'none'
  const focusedRoute = state.routes[state.index]
  const focusedOptions = descriptors[focusedRoute.key]?.options || {}
  const tabBarStyle = focusedOptions.tabBarStyle as any
  const hideTabBar = !!(tabBarStyle && tabBarStyle.display === 'none')

  useEffect(() => {
    state.routes.forEach((route, index) => {
      const isFocused = state.index === index
      animatedValues[index].value = withSpring(isFocused ? 1 : 0, {
        damping: 15,
        stiffness: 150,
        mass: 0.5,
      })
    })

    const targetX = state.index * tabWidth + tabWidth / 2 - 35
    translateX.value = withSpring(targetX, {
      damping: 15,
      stiffness: 150,
      mass: 0.5,
    })
  }, [state.index, tabWidth])

  const activeBackgroundStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    }
  })

  if (hideTabBar) {
    return null
  }

  return (
    <View style={styles.container}>
      <View style={[styles.tabBar, { backgroundColor: '#000000', borderTopColor: '#333333' }]}>
        <Animated.View style={[styles.activeBackground, activeBackgroundStyle, { backgroundColor: '#0B1C2D', borderColor: '#000000' }]} />
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : typeof options.title === 'string'
              ? options.title
              : route.name

          const isFocused = state.index === index

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            })

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name)
            }
          }

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            })
          }

          return (
            <TabItem
              key={route.key}
              route={route}
              index={index}
              isFocused={isFocused}
              options={options}
              label={label}
              animatedValue={animatedValues[index]}
              onPress={onPress}
              onLongPress={onLongPress}
              badgeCount={
                route.name === 'Friends'
                  ? friendRequestCount
                  : route.name === 'Notifications'
                  ? unreadCount
                  : undefined
              }
            />
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabBar: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 60 : 55,
    backgroundColor: '#000000',
    borderTopWidth: 0.5,
    borderTopColor: '#333333',
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    paddingTop: 6,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'relative',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    position: 'relative',
    width: 48,
    height: 48,
  },
  activeBackground: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 10,
    top: -29,
    left: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  labelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    marginTop: 0,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 12,
  },
})

export default CustomTabBar

