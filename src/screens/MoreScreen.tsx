import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Modal,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { AppLayout } from "../components/layout";
import { useThemeColors, useThemeRadius } from "../contexts/ThemeContext";
import { useSidebar } from "../contexts/SidebarContext";
import { AppIcon, AppIconName } from "../components/ui/AppIcon";
import { useFamily, FamilyMember } from "../contexts/FamilyContext";
import { PROFILE_COLORS } from "../constants/profileColors";
import { useAuth } from "../contexts/AuthContext";
import Config from "react-native-config";

interface MenuItem {
  label: string;
  description?: string;
  icon: AppIconName;
  color: string;
  iconColor: string;
  route: string;
  badge?: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export const MoreScreen: React.FC = () => {
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const navigation = useNavigation<NavigationProp<Record<string, undefined>>>();
  const { openSidebar } = useSidebar();
  const { logout } = useAuth();
  const { activeMember, members, setActiveMember } = useFamily();
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);

  // Safe access to profile color
  const activeProfileColor = activeMember?.color
    ? (PROFILE_COLORS.find(c => c.value === activeMember.color)?.hex || colors.primary)
    : colors.primary;

  // Debug: Log Config.ENABLE_DEBUG_TOOLS value
  console.log('Config.ENABLE_DEBUG_TOOLS value:', Config.ENABLE_DEBUG_TOOLS);
  console.log('Config.ENABLE_DEBUG_TOOLS type:', typeof Config.ENABLE_DEBUG_TOOLS);
  console.log('Config.ENABLE_DEBUG_TOOLS === "true":', Config.ENABLE_DEBUG_TOOLS === "true");

  const sections: MenuSection[] = [
    {
      title: "FEATURES",
      items: [
        {
          label: "Recipes & Meals",
          description: "Meal planning & recipes",
          icon: "utensils",
          color: colors.primary + '25',
          iconColor: colors.primary,
          route: "Recipes"
        },
        {
          label: "Nutrition & Health",
          description: "Track health & diet",
          icon: "heart",
          color: colors.danger + '25',
          iconColor: colors.danger,
          route: "Nutrition"
        },
        {
          label: "Notes",
          description: "Ideas & memos",
          icon: "file",
          color: colors.warning + '25',
          iconColor: colors.warning,
          route: "Notes"
        },
        {
          label: "Expenses & Finance",
          description: "Budget & spending",
          icon: "wallet",
          color: colors.success + '25',
          iconColor: colors.success,
          route: "Expenses"
        },
        {
          label: "Tasks & Chores",
          description: "Track assignments & rotations",
          icon: "checkSquare",
          color: colors.primary + '25',
          iconColor: colors.primary,
          route: "Tasks"
        },
        {
          label: "Vault",
          description: "Secure Personal Storage",
          icon: "lock",
          color: colors.primary + '25',
          iconColor: colors.primary,
          route: "Vault"
        },
      ],
    },

    {
      title: "SETTINGS",
      items: [
        {
          label: "Notifications",
          description: "Alerts & quiet hours",
          icon: "bell",
          color: colors.warning + '25',
          iconColor: colors.warning,
          route: "Notifications"
        },
        {
          label: "Privacy & Security",
          description: "Data protection",
          icon: "shield",
          color: colors.muted,
          iconColor: colors.foreground,
          route: "Privacy"
        },
        {
          label: "Theme",
          description: "Light / Cream mode",
          icon: "palette",
          color: colors.primary + '25',
          iconColor: colors.primary,
          route: "Theme"
        },
        {
          label: "Localization",
          description: "Country, currency & time zone",
          icon: "globe",
          color: colors.info + '25',
          iconColor: colors.info,
          route: "Settings"
        },
        {
          label: "Data Export",
          description: "Backup your data",
          icon: "download",
          color: colors.muted,
          iconColor: colors.foreground,
          route: "DataExport"
        },
        {
          label: "Help & Support",
          description: "FAQ & contact us",
          icon: "help",
          color: colors.info + '25',
          iconColor: colors.info,
          route: "Help"
        },
      ],
    },
    ...(Config.ENABLE_DEBUG_TOOLS === "true" ? [{
      title: "DEVELOPER",
      items: [
        {
          label: "Debug Tools",
          description: "Database visualization & logs",
          icon: "terminal" as AppIconName,
          color: colors.primary + '25',
          iconColor: colors.primary,
          route: "Debug"
        }
      ]
    }] : [])
  ];

  // Add useAuth import at top if not present (handled by prev step or assumes knowledge, but I will do it purely here if I can, wait I need to add import line)
  // Since I can't check imports with this tool easily in one go for existing files without overwriting, I will assume I need to add the import too.
  // Actually, I'll use multi_replace to be safe.
  const handleLogout = async () => {
    try {
      Alert.alert(
        "Sign Out",
        "Are you sure you want to sign out?",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Sign Out",
            style: "destructive",
            onPress: async () => {
              try {
                await logout();
                // Navigation will automatically handle the switch to Auth stack due to AppNavigator logic
              } catch (e) {
                console.error("Logout execution error:", e);
                Alert.alert("Error", "Failed to sign out. Please try again.");
              }
            }
          }
        ]
      );
    } catch (e) {
      console.error("Logout Error:", e);
    }
  };

  const handleSwitchProfile = (member: FamilyMember) => {
    try {
      setActiveMember(member);
      setShowProfileSwitcher(false);
    } catch (e) {
      console.error("Profile Switch Error:", e);
      Alert.alert("Error", "Could not switch profile");
    }
  };

  const handleNavigate = (route: string) => {
    // Helper to handle nested navigation
    const navigateToNested = (tabName: string, stackScreenName?: string) => {
      (navigation as any).navigate(tabName, {
        screen: stackScreenName,
      });
    };

    switch (route) {
      // Home Stack
      case 'Recipes':
      case 'MealPlan':
      case 'Notes':
      case 'Expenses':
      case 'Vault':
      case 'Nutrition':
        navigateToNested('home', route);
        break;

      // More Stack (current stack)
      case 'Notifications':
      case 'Privacy':
      case 'Theme':
      case 'DataExport':
      case 'Help':
      case 'Tasks':
      case 'Debug':
        navigation.navigate(route as any);
        break;

      default:
        navigation.navigate(route as any);
    }
  };

  return (
    <>
      <AppLayout showNav={false}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable onPress={openSidebar} style={[styles.menuButton, { backgroundColor: colors.card, shadowColor: colors.foreground, borderRadius: radius.md }]}>
                <AppIcon name="menu" size={20} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
            </View>

            {/* Top Bar Profile Switcher */}
            <Pressable
              style={[styles.topProfileButton, { backgroundColor: activeProfileColor + '20', borderRadius: radius.full }]}
              onPress={() => setShowProfileSwitcher(true)}
            >
              <Text style={{ fontSize: 18 }}>{activeMember?.symbol || "👤"}</Text>
            </Pressable>
          </View>

          {/* Profile Card */}
          <Pressable
            style={[styles.profileCard, { backgroundColor: colors.card, shadowColor: colors.foreground, borderRadius: radius.card }]}
            onPress={() => setShowProfileSwitcher(true)}
          >
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { backgroundColor: activeProfileColor + '20', borderRadius: radius.lg }]}>
                <Text style={{ fontSize: 32 }}>{activeMember?.symbol || "👨"}</Text>
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.foreground }]}>{activeMember?.name || "Family Member"}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <View style={[styles.roleBadge, { backgroundColor: activeProfileColor + '20', borderRadius: radius.sm, marginRight: 8 }]}>
                  <Text style={[styles.roleText, { color: activeProfileColor }]}>
                    {activeMember?.color ? (PROFILE_COLORS.find(c => c.value === activeMember.color)?.name || "Member") : "Member"}
                  </Text>
                </View>
                <AppIcon name="chevronDown" size={14} color={colors.mutedForeground} />
              </View>
            </View>
            {/* Fixed Icon Name: refreshCw -> rotateCw */}
            <AppIcon name="rotateCw" size={20} color={colors.mutedForeground} />
          </Pressable>

          {sections.map((section) => (
            <View key={section.title} style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{section.title}</Text>
              <View style={[styles.sectionCard, { backgroundColor: colors.card, shadowColor: colors.foreground, borderRadius: radius.card }]}>
                {section.items.map((item, index) => {
                  if (item.label === "Nutrition & Health") return null;

                  return (
                    <Pressable
                      key={item.label}
                      style={[
                        styles.itemRow,
                        { borderRadius: radius.md },
                        index !== section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
                      ]}
                      onPress={() => handleNavigate(item.route)}
                    >
                      <View style={[styles.itemIcon, { backgroundColor: item.color, borderRadius: radius.md }]}>
                        <AppIcon name={item.icon} size={20} color={item.iconColor} />
                      </View>
                      <View style={styles.itemTextContainer}>
                        <Text style={[styles.itemLabel, { color: colors.foreground }]}>{item.label}</Text>
                        {item.description && (
                          <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>{item.description}</Text>
                        )}
                      </View>
                      {item.badge && (
                        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                          <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>{item.badge}</Text>
                        </View>
                      )}
                      <AppIcon name="chevronRight" size={20} color={colors.mutedForeground} />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          <Pressable style={[styles.logoutButton, { backgroundColor: colors.card, shadowColor: colors.foreground, borderColor: colors.border, borderRadius: radius.card }]} onPress={handleLogout}>
            <AppIcon name="logOut" size={20} color={colors.danger} />
            <Text style={[styles.logoutText, { color: colors.danger }]}>Sign Out</Text>
          </Pressable>

          <Text style={[styles.version, { color: colors.mutedForeground }]}>Family Chores v1.0.0 · Made with ❤️ for families</Text>
        </View>
      </AppLayout>

      {/* Profile Switcher Modal */}
      <Modal visible={showProfileSwitcher} animationType="fade" transparent onRequestClose={() => setShowProfileSwitcher(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowProfileSwitcher(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderRadius: radius.xl }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Switch Profile</Text>
              <Pressable onPress={() => setShowProfileSwitcher(false)}>
                <AppIcon name="x" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <FlatList
              data={members ?? []}
              keyExtractor={(member) => member.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
              renderItem={({ item: member }) => {
                const isActive = member.id === activeMember?.id;
                const memColor = PROFILE_COLORS.find(c => c.value === member.color)?.hex || colors.primary;

                return (
                  <Pressable
                    style={[
                      styles.memberOption,
                      {
                        backgroundColor: isActive ? memColor + '10' : colors.muted,
                        borderRadius: radius.lg,
                        borderColor: isActive ? memColor : 'transparent',
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => handleSwitchProfile(member)}
                  >
                    <View style={[styles.optionAvatar, { backgroundColor: memColor + '20', borderRadius: radius.full }]}>
                      <Text style={{ fontSize: 24 }}>{member.symbol}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionName, { color: colors.foreground, fontWeight: isActive ? '700' : '500' }]}>
                        {member.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                        {PROFILE_COLORS.find(c => c.value === member.color)?.name}
                      </Text>
                    </View>
                    {isActive && <AppIcon name="check" size={20} color={memColor} />}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 120,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginLeft: 16,
  },
  topProfileButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingLeft: 4,
  },
  sectionCard: {
    padding: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  itemIcon: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  itemDesc: {
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutText: {
    fontWeight: "700",
    fontSize: 16,
  },
  version: {
    textAlign: "center",
    opacity: 0.7,
    fontSize: 12,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20
  },
  modalContent: {
    padding: 24,
    maxHeight: '60%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700'
  },
  memberOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 16
  },
  optionAvatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },
  optionName: {
    fontSize: 16
  }
});
