import React from 'react';
import { Text } from 'react-native';
import { CategoryIcon } from './CategoryIcon';

const VECTOR_ICON_PATTERN = /^[a-zA-Z0-9_-]+$/;

export interface IconGlyphProps {
  icon: string;
  size?: number;
  color?: string;
}

export const IconGlyph: React.FC<IconGlyphProps> = ({ icon, size = 18, color }) => {
  if (VECTOR_ICON_PATTERN.test(icon)) {
    return <CategoryIcon icon={icon} size={size} color={color} />;
  }
  return <Text style={{ fontSize: size }}>{icon}</Text>;
};
