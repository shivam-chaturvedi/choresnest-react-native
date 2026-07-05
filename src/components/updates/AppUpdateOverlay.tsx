import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useThemeColors, useThemeRadius } from '../../contexts/ThemeContext';
import { AppIcon } from '../ui';
import type { AppUpdateState } from '../../services/AppUpdateService';

type AppUpdateOverlayProps = {
  state: AppUpdateState;
  onStartUpdate: () => void;
  onInstallUpdate: () => void;
  onDismiss: () => void;
  onRetry: () => void;
};

const formatPercent = (value: number) =>
  `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;

export const AppUpdateOverlay: React.FC<AppUpdateOverlayProps> = ({
  state,
  onStartUpdate,
  onInstallUpdate,
  onDismiss,
  onRetry,
}) => {
  const colors = useThemeColors();
  const radius = useThemeRadius();

  const visible = useMemo(
    () =>
      state.phase === 'available' ||
      state.phase === 'downloading' ||
      state.phase === 'ready' ||
      state.phase === 'installing' ||
      state.phase === 'error',
    [state.phase],
  );

  if (!visible) {
    return null;
  }

  const isBusy =
    state.phase === 'downloading' || state.phase === 'installing';
  const showProgress =
    state.phase === 'downloading' ||
    state.phase === 'ready' ||
    state.phase === 'installing';

  const title = (() => {
    switch (state.phase) {
      case 'available':
        return 'Update available';
      case 'downloading':
        return 'Downloading update';
      case 'ready':
        return 'Update ready to install';
      case 'installing':
        return 'Installing update';
      case 'error':
        return 'Update interrupted';
      default:
        return 'App update';
    }
  })();

  const subtitle = (() => {
    const current = state.currentVersion ? `v${state.currentVersion}` : 'your version';
    const next = state.storeVersion ? `v${state.storeVersion}` : 'the latest version';

    switch (state.phase) {
      case 'available':
        return `A newer release (${next}) is available. You're on ${current}.`;
      case 'downloading':
        return 'Keep the app open while we download the latest improvements.';
      case 'ready':
        return 'Download complete. Install now to finish updating without leaving the app.';
      case 'installing':
        return 'Applying the update now. The app will restart automatically.';
      case 'error':
        return state.errorMessage || 'Something went wrong while updating.';
      default:
        return '';
    }
  })();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={isBusy ? undefined : onDismiss}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radius.xl,
            },
          ]}
        >
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: colors.primary + '18',
                borderRadius: radius.full,
              },
            ]}
          >
            {state.phase === 'installing' || state.phase === 'downloading' ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <AppIcon name="download" size={24} color={colors.primary} />
            )}
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {subtitle}
          </Text>

          {showProgress && (
            <View style={styles.progressBlock}>
              <View
                style={[
                  styles.progressTrack,
                  {
                    backgroundColor: colors.muted,
                    borderRadius: radius.full,
                  },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.max(state.progress * 100, state.phase === 'downloading' ? 4 : 100)}%`,
                      backgroundColor: colors.primary,
                      borderRadius: radius.full,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressLabel, { color: colors.foreground }]}>
                {state.phase === 'installing'
                  ? 'Installing…'
                  : state.phase === 'ready'
                    ? '100% downloaded'
                    : formatPercent(state.progress)}
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            {state.phase === 'available' && (
              <>
                <Pressable
                  style={[
                    styles.secondaryButton,
                    {
                      backgroundColor: colors.muted,
                      borderRadius: radius.lg,
                    },
                  ]}
                  onPress={onDismiss}
                >
                  <Text style={[styles.secondaryText, { color: colors.foreground }]}>
                    Later
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: colors.primary,
                      borderRadius: radius.lg,
                    },
                  ]}
                  onPress={onStartUpdate}
                >
                  <Text
                    style={[
                      styles.primaryText,
                      { color: colors.primaryForeground },
                    ]}
                  >
                    Update now
                  </Text>
                </Pressable>
              </>
            )}

            {state.phase === 'ready' && (
              <Pressable
                style={[
                  styles.primaryButton,
                  styles.fullWidthButton,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: radius.lg,
                  },
                ]}
                onPress={onInstallUpdate}
              >
                <Text
                  style={[
                    styles.primaryText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  Install & restart
                </Text>
              </Pressable>
            )}

            {state.phase === 'error' && (
              <>
                <Pressable
                  style={[
                    styles.secondaryButton,
                    {
                      backgroundColor: colors.muted,
                      borderRadius: radius.lg,
                    },
                  ]}
                  onPress={onDismiss}
                >
                  <Text style={[styles.secondaryText, { color: colors.foreground }]}>
                    Not now
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: colors.primary,
                      borderRadius: radius.lg,
                    },
                  ]}
                  onPress={onRetry}
                >
                  <Text
                    style={[
                      styles.primaryText,
                      { color: colors.primaryForeground },
                    ]}
                  >
                    Retry
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 24,
    gap: 14,
  },
  iconBadge: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  progressBlock: {
    gap: 8,
    marginTop: 4,
  },
  progressTrack: {
    height: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  fullWidthButton: {
    flex: 0,
    width: '100%',
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
