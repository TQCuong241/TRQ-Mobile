import React from 'react'
import { Text, TextProps, StyleSheet } from 'react-native'

type CustomTextProps = TextProps & {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label'
  weight?: 'normal' | 'medium' | 'semibold' | 'bold'
  color?: string
  align?: 'left' | 'center' | 'right'
}

const CustomText = ({
  variant = 'body',
  weight = 'normal',
  color,
  align = 'left',
  style,
  children,
  ...props
}: CustomTextProps) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'h1':
        return styles.h1
      case 'h2':
        return styles.h2
      case 'h3':
        return styles.h3
      case 'body':
        return styles.body
      case 'caption':
        return styles.caption
      case 'label':
        return styles.label
      default:
        return styles.body
    }
  }

  const getWeightStyle = () => {
    switch (weight) {
      case 'normal':
        return styles.normal
      case 'medium':
        return styles.medium
      case 'semibold':
        return styles.semibold
      case 'bold':
        return styles.bold
      default:
        return styles.normal
    }
  }

  return (
    <Text
      style={[
        getVariantStyle(),
        getWeightStyle(),
        { color: color || '#000', textAlign: align },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  )
}

const styles = StyleSheet.create({
  h1: {
    fontSize: 32,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
  },
  normal: {
    fontWeight: '400',
  },
  medium: {
    fontWeight: '500',
  },
  semibold: {
    fontWeight: '600',
  },
  bold: {
    fontWeight: '700',
  },
})

export default CustomText

