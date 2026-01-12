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

  // Helper to get color values
  const getColor = (colorName: string) => {
    const colors: any = theme.colors;
    return colors[colorName] || theme.colors.primary;
  };

  return (
    <AppLayout showNav={false}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={openSidebar} style={[styles.iconButton, { backgroundColor: theme.colors.card }]}>
            <Menu size={24} color={theme.colors.foreground} />
          </Pressable>
          <View style={{ flex: 1, paddingHorizontal: 12 }}>
            <Text style={[styles.title, { color: theme.colors.foreground }]}>Family Members</Text>
            <Text style={[styles.subtitle, { color: theme.colors.mutedForeground }]}>{familyName}</Text>
          </View>
          <Pressable style={[styles.iconButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.border }]}>
            <UserPlus size={20} color={theme.colors.foreground} />
          </Pressable>
        </View>

        {/* Family Card */}
        <View style={[styles.familyCard, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Users size={32} color={theme.colors.primaryForeground} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.colors.primaryForeground }]}>{familyName}</Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.primaryForeground, opacity: 0.8 }]}>{members.length} members</Text>
          </View>
          <Pressable style={[styles.cardEditButton, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
            <Edit size={20} color={theme.colors.primaryForeground} />
          </Pressable>
        </View>

        {/* Members List */}
        <Text style={[styles.sectionHeader, { color: theme.colors.foreground }]}>Members</Text>
        <View style={{ gap: 8 }}>
          {members.map((member) => (
            <View key={member.id} style={[styles.memberCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: member.color || theme.colors.muted }]}>
                <Text style={{ fontSize: 24 }}>{member.symbol}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.memberName, { color: theme.colors.foreground }]}>{member.name}</Text>
                <View style={styles.statusContainer}>
                  <View style={[styles.roleBadge, { backgroundColor: theme.colors.muted }]}>
                    <Text style={[styles.roleText, { color: theme.colors.primary }]}>Member</Text>
                  </View>
                  {member.isActive && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={[styles.onlineDot, { backgroundColor: theme.colors.success }]} />
                      <Text style={[styles.onlineText, { color: theme.colors.success }]}>Online</Text>
                    </View>
                  )}
                </View>
              </View>
              <Pressable style={styles.editIconButton}>
                <Edit size={16} color={theme.colors.mutedForeground} />
              </Pressable>
            </View>
          ))}
        </View>

        {/* Roles Info */}
        <View style={styles.rolesSection}>
          <Text style={[styles.sectionHeader, { color: theme.colors.foreground }]}>Available Roles</Text>
          <View style={[styles.rolesCard, { backgroundColor: theme.colors.card }]}>
            {roles.map((role) => (
              <View key={role.label} style={styles.roleRow}>
                <View style={[styles.roleIconBg, { backgroundColor: theme.colors.muted }]}>
                  <role.icon size={20} color={getColor(role.color)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleName, { color: theme.colors.foreground }]}>{role.label}</Text>
                  <Text style={[styles.roleDesc, { color: theme.colors.mutedForeground }]}>{role.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Add Button */}
        <Pressable style={[styles.addButton, { backgroundColor: theme.colors.primary }]}>
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
    borderRadius: 12,
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
    borderRadius: 20,
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
    borderRadius: 16,
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
    borderRadius: 10,
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
    borderRadius: 16,
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
    borderRadius: 20,
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
    borderRadius: 6,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
    borderRadius: 16,
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
    borderRadius: 12,
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
    borderRadius: 12,
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
