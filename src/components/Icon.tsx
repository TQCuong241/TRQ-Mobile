import React from 'react'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { ViewStyle } from 'react-native'

type IconProps = {
  name: string
  size?: number
  color?: string
  style?: ViewStyle
}

const Icon = ({ name, size = 24, color = '#000', style }: IconProps) => {
  return <Ionicons name={name} size={size} color={color} style={style} />
}

export default Icon

