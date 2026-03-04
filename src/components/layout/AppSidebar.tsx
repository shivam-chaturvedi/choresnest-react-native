import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
  useWindowDimensions,
  TouchableWithoutFeedback,
  Alert,
  Linking,
  AppState,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { theme } from "../../theme";
import { useFamily, FamilyMember } from "../../contexts/FamilyContext";
import { useAuth } from "../../contexts/AuthContext";
import { PROFILE_COLORS, ProfileColor } from "../../constants/profileColors";
import { MemberIcon } from "../../components/ui/MemberIcon";
import { DEFAULT_MEMBER_ICON } from "../../constants/memberIcons";
import { checkPermission, requestPermission, resetPermissionPrompt } from "../../utils/permissions";
import Config from "react-native-config";

const ENABLE_RECIPE_AND_MEALS = Config.ENABLE_RECIPE_AND_MEALS !== 'false';
import {
  Settings,
  FileText,
  DollarSign,
  Shield,
  HelpCircle,
  Check,
  ChevronRight,
  ChevronDown,
  User,
  X,
  Utensils,
  Calendar,
  ClipboardList,
  StickyNote,
  Users,
  Palette,
  LogOut,
  Bell,
} from "lucide-react-native";

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
  onNavigate?: (route: string) => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  open,
  onClose,
  onNavigate,
}) => {
  const { width } = useWindowDimensions();
  const sidebarWidth = Math.min(width * 0.85, 360);
  const [mounted, setMounted] = useState(open);
  const openRef = useRef(open); // Track latest open state
  const translateX = useRef(new Animated.Value(open ? 0 : -sidebarWidth)).current;
  const overlayOpacity = useRef(new Animated.Value(open ? 1 : 0)).current;

  // Dropdown state for profile switcher
  const [isProfilesOpen, setIsProfilesOpen] = useState(false);

  // Color Picker State
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean | null>(null);

  const navigation = useNavigation<NavigationProp<Record<string, undefined>>>();
  const { members, activeMember, setActiveMember, familyName, updateMemberColor } = useFamily();
  const { logout, isGuest, user } = useAuth();

  useEffect(() => {
    openRef.current = open;
    if (open) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -sidebarWidth,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Only unmount if we are still closed
        if (!openRef.current) {
          setMounted(false);
        }
      });
    }
  }, [open, sidebarWidth, translateX, overlayOpacity]);

  useEffect(() => {
    let cancelled = false;
    const refreshPermission = async () => {
      const granted = await checkPermission('notification');
      if (!cancelled) {
        setNotificationsEnabled(granted);
      }
    };
    void refreshPermission();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void refreshPermission();
      }
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  const handleNavigate = (route: string) => {
    try {
      if (onNavigate) {
        onNavigate(route);
      } else {
        // Helper to handle nested navigation from Root -> MainTabs -> Tab -> Stack
        const navigateToNested = (tabName: string, stackScreenName?: string) => {
          // We must navigate to 'MainTabs' first because AppSidebar is at Root level
          navigation.navigate('MainTabs', {
            screen: tabName,
            params: stackScreenName ? { screen: stackScreenName } : undefined,
          } as any);
        };

        switch (route) {
          // More Stack
          case 'Theme':
          case 'Privacy':
          case 'Help':
          case 'Notifications':
          case 'Export':
          case 'DataExport':
          case 'Tasks':
            navigateToNested('more', route);
            break;

          // Home Stack
          case 'Recipes':
          case 'MealPlan':
          case 'Family':
          case 'Vault':
          case 'Expenses':
          case 'Notes':
          case 'Nutrition':
            navigateToNested('home', route);
            break;

          // Tabs
          case 'lists':
          case 'calendar':
            navigateToNested(route);
            break;

          // Direct Routes (if any at root, e.g. Auth, but sidebar is usually auth-only)
          default:
            // If it's none of the above, it might be a root screen or we default to MainTabs->home?
            // But actually 'lists' and 'calendar' are tabs. 
            // If we just have a route name that matches a tab, we go there.
            navigateToNested(route);
        }
      }
    } catch (error) {
      console.error("Navigation error in sidebar:", error);
    }
    onClose();
  };

  const handleLogout = async () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
              onClose();
              // Navigation replacement happens automatically via AppNavigator auth state
            } catch (error) {
              console.error("Logout failed", error);
            }
          }
        }
      ]
    );
  };

  const handleEnableNotifications = async () => {
    await resetPermissionPrompt("notification");
    const granted = await requestPermission("notification", { showSettingsPrompt: false });
    setNotificationsEnabled(granted);
    Linking.openSettings().catch((err) => {
      console.error("Failed to open settings after enabling notifications:", err);
    });
  };

  const handleSwitchMember = (member: FamilyMember) => {
    try {
      setActiveMember(member);
      setIsProfilesOpen(false); // Close dropdown after selection
    } catch (error) {
      console.error("Failed to switch member:", error);
      Alert.alert("Error", "Could not switch profile. Please try again.");
    }
  };

  const handleUpdateColor = (color: ProfileColor) => {
    try {
      if (!editingMemberId) return;

      // Check if color is taken by another member
      const isTaken = members.some((m: FamilyMember) => m.id !== editingMemberId && m.color === color.value);

      if (isTaken) {
        Alert.alert("Color Taken", "This color is already assigned to another family member. Please choose a unique color.");
        return;
      }

      updateMemberColor(editingMemberId, color.value);
      setEditingMemberId(null);
    } catch (error) {
      console.error("Failed to update color:", error);
      Alert.alert("Error", "Could not update color. Please try again.");
    }
  };

  if (!mounted) {
    return null;
  }

  const shortcuts = [
    ...(ENABLE_RECIPE_AND_MEALS ? [
      { icon: Utensils, label: 'Recipes', route: 'Recipes' },
      { icon: Calendar, label: 'Meal Plan', route: 'MealPlan' },
    ] : []),
    { icon: ClipboardList, label: 'Shopping Lists', route: 'lists' }, // Fixed route name to lowercase 'lists' tab
    { icon: FileText, label: 'Vault', route: 'Vault' },
    { icon: DollarSign, label: 'Expenses', route: 'Expenses' },
    { icon: StickyNote, label: 'Notes', route: 'Notes' },
    { icon: Check, label: 'Tasks', route: 'Tasks' },
  ];

  const bottomLinks = [
    { icon: Shield, label: 'Privacy & Security', route: 'Privacy' },
    { icon: HelpCircle, label: 'Help & Support', route: 'Help' },
  ];

  // Find current member being edited
  const editingMember = members.find((m: any) => m.id === editingMemberId);

  return (
    <Modal visible={mounted} animationType="none" transparent onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
        </TouchableWithoutFeedback>
        <Animated.View
          style={[
            styles.sidebar,
            { width: sidebarWidth, transform: [{ translateX }] },
          ]}
        >
          {/* Profile Section (Gradient Header) */}
          {/* Profile Section (Gradient Header) */}
          <View style={[styles.headerGradient, { backgroundColor: theme.colors.primary }]}>
            <Pressable onPress={onClose} style={styles.closeIcon}>
              <X size={24} color="#f5f8ff" />
            </Pressable>

            <View style={styles.profileContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                {/* Avatar with Color Edit */}
                <View>
                  <Pressable
                    style={styles.avatar}
                    onPress={() => {
                      if (activeMember) setEditingMemberId(activeMember.id);
                    }}
                  >
                    {activeMember ? (
                      <MemberIcon symbol={activeMember.symbol} size={32} color="#f5f8ff" />
                    ) : (
                      <User size={32} color="#f5f8ff" />
                    )}
                  </Pressable>
                  {/* Edit Color Badge */}
                  <Pressable
                    style={styles.editColorBadge}
                    onPress={() => {
                      if (activeMember) setEditingMemberId(activeMember.id);
                    }}
                  >
                    <Palette size={12} color={theme.colors.primary} />
                  </Pressable>
                </View>

                {/* Name & Switcher */}
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() => setIsProfilesOpen(!isProfilesOpen)}
                >
                  <Text style={styles.familyName} numberOfLines={1}>
                    {familyName || (isGuest ? 'Guest' : 'Select Profile')}
                  </Text>
                  {!isGuest && (
                    <Text style={[styles.memberName, { marginBottom: 0 }]} numberOfLines={1}>
                      {activeMember?.name || user?.email || ''}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 2 }}>
                    <Text style={styles.memberName}>{isProfilesOpen ? 'Close profiles' : 'Switch profile'}</Text>
                    {isProfilesOpen ? (
                      <ChevronDown size={14} color="rgba(255,255,255,0.7)" style={{ marginLeft: 4 }} />
                    ) : (
                      <ChevronRight size={14} color="rgba(255,255,255,0.7)" style={{ marginLeft: 4 }} />
                    )}
                  </View>
                </Pressable>
              </View>
            </View>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator
            nestedScrollEnabled
          >
            {/* Switch Profile Section - Dropdown Style */}
            <View style={styles.section}>
              <Pressable
                style={styles.dropdownHeader}
                onPress={() => setIsProfilesOpen(!isProfilesOpen)}
              >
                <Text style={styles.sectionLabel}>More</Text>
                {isProfilesOpen ? (
                  <ChevronDown size={16} color={theme.colors.mutedForeground} />
                ) : (
                  <ChevronRight size={16} color={theme.colors.mutedForeground} />
                )}
              </Pressable>

              {isProfilesOpen && (
                <View style={{ gap: 8, marginTop: 8 }}>
                  {members.map((member: FamilyMember) => (
                    <View
                      key={member.id}
                      style={[
                        styles.profileRow,
                        member.isActive && styles.profileRowActive
                      ]}
                    >
                      <Pressable
                        style={styles.profileSelectArea}
                        onPress={() => handleSwitchMember(member)}
                      >
                        <View style={[
                          styles.profileAvatar,
                          { backgroundColor: member.isActive ? '#dbeafe' : '#f3f4f6' }
                        ]}>
                          <MemberIcon symbol={member.symbol} size={24} />
                        </View>
                        <Text style={[styles.profileText, member.isActive && styles.profileTextActive]}>
                          {member.name}
                        </Text>
                        {member.isActive && <Check size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />}
                      </Pressable>

                      {/* Color Picker Trigger */}
                      <Pressable
                        style={[styles.colorTrigger, { backgroundColor: theme.colors.card }]}
                        onPress={() => setEditingMemberId(member.id)}
                      >
                        <Palette size={16} color={theme.colors.mutedForeground} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.separator} />

            {/* Logged-in user summary card */}
            {!isGuest && (
              <View style={styles.userCardContainer}>
                <View style={[styles.userCard, { backgroundColor: '#F4F7FF' }]}>
                      <View style={[styles.userCardIcon, { backgroundColor: theme.colors.primary }]}>
                        <MemberIcon symbol={activeMember?.symbol || DEFAULT_MEMBER_ICON} size={20} color="#fff" />
                  </View>
                  <View style={styles.userCardText}>
                    <Text style={styles.userCardTitle}>{activeMember?.name || familyName || 'Family'}</Text>
                    <Text style={styles.userCardSubtitle}>{user?.email || 'Logged in user'}</Text>
                  </View>
                  <Pressable
                    style={[styles.userCardAction, { backgroundColor: '#E0F2FF' }]}
                    onPress={() => handleNavigate('Privacy')}
                  >
                    <Text style={[styles.userCardActionText, { color: theme.colors.primary }]}>Account Details</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Guest Mode Badge */}
            {isGuest && (
              <View style={styles.guestBadgeContainer}>
                <View style={styles.guestBadge}>
                  <View style={styles.guestBadgeHeader}>
                    <User size={16} color={theme.colors.primary} />
                    <Text style={styles.guestBadgeTitle}>Guest</Text>
                  </View>
                  <Text style={styles.guestBadgeDesc}>
                    You are using the app in guest mode. Create an account to sync your data.
                  </Text>
                  <Pressable
                    style={styles.guestSignInBtn}
                    onPress={async () => {
                      onClose();
                      // logout() clears guest session → isAuthenticated becomes false
                      // → AppNavigator automatically renders the Auth branch
                      try { await logout(); } catch (e) { console.error(e); }
                    }}
                  >
                    <Text style={styles.guestSignInText}>Sign In / Create Account</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Quick Shortcuts */}
            {notificationsEnabled === false && (
              <View style={styles.notificationCardContainer}>
                <View style={styles.notificationCard}>
                  <View style={styles.notificationCardHeader}>
                    <Bell size={20} color="#071234" />
                    <Text style={styles.notificationCardTitle}>Enable notifications</Text>
                  </View>
                  <Text style={styles.notificationCardBody}>
                    Keep reminders and alerts enabled by allowing notifications in Settings.
                  </Text>
                  <Pressable style={styles.notificationCardButton} onPress={handleEnableNotifications}>
                    <Text style={styles.notificationCardButtonText}>Enable Notifications</Text>
                  </Pressable>
                </View>
              </View>
            )}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Quick Access</Text>
              <View style={{ gap: 4 }}>
                {shortcuts.map((item) => (
                  <Pressable
                    key={item.route}
                    style={styles.linkRow}
                    onPress={() => handleNavigate(item.route)}
                  >
                    <item.icon size={20} color={theme.colors.foreground} style={styles.linkIcon} />
                    <Text style={styles.linkText}>{item.label}</Text>
                    <ChevronRight size={16} color={theme.colors.mutedForeground} />
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.separator} />

            {/* Bottom Links */}
            <View style={styles.section}>
              <View style={{ gap: 4 }}>
                {bottomLinks.map((item) => (
                  <Pressable
                    key={item.route}
                    style={styles.linkRow}
                    onPress={() => handleNavigate(item.route)}
                  >
                    <item.icon size={20} color={theme.colors.mutedForeground} style={styles.linkIcon} />
                    <Text style={[styles.linkText, { color: theme.colors.mutedForeground }]}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.separator} />

            {/* Logout / Sign In section */}
            <View style={styles.section}>
              {isGuest ? (
                <Pressable
                  style={[styles.linkRow, { opacity: 0.8 }]}
                  onPress={async () => {
                    onClose();
                    try { await logout(); } catch (e) { console.error(e); }
                  }}
                >
                  <LogOut size={20} color={theme.colors.primary} style={styles.linkIcon} />
                  <Text style={[styles.linkText, { color: theme.colors.primary }]}>Sign In / Create Account</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.linkRow, { opacity: 0.8 }]}
                  onPress={handleLogout}
                >
                  <LogOut size={20} color={theme.colors.danger} style={styles.linkIcon} />
                  <Text style={[styles.linkText, { color: theme.colors.danger }]}>Log Out</Text>
                </Pressable>
              )}
            </View>

          </ScrollView>
        </Animated.View>

        {/* Color Picker Modal Overlay */}
        {editingMemberId && (
          <Modal visible={true} transparent animationType="fade" onRequestClose={() => setEditingMemberId(null)}>
            <Pressable style={styles.colorPickerOverlay} onPress={() => setEditingMemberId(null)}>
              <Pressable style={[styles.colorPickerContainer, { backgroundColor: theme.colors.card }]} onPress={e => e.stopPropagation()}>
                <Text style={[styles.colorPickerTitle, { color: theme.colors.foreground }]}>
                  Choose Color
                </Text>
                <Text style={[styles.colorPickerSubtitle, { color: theme.colors.mutedForeground }]}>
                  for {editingMember?.name}
                </Text>

                <View style={styles.colorGrid}>
                  {PROFILE_COLORS.map(color => {
                    const isTaken = members.some((m: FamilyMember) => m.id !== editingMemberId && m.color === color.value);
                    const isSelected = editingMember?.color === color.value;

                    return (
                      <Pressable
                        key={color.id}
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: color.hex },
                          isSelected && styles.colorSwatchSelected,
                          isTaken && styles.colorSwatchTaken
                        ]}
                        onPress={() => handleUpdateColor(color)}
                        disabled={isTaken}
                      >
                        {isSelected && <Check size={20} color="#fff" />}
                        {isTaken && <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, fontWeight: 'bold' }}>✕</Text>}
                      </Pressable>
                    )
                  })}
                </View>

                <Text style={[styles.colorPickerFooter, { color: theme.colors.mutedForeground }]}>
                  Colors marked ✕ are taken
                </Text>
              </Pressable>
            </Pressable>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "transparent",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sidebar: {
    backgroundColor: theme.colors.background,
    borderTopRightRadius: 0,
    minHeight: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
    overflow: "hidden",
  },
  headerGradient: {
    // START_FIX: Use inline style for dynamic color
    padding: 24,
    paddingTop: 60, // status bar space
  },
  closeIcon: {
    position: "absolute",
    right: 20,
    top: 50,
    padding: 8,
    zIndex: 10,
  },
  profileContent: {
    alignItems: 'flex-start',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarIcon: {
    fontSize: 32,
    color: "#f5f8ff",
  },
  editColorBadge: {
    position: 'absolute',
    bottom: 12, // adjusted to overlap bottom-right of avatar
    right: -4,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  familyName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f5f8ff",
    marginBottom: 4,
  },
  memberName: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  settingsText: {
    color: "#f5f8ff",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollArea: {
    flex: 1,
  },
  content: {
    paddingVertical: 16,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.muted, // fallback
  },
  profileRowActive: {
    backgroundColor: '#eff6ff', // primary-light
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  profileSelectArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorTrigger: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 4,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
    color: theme.colors.foreground,
  },
  profileTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  linkIcon: {
    marginRight: 12,
  },
  linkText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.foreground,
  },

  // Color Picker Popup
  colorPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  colorPickerContainer: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  colorPickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  colorPickerSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  colorSwatch: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#fff', // white border to indicate selection
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  colorSwatchTaken: {
    opacity: 0.5,
  },
  colorPickerFooter: {
    fontSize: 12,
  },

  // Guest Badge
  guestBadgeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  guestBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
  },
  guestBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  guestBadgeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  guestBadgeDesc: {
    fontSize: 13,
    color: theme.colors.mutedForeground,
    lineHeight: 18,
    marginBottom: 12,
  },
  guestSignInBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  guestSignInText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  userCardContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  userCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F4F7FF',
    borderWidth: 1,
    borderColor: '#DDE7FF',
  },
  userCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCardText: {
    flex: 1,
  },
  userCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  userCardSubtitle: {
    fontSize: 12,
    color: theme.colors.mutedForeground,
  },
  userCardAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  userCardActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notificationCardContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  notificationCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9D7FF',
    padding: 16,
    backgroundColor: '#FFF7FB',
    gap: 8,
  },
  notificationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationCardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  notificationCardBody: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  notificationCardButton: {
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: '#123977',
    paddingVertical: 10,
    alignItems: 'center',
  },
  notificationCardButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
