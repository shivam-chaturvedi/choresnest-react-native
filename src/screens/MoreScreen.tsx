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
import { useSidebar } from "../contexts/SidebarContext";
import { AppIcon, AppIconName } from "../components/ui/AppIcon";

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

const sections: MenuSection[] = [
  {
    title: "FEATURES",
    items: [
      {
        label: "Recipes & Meals",
        description: "Meal planning & recipes",
        icon: "utensils",
        color: "rgba(123, 164, 208, 0.2)", // bg-secondary opacity
        iconColor: theme.colors.primary, // text-secondary-foreground (used primary for visibility) 
        route: "Recipes"
      },
      {
        label: "Nutrition & Health",
        description: "Track health & diet",
        icon: "heart",
        color: "rgba(239, 68, 68, 0.15)", // bg-danger-light
        iconColor: theme.colors.danger,
        route: "Nutrition"
      },
      {
        label: "Notes",
        description: "Ideas & memos",
        icon: "file",
        color: "rgba(234, 179, 8, 0.15)", // bg-warning-light
        iconColor: theme.colors.warning,
        route: "Notes"
      },
      {
        label: "Expenses & Finance",
        description: "Budget & spending",
        icon: "wallet",
        color: "rgba(46, 94, 153, 0.15)", // bg-success-light (using primary/success color)
        iconColor: theme.colors.success,
        route: "Expenses"
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
        color: "rgba(13, 36, 64, 0.1)", // bg-accent
        iconColor: theme.colors.foreground,
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
        color: "rgba(245, 158, 11, 0.15)", // bg-warning-light
        iconColor: theme.colors.warning,
        route: "Notifications"
      },
      {
        label: "Privacy & Security",
        description: "Data protection",
        icon: "shield",
        color: theme.colors.muted,
        iconColor: theme.colors.foreground,
        route: "Privacy"
      },
      {
        label: "Theme",
        description: "Light / Dark mode",
        icon: "palette",
        color: "rgba(123, 164, 208, 0.2)", // bg-primary-light
        iconColor: theme.colors.primary,
        route: "Theme"
      },
      {
        label: "Data Export",
        description: "Backup your data",
        icon: "download",
        color: theme.colors.muted,
        iconColor: theme.colors.foreground,
        route: "DataExport"
      },
      {
        label: "Help & Support",
        description: "FAQ & contact us",
        icon: "help",
        color: "rgba(123, 164, 208, 0.15)", // bg-info-light
        iconColor: theme.colors.info,
        route: "Help"
      },
    ],
  },
];

export const MoreScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<Record<string, undefined>>>();
  const { openSidebar } = useSidebar();

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
            <Pressable onPress={openSidebar} style={styles.menuButton}>
              <AppIcon name="menu" size={20} color={theme.colors.foreground} />
            </Pressable>
            <Text style={styles.title}>Settings</Text>
          </View>

          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={{ fontSize: 32 }}>👨</Text>
              </View>
              <View style={styles.cameraBadge}>
                <AppIcon name="camera" size={12} color={theme.colors.mutedForeground} />
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>Shivam Kumar</Text>
              <Text style={styles.profileEmail}>shivam@email.com</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>Family Admin</Text>
              </View>
            </View>
          </View>

          {sections.map((section) => (
            <View key={section.title} style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionCard}>
                {section.items.map((item, index) => (
                  <Pressable
                    key={item.label}
                    style={[
                      styles.itemRow,
                      index !== section.items.length - 1 && styles.itemBorder
                    ]}
                    onPress={() => navigation.navigate(item.route)}
                  >
                    <View style={[styles.itemIcon, { backgroundColor: item.color }]}>
                      <AppIcon name={item.icon} size={20} color={item.iconColor} />
                    </View>
                    <View style={styles.itemTextContainer}>
                      <Text style={styles.itemLabel}>{item.label}</Text>
                      {item.description && (
                        <Text style={styles.itemDesc}>{item.description}</Text>
                      )}
                    </View>
                    {item.badge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    )}
                    <AppIcon name="chevronRight" size={20} color={theme.colors.mutedForeground} />
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <AppIcon name="logOut" size={20} color={theme.colors.danger} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </Pressable>

          <Text style={styles.version}>Family Chores v1.0.0 · Made with ❤️ for families</Text>
        </ScrollView>
      </AppLayout>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    paddingBottom: 120,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 0,
    backgroundColor: theme.colors.card,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0a1a3c",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.foreground,
    marginLeft: theme.spacing.md,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: 0,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    shadowColor: "#0a1a3c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarContainer: {
    position: "relative",
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 0,
    backgroundColor: "rgba(46, 94, 153, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 0,
    backgroundColor: theme.colors.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: theme.colors.background,
    shadowColor: "#000",
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
    color: theme.colors.foreground,
  },
  profileEmail: {
    fontSize: 14,
    color: theme.colors.mutedForeground,
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(123, 164, 208, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 0,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  sectionContainer: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.mutedForeground,
    marginBottom: theme.spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingLeft: 4,
  },
  sectionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 0,
    padding: 8,
    shadowColor: "#0a1a3c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 0,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.muted,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 0,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.foreground,
  },
  itemDesc: {
    fontSize: 12,
    color: theme.colors.mutedForeground,
  },
  badge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 0,
    marginRight: 8,
  },
  badgeText: {
    color: theme.colors.primaryForeground,
    fontSize: 12,
    fontWeight: "700",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.card,
    paddingVertical: 16,
    borderRadius: 0,
    gap: 8,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutText: {
    color: theme.colors.danger,
    fontWeight: "700",
    fontSize: 16,
  },
  version: {
    textAlign: "center",
    color: theme.colors.mutedForeground,
    opacity: 0.7,
    fontSize: 12,
  }
});
