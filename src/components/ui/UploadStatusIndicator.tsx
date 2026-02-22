import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';

type UploadStatusIndicatorProps = {
  uploadStatus?: string | null;
  style?: StyleProp<ViewStyle>;
};

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  success: {
    backgroundColor: '#4CAF50',
  },
  pending: {
    backgroundColor: '#F5A623',
  },
  uploading: {
    backgroundColor: '#4A90E2',
  },
  failed: {
    backgroundColor: '#F44336',
  },
});

const statusStyleMap: Record<string, ViewStyle> = {
  pending_upload: styles.pending,
  uploading: styles.uploading,
  failed: styles.failed,
  uploaded: styles.success,
};

const UploadStatusIndicator: React.FC<UploadStatusIndicatorProps> = ({ uploadStatus, style }) => {
  if (!uploadStatus) {
    return null;
  }
  const indicatorStyle = statusStyleMap[uploadStatus];
  if (!indicatorStyle) {
    return null;
  }
  return <View style={[styles.dot, indicatorStyle, style]} />;
};

export default React.memo(UploadStatusIndicator);
