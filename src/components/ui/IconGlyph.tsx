import React from 'react';
import { Text, StyleProp, ViewStyle } from 'react-native';
import { CategoryIcon } from './CategoryIcon';

const VECTOR_ICON_PATTERN = /^[a-zA-Z0-9_-]+$/;

export interface IconGlyphProps {
  icon: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export const IconGlyph: React.FC<IconGlyphProps> = ({ icon, size = 18, color, style }) => {
  if (VECTOR_ICON_PATTERN.test(icon)) {
    return <CategoryIcon icon={icon} size={size} color={color} style={style} />;
  }
  return <Text style={[{ fontSize: size }, style as any]}>{icon}</Text>;
};
