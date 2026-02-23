import React from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { StyleProp, ViewStyle } from 'react-native';

export type IconLibrary = 'MaterialCommunityIcons' | 'MaterialIcons' | 'FontAwesome5' | 'Ionicons';

const LIBRARY_MAP: Record<IconLibrary, React.ComponentType<any>> = {
  MaterialCommunityIcons,
  MaterialIcons,
  FontAwesome5,
  Ionicons,
};

interface CategoryIconProps {
  icon: string;
  library?: IconLibrary;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ icon, library = 'MaterialCommunityIcons', size = 18, color, style }) => {
  const IconComponent = LIBRARY_MAP[library] || MaterialCommunityIcons;
  return <IconComponent name={icon} size={size} color={color} style={style} />;
};
