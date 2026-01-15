import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { AppLayout } from "../components/layout/AppLayout";
import { theme } from "../theme";
import { useThemeColors, useThemeRadius } from "../contexts/ThemeContext";
import { useSidebar } from "../contexts/SidebarContext";
import { AppIcon, AppIconName } from "../components/ui/AppIcon";
import { useFamily } from "../contexts/FamilyContext";
import { PROFILE_COLORS } from "../constants/profileColors";

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
  const radius = useThemeRadius(); // Reactively updated radius
  const navigation = useNavigation<NavigationProp<Record<string, undefined>>>();
  const { openSidebar } = useSidebar();
  const { activeMember } = useFamily();

  const activeProfileColor = PROFILE_COLORS.find(c => c.value === activeMember?.color)?.hex || colors.primary;

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
      ],
    },
    {
      title: "FAMILY",
      items: [
        {
          label: "Family Members",
          description: "Manage family profiles",
          icon: "users",
          color: colors.foreground + '10',
          iconColor: colors.foreground,
          badge: "4",
          route: "Family"
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
  ];

  const handleLogout = () => {
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
          onPress: () => console.log("Sign out confirmed")
        }
      ]
    );
  };

  return (
    <>
      <AppLayout showNav={false}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={openSidebar} style={[styles.menuButton, { backgroundColor: colors.card, shadowColor: colors.foreground, borderRadius: radius.md }]}>
              <AppIcon name="menu" size={20} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
          </View>

          {/* Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: colors.card, shadowColor: colors.foreground, borderRadius: radius.card }]}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { backgroundColor: activeProfileColor + '20', borderRadius: radius.lg }]}>
                <Text style={{ fontSize: 32 }}>{activeMember?.symbol || "👨"}</Text>
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.foreground }]}>{activeMember?.name || "Family Member"}</Text>
              {/* <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>{activeMember?.name.toLowerCase().replace(/\s/g, '')}@email.com</Text> */}
              <View style={[styles.roleBadge, { backgroundColor: activeProfileColor + '20', borderRadius: radius.sm }]}>
                <Text style={[styles.roleText, { color: activeProfileColor }]}>{PROFILE_COLORS.find(c => c.value === activeMember?.color)?.name || "Member"}</Text>
              </View>
            </View>
          </View>

          {sections.map((section) => (
            <View key={section.title} style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{section.title}</Text>
              <View style={[styles.sectionCard, { backgroundColor: colors.card, shadowColor: colors.foreground, borderRadius: radius.card }]}>
                {section.items.map((item, index) => {
                  if (item.label === "Nutrition & Health") return null; // Hide Nutrition button as requested

                  return (
                    <Pressable
                      key={item.label}
                      style={[
                        styles.itemRow,
                        { borderRadius: radius.md },
                        index !== section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
                      ]}
                      onPress={() => navigation.navigate(item.route)}
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
        </ScrollView>
      </AppLayout>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 120,
    // Background handled by AppLayout
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
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
  cameraBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
  },
  profileEmail: {
    fontSize: 14,
    marginBottom: 4,
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
  }
});
