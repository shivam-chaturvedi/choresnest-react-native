import React, { useMemo } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";

import { theme } from "../../theme";
import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";
import { AppIcon, AppIconName } from "../ui/AppIcon";
import { X, Trash2, Check, Clock } from "lucide-react-native";


export interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  tone?: string;
  textColor?: string;
  icon?: AppIconName;
  time?: string;
  read?: boolean;
}

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onClearAll?: () => void;
  onMarkAllRead?: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  open,
  onClose,
  notifications,
  onClearAll,
  onMarkAllRead,
}) => {
  const colors = useThemeColors();
  const radius = useThemeRadius();

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Grouping Logic
  const groups = useMemo(() => {
    const today: NotificationItem[] = [];
    const earlier: NotificationItem[] = [];

    notifications.forEach(n => {
      const t = (n.time || "").toLowerCase();
      if (t.includes("hour") || t.includes("min") || t.includes("just") || t.includes("now") || t.includes("sec")) {
        today.push(n);
      } else {
        earlier.push(n);
      }
    });

    return { today, earlier };
  }, [notifications]);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.panel, { backgroundColor: colors.background, borderRadius: radius.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header - Blue Background */}
          <View style={[styles.header, { backgroundColor: colors.primary }]}>
            <View style={styles.headerTop}>
              <View style={[styles.bellCircle, { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.full }]}>
                <AppIcon name="bell" size={24} color={colors.primaryForeground} />
              </View>
              <View style={styles.headerTitles}>
                <Text style={[styles.headerTitle, { color: colors.primaryForeground }]}>Notifications</Text>
                <Text style={[styles.headerSubtitle, { color: colors.primaryForeground }]}>{unreadCount} new updates</Text>
              </View>
              <View style={styles.headerActions}>
                <Pressable onPress={onClearAll} style={{ marginRight: 16 }}>
                  <Trash2 size={20} color={colors.primaryForeground} style={{ opacity: 0.8 }} />
                </Pressable>
                <Pressable onPress={onClose}>
                  <X size={24} color={colors.primaryForeground} />
                </Pressable>
              </View>
            </View>

            <View style={styles.chipsRow}>
              <View style={[styles.chip, { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.full }]}>
                <Text style={[styles.chipText, { color: colors.primaryForeground }]}>{notifications.length} total</Text>
              </View>
              <View style={[styles.chip, { backgroundColor: colors.card, borderRadius: radius.full }]}>
                <Text style={[styles.chipText, { color: colors.primary, fontWeight: '700' }]}>{unreadCount} unread</Text>
              </View>
            </View>
          </View>

          {/* Content */}
          <ScrollView contentContainerStyle={styles.content}>

            {/* Today Section */}
            {groups.today.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>TODAY</Text>
                {groups.today.map(item => (
                  <View key={item.id} style={[styles.card, { backgroundColor: colors.card, borderRadius: radius.lg, shadowColor: colors.shadow }]}>
                    {/* Left Stripe/Indicator if Unread? Or just Left Side color bar? Image has left side color bar? 
                        The prompt said "make notifications bell ui ... like given image". 
                        Actually image 1 has blue bar on left for unread? 
                        Let's verify logic: Unread -> Blue dot on right. 
                        Let's just use the icon circle.
                    */}
                    {/* Left Blue Bar for Unread (Optional but looks nice) */}
                    {!item.read && (
                      <View style={[styles.unreadBar, { backgroundColor: colors.primary, borderTopLeftRadius: radius.lg, borderBottomLeftRadius: radius.lg }]} />
                    )}

                    <View style={styles.cardContent}>
                      <View style={[styles.iconCircle, { backgroundColor: item.tone || colors.muted, borderRadius: radius.full }]}>
                        {item.icon && <AppIcon name={item.icon} size={24} color={item.textColor || colors.foreground} />}
                      </View>

                      <View style={styles.textContainer}>
                        <View style={styles.topRow}>
                          <Text style={[styles.itemTitle, { color: colors.foreground }]}>{item.title}</Text>
                          {!item.read && <View style={[styles.blueDot, { backgroundColor: colors.primary }]} />}
                        </View>
                        <Text style={[styles.itemDetail, { color: colors.mutedForeground }]} numberOfLines={2}>{item.detail}</Text>

                        {item.time && (
                          <View style={[styles.timeBadge, { backgroundColor: colors.muted, borderRadius: radius.sm }]}>
                            <Clock size={12} color={colors.mutedForeground} style={{ marginRight: 4 }} />
                            <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{item.time}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Earlier Section */}
            {groups.earlier.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>EARLIER</Text>
                {groups.earlier.map(item => (
                  <View key={item.id} style={[styles.card, { backgroundColor: item.read ? colors.card + '80' : colors.card, borderRadius: radius.lg, shadowColor: colors.shadow }]}>
                    {!item.read && (
                      <View style={[styles.unreadBar, { backgroundColor: colors.primary, borderTopLeftRadius: radius.lg, borderBottomLeftRadius: radius.lg }]} />
                    )}
                    <View style={styles.cardContent}>
                      <View style={[styles.iconCircle, { backgroundColor: item.tone || colors.muted, borderRadius: radius.full }]}>
                        {item.icon && <AppIcon name={item.icon} size={24} color={item.textColor || colors.foreground} />}
                      </View>

                      <View style={styles.textContainer}>
                        <View style={styles.topRow}>
                          <Text style={[styles.itemTitle, { color: colors.foreground }]}>{item.title}</Text>
                          {!item.read && <View style={[styles.blueDot, { backgroundColor: colors.primary }]} />}
                        </View>
                        <Text style={[styles.itemDetail, { color: colors.mutedForeground }]} numberOfLines={2}>{item.detail}</Text>
                        {item.time && (
                          <View style={[styles.timeBadge, { backgroundColor: colors.muted, borderRadius: radius.sm }]}>
                            <Clock size={12} color={colors.mutedForeground} style={{ marginRight: 4 }} />
                            <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{item.time}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: 80 }} />
          </ScrollView>

          {/* Footer - Mark all as read */}
          <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <Pressable style={styles.markReadBtn} onPress={onMarkAllRead}>
              <Check size={18} color={colors.mutedForeground} style={{ marginRight: 8 }} />
              <Text style={[styles.markReadText, { color: colors.mutedForeground }]}>Mark all as read</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  panel: {
    width: "100%",
    height: "100%",
    maxWidth: 400,
    maxHeight: 700,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
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
    paddingLeft: 12, // adjust for bar
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
    alignSelf: 'flex-start', // Fit content
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
  }
});
