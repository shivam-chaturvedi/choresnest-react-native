import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
  Linking,
  AppState,
} from 'react-native';

import {
  useThemeColors,
  useThemeRadius,
  useTheme,
} from '../../contexts/ThemeContext';
import { AppIcon } from '../ui/AppIcon';
import { X, Trash2, Check, Clock, Bell } from 'lucide-react-native';
import { AppNotification } from '../../services/NotificationCenter';
import { NotificationScheduler } from '../../services/NotificationScheduler';
import {
  checkPermission,
  requestPermission,
  resetPermissionPrompt,
} from '../../utils/permissions';

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onClearAll?: () => void;
  onMarkAllRead?: () => void;
  onNotificationPress?: (notification: AppNotification) => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  open,
  onClose,
  notifications,
  onClearAll,
  onMarkAllRead,
  onNotificationPress,
}) => {
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const { appearanceMode } = useTheme();
  const isMidnight = appearanceMode === 'midnight';
  const notificationIconColor = isMidnight ? '#0F172A' : colors.primary;
  const notificationCardTitleColor = isMidnight ? '#0F172A' : colors.foreground;
  const notificationCardBodyColor = isMidnight
    ? '#1F2937'
    : colors.mutedForeground;
  const unreadChipColor = isMidnight
    ? colors.primaryForeground
    : colors.primary;

  const unreadCount = notifications.filter(n => !n.read).length;
  const [exactAlarmEnabled, setExactAlarmEnabled] = useState(
    NotificationScheduler.isExactAlarmEnabled(),
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState<
    boolean | null
  >(null);

  const refreshExactAlarmStatus = useCallback(
    async (signal: { current: boolean }) => {
      try {
        const enabled = await NotificationScheduler.ensureExactAlarm(false);
        if (signal.current) {
          setExactAlarmEnabled(enabled);
        }
      } catch (error) {
        console.error('NotificationPanel: Failed to refresh exact alarm status', error);
        if (signal.current) {
          setExactAlarmEnabled(NotificationScheduler.isExactAlarmEnabled());
        }
      }
    },
    [],
  );

  useEffect(() => {
    const signal = { current: true };
    refreshExactAlarmStatus(signal);

    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') {
        refreshExactAlarmStatus(signal);
      }
    });

    return () => {
      signal.current = false;
      subscription.remove();
    };
  }, [refreshExactAlarmStatus]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const signal = { current: true };
    refreshExactAlarmStatus(signal);
    return () => {
      signal.current = false;
    };
  }, [open, refreshExactAlarmStatus]);

  const handleEnableExactAlarm = async () => {
    const enabled = await NotificationScheduler.ensureExactAlarm(true);
    setExactAlarmEnabled(enabled);
  };

  const handleEnableNotifications = async () => {
    await resetPermissionPrompt('notification');
    const granted = await requestPermission('notification', {
      showSettingsPrompt: false,
    });
    setNotificationsEnabled(granted);
    Linking.openSettings().catch(err => {
      console.error(
        'Failed to open settings after enabling notifications:',
        err,
      );
    });
  };

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void checkPermission('notification').then(granted => {
        if (active) setNotificationsEnabled(granted);
      });
    };
    refresh();
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') {
        refresh();
      }
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const groups = useMemo(() => {
    const today: AppNotification[] = [];
    const earlier: AppNotification[] = [];

    notifications.forEach(n => {
      const t = (n.time || '').toLowerCase();
      if (
        t.includes('hour') ||
        t.includes('min') ||
        t.includes('just') ||
        t.includes('now') ||
        t.includes('sec')
      ) {
        today.push(n);
      } else {
        earlier.push(n);
      }
    });

    return { today, earlier };
  }, [notifications]);

  const sections = useMemo(() => {
    const list: { title: string; data: AppNotification[]; id: string }[] = [];
    if (groups.today.length > 0)
      list.push({ title: 'TODAY', data: groups.today, id: 'today' });
    if (groups.earlier.length > 0)
      list.push({ title: 'EARLIER', data: groups.earlier, id: 'earlier' });
    return list;
  }, [groups]);

  const renderCard = (item: AppNotification) => (
    <Pressable
      onPress={() => onNotificationPress?.(item)}
      android_ripple={{ color: colors.secondary }}
      style={({ pressed }) => [
        {
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: item.read ? colors.card + '80' : colors.card,
            borderRadius: radius.lg,
            shadowColor: colors.shadow,
          },
        ]}
      >
        {!item.read && (
          <View
            style={[
              styles.unreadBar,
              {
                backgroundColor: colors.primary,
                borderTopLeftRadius: radius.lg,
                borderBottomLeftRadius: radius.lg,
              },
            ]}
          />
        )}
        <View style={styles.cardContent}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: item.tone || colors.muted,
                borderRadius: radius.full,
              },
            ]}
          >
            {item.icon && (
              <AppIcon
                name={item.icon}
                size={24}
                color={item.textColor || colors.foreground}
              />
            )}
          </View>

          <View style={styles.textContainer}>
            <View style={styles.topRow}>
              <Text style={[styles.itemTitle, { color: colors.foreground }]}>
                {item.title}
              </Text>
              {!item.read && (
                <View
                  style={[styles.blueDot, { backgroundColor: colors.primary }]}
                />
              )}
            </View>
            <Text
              style={[styles.itemDetail, { color: colors.mutedForeground }]}
              numberOfLines={2}
            >
              {item.detail}
            </Text>

            {item.time && (
              <View
                style={[
                  styles.timeBadge,
                  { backgroundColor: colors.muted, borderRadius: radius.sm },
                ]}
              >
                <Clock
                  size={12}
                  color={colors.mutedForeground}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[styles.timeText, { color: colors.mutedForeground }]}
                >
                  {item.time}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.panel,
            { backgroundColor: colors.background, borderRadius: radius.card },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header - Blue Background */}
          <View style={[styles.header, { backgroundColor: colors.primary }]}>
            <View style={styles.headerTop}>
              <View
                style={[
                  styles.bellCircle,
                  {
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderRadius: radius.full,
                  },
                ]}
              >
                <AppIcon
                  name="bell"
                  size={24}
                  color={colors.primaryForeground}
                />
              </View>
              <View style={styles.headerTitles}>
                <Text
                  style={[
                    styles.headerTitle,
                    { color: colors.primaryForeground },
                  ]}
                >
                  Notifications
                </Text>
                <Text
                  style={[
                    styles.headerSubtitle,
                    { color: colors.primaryForeground },
                  ]}
                >
                  {unreadCount} new updates
                </Text>
              </View>
              <View style={styles.headerActions}>
                <Pressable onPress={onClearAll} style={{ marginRight: 16 }}>
                  <Trash2
                    size={20}
                    color={colors.primaryForeground}
                    style={{ opacity: 0.8 }}
                  />
                </Pressable>
                <Pressable onPress={onClose}>
                  <X size={24} color={colors.primaryForeground} />
                </Pressable>
              </View>
            </View>

            <View style={styles.chipsRow}>
              <View
                style={[
                  styles.chip,
                  {
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderRadius: radius.full,
                  },
                ]}
              >
                <Text
                  style={[styles.chipText, { color: colors.primaryForeground }]}
                >
                  {notifications.length} total
                </Text>
              </View>
              <View
                style={[
                  styles.chip,
                  { backgroundColor: colors.card, borderRadius: radius.full },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: unreadChipColor, fontWeight: '700' },
                  ]}
                >
                  {unreadCount} unread
                </Text>
              </View>
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <SectionList
              sections={sections}
              keyExtractor={item => item.id}
              renderSectionHeader={({ section }) => (
                <Text
                  style={[
                    styles.sectionHeader,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {section.title}
                </Text>
              )}
              renderItem={({ item }) => renderCard(item)}
              ListEmptyComponent={() => (
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                  <Text
                    style={[
                      styles.emptyText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    No notifications yet.
                  </Text>
                </View>
              )}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={[styles.content, { paddingBottom: 24 }]}
              style={styles.sectionList}
              stickySectionHeadersEnabled
              ListFooterComponent={<View style={{ height: 24 }} />}
              ListHeaderComponent={() => {
                const hasExactAlarmWarning = !exactAlarmEnabled;
                const hasNotificationsWarning = notificationsEnabled === false;
                if (!hasExactAlarmWarning && !hasNotificationsWarning) {
                  return null;
                }
                return (
                  <View style={{ marginBottom: 12 }}>
                    {hasExactAlarmWarning && (
                      <View
                        style={[
                          styles.permissionRow,
                          { borderColor: colors.border },
                        ]}
                      >
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <Text
                            style={[
                              styles.permissionTitle,
                              { color: colors.foreground },
                            ]}
                          >
                            Exact alarm disabled
                          </Text>
                          <Text
                            style={[
                              styles.permissionBody,
                              { color: colors.mutedForeground },
                            ]}
                          >
                            Android 13+/14+ requires Exact Alarm rights so
                            reminders can fire on time.
                          </Text>
                        </View>
                        <Pressable
                          style={[
                            styles.permissionButton,
                            {
                              borderRadius: radius.full,
                              borderColor: colors.primary,
                            },
                          ]}
                          onPress={handleEnableExactAlarm}
                        >
                          <Text
                            style={[
                              styles.permissionButtonText,
                              { color: colors.primary },
                            ]}
                          >
                            Enable
                          </Text>
                        </Pressable>
                      </View>
                    )}
                    {hasNotificationsWarning && (
                      <View
                        style={[
                          styles.notificationCard,
                          { borderColor: colors.border },
                        ]}
                      >
                        <View style={styles.notificationCardHeader}>
                          <Bell size={20} color={notificationIconColor} />
                          <Text
                            style={[
                              styles.notificationCardTitle,
                              { color: notificationCardTitleColor },
                            ]}
                          >
                            Notifications disabled
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.notificationCardBody,
                            { color: notificationCardBodyColor },
                          ]}
                        >
                          Enable system notifications so reminders and alerts
                          can reach you.
                        </Text>
                        <Pressable
                          style={[
                            styles.notificationCardButton,
                            { borderRadius: radius.full },
                          ]}
                          onPress={handleEnableNotifications}
                        >
                          <Text
                            style={[
                              styles.notificationCardButtonText,
                              { color: '#fff' },
                            ]}
                          >
                            Enable Notifications
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              }}
            />
          </View>

          {/* Footer - Mark all as read */}
          <View
            style={[
              styles.footer,
              { backgroundColor: colors.card, borderTopColor: colors.border },
            ]}
          >
            <Pressable style={styles.markReadBtn} onPress={onMarkAllRead}>
              <Check
                size={18}
                color={colors.mutedForeground}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[styles.markReadText, { color: colors.mutedForeground }]}
              >
                Mark all as read
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  panel: {
    width: '100%',
    height: '100%',
    maxWidth: 400,
    maxHeight: 700,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  bellCircle: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.9,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 1,
  },
  card: {
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadBar: {
    width: 6,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    paddingLeft: 12,
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  blueDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  itemDetail: {
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 20,
  },
  timeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  markReadText: {
    fontSize: 16,
    fontWeight: '600',
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  permissionBody: {
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 220,
  },
  permissionButton: {
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  permissionButtonText: {
    fontWeight: '600',
  },
  notificationCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FFF7ED',
    marginVertical: 12,
    gap: 8,
  },
  notificationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  notificationCardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  notificationCardBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  notificationCardButton: {
    backgroundColor: '#F97316',
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  notificationCardButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionList: {
    flex: 1,
  },
});
