import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {View, ActivityIndicator, StyleSheet} from 'react-native';

// Types
import {RootStackParamList, RootTabParamList, RootNavigatorParamList} from '../types/navigation';

// Components
import CustomTabBar from '../components/CustomTabBar';

// Navigators
import AuthNavigator from './AuthNavigator';

// Contexts
import {useAuth} from '../contexts/AuthContext';
import {navigationRef} from './NavigationService';

// Screens
import HomeScreen from '../screens/HomeScreen';
import FriendsScreen from '../screens/FriendsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import MenuScreen from '../screens/MenuScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import SearchFriendsScreen from '../screens/SearchFriendsScreen';
import FriendRequestsScreen from '../screens/FriendRequestsScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import DetailsScreen from '../screens/DetailsScreen';
import ChatScreen from '../screens/ChatScreen';

const RootStack = createNativeStackNavigator<RootNavigatorParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
      />
      <Stack.Screen
        name="Details"
        component={DetailsScreen}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
      />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
      />
    </Stack.Navigator>
  );
}

function NotificationsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="NotificationsMain"
        component={NotificationsScreen}
      />
    </Stack.Navigator>
  );
}

function MenuStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="MenuMain"
        component={MenuScreen}
      />
    </Stack.Navigator>
  );
}

function FriendsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="FriendsMain"
        component={FriendsScreen}
      />
      <Stack.Screen
        name="SearchFriends"
        component={SearchFriendsScreen}
      />
      <Stack.Screen
        name="FriendRequests"
        component={FriendRequestsScreen}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
      />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tab.Screen 
        name="Home" 
        component={HomeStack}
        options={{
          tabBarLabel: 'Tin nhắn',
          title: 'Tin nhắn',
        }}
      />
      <Tab.Screen 
        name="Friends" 
        component={FriendsStack}
        options={{
          tabBarLabel: 'Bạn bè',
          title: 'Bạn bè',
        }}
      />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsStack}
        options={{
          tabBarLabel: 'Thông báo',
          title: 'Thông báo',
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={MenuStack}
        options={{
          tabBarLabel: 'Menu',
          title: 'Menu',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack}
        options={{
          tabBarLabel: 'Profile',
          title: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

function MainNavigator() {
  return <TabNavigator />;
}

export default function AppNavigator() {
  const {isAuthenticated, isLoading} = useAuth();

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="Main" component={MainNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});

