export type RootStackParamList = {
  HomeMain: undefined;
  Details: undefined;
  Chat: {
    conversationId: string;
    title?: string;
    avatarUrl?: string | null;
  };
  ProfileMain: undefined;
  EditProfile: undefined;
  MenuMain: undefined;
  ThemeSettings: undefined;
  FriendsMain: undefined;
  SearchFriends: undefined;
  FriendRequests: undefined;
  UserProfile: { userId: string };
  NotificationsMain: undefined;
};

export type RootTabParamList = {
  Home: undefined;
  Friends: undefined;
  Notifications: undefined;
  Settings: undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  OTPVerification: { email: string; password?: string } | undefined;
};

export type RootNavigatorParamList = {
  Auth: undefined;
  Main: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

