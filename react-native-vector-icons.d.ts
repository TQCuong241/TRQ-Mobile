declare module 'react-native-vector-icons/Ionicons' {
  import { Component } from 'react';
  import { ViewStyle, TextStyle } from 'react-native';

  export interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: ViewStyle | TextStyle;
  }

  export default class Ionicons extends Component<IconProps> {}
}

declare module 'react-native-vector-icons/MaterialIcons' {
  import { Component } from 'react';
  import { ViewStyle, TextStyle } from 'react-native';

  export interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: ViewStyle | TextStyle;
  }

  export default class MaterialIcons extends Component<IconProps> {}
}

