import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { AppLayout } from "../components/layout/AppLayout";
import { useFamily } from "../contexts/FamilyContext";
import { theme } from "../theme";
import { useThemeColors, useThemeRadius } from '../contexts/ThemeContext';
import { useSidebar } from "../contexts/SidebarContext";
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  Edit,
  Menu,
  ChevronLeft
} from "lucide-react-native";

const roles = [
  { label: "Admin", description: "Full access to all features", icon: Crown, color: "warning" },
  { label: "Parent", description: "Can manage family settings", icon: Shield, color: "info" },
  { label: "Child", description: "Limited access", icon: Users, color: "success" },
];

export const FamilyScreen: React.FC = () => {
  const { familyName, members } = useFamily();
  const { openSidebar } = useSidebar();
  const colors = useThemeColors();
  const radius = useThemeRadius();

  // Helper to get color values
  const getColor = (colorName: string) => {
    const colorMap: any = colors;
    return colorMap[colorName] || colors.primary;
  };

  return (
    <AppLayout showNav={false}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={openSidebar} style={[styles.iconButton, { backgroundColor: colors.card, borderRadius: radius.md }]}>
            <Menu size={24} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1, paddingHorizontal: 12 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>Family Members</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{familyName}</Text>
          </View>
          <Pressable style={[styles.iconButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md }]}>
            <UserPlus size={20} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Family Card */}
        <View style={[styles.familyCard, { backgroundColor: colors.primary, shadowColor: colors.primary, borderRadius: radius.card }]}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.lg }]}>
            <Users size={32} color={colors.primaryForeground} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.primaryForeground }]}>{familyName}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.primaryForeground, opacity: 0.8 }]}>{members.length} members</Text>
          </View>
          <Pressable style={[styles.cardEditButton, { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.sm }]}>
            <Edit size={20} color={colors.primaryForeground} />
          </Pressable>
        </View>

        {/* Members List */}
        <Text style={[styles.sectionHeader, { color: colors.foreground }]}>Members</Text>
        <View style={{ gap: 8 }}>
          {members.map((member) => (
            <View key={member.id} style={[styles.memberCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }]}>
              <View style={[styles.avatar, { backgroundColor: member.color || colors.muted, borderRadius: radius.card }]}>
                <Text style={{ fontSize: 24 }}>{member.symbol}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.memberName, { color: colors.foreground }]}>{member.name}</Text>
                <View style={styles.statusContainer}>
                  <View style={[styles.roleBadge, { backgroundColor: colors.muted, borderRadius: radius.xs }]}>
                    <Text style={[styles.roleText, { color: colors.primary }]}>Member</Text>
                  </View>
                  {member.isActive && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={[styles.onlineDot, { backgroundColor: colors.success, borderRadius: radius.xs }]} />
                      <Text style={[styles.onlineText, { color: colors.success }]}>Online</Text>
                    </View>
                  )}
                </View>
              </View>
              <Pressable style={styles.editIconButton}>
                <Edit size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
          ))}
        </View>

        {/* Roles Info */}
        <View style={styles.rolesSection}>
          <Text style={[styles.sectionHeader, { color: colors.foreground }]}>Available Roles</Text>
          <View style={[styles.rolesCard, { backgroundColor: colors.card, borderRadius: radius.card }]}>
            {roles.map((role) => (
              <View key={role.label} style={styles.roleRow}>
                <View style={[styles.roleIconBg, { backgroundColor: colors.muted, borderRadius: radius.md }]}>
                  <role.icon size={20} color={getColor(role.color)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleName, { color: colors.foreground }]}>{role.label}</Text>
                  <Text style={[styles.roleDesc, { color: colors.mutedForeground }]}>{role.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Add Button */}
        <Pressable style={[styles.addButton, { backgroundColor: colors.primary, borderRadius: radius.md }]}>
          <UserPlus size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Family Member</Text>
        </Pressable>

      </ScrollView>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
  },
  familyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 14,
  },
  cardEditButton: {
    padding: 8,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  onlineDot: {
    width: 6,
    height: 6,
  },
  onlineText: {
    fontSize: 11,
    fontWeight: '500',
  },
  editIconButton: {
    padding: 8,
  },
  rolesSection: {
    marginTop: 24,
  },
  rolesCard: {
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  roleIconBg: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  roleName: {
    fontSize: 14,
    fontWeight: '600',
  },
  roleDesc: {
    fontSize: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 24,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
