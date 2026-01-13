import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useThemeColors } from "../../contexts/ThemeContext";
import { useFamily } from "../../contexts/FamilyContext";

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ open, onClose }) => {
  const colors = useThemeColors();
  const { addMember } = useFamily();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  const handleSave = () => {
    if (name.trim()) {
      addMember({
        name: name.trim(),
        symbol: "👤",
        color: "", // Will be auto-assigned
      });
      setName("");
      setRole("");
      onClose();
    }
  };


  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              shadowColor: colors.shadow
            }
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.heading, { color: colors.foreground }]}>Invite a Family Member</Text>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Alex"
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.input,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                color: colors.foreground
              }
            ]}
          />
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Role or Relationship</Text>
          <TextInput
            value={role}
            onChangeText={setRole}
            placeholder="Parent, Child, Helper, etc."
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.input,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                color: colors.foreground
              }
            ]}
          />
          <View style={styles.actions}>
            <Pressable
              style={[styles.secondaryButton, { backgroundColor: 'transparent' }]} // Could be improved
              onPress={onClose}
            >
              <Text style={[styles.secondaryText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
            >
              <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>Invite</Text>
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
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    padding: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  secondaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 8,
  },
  secondaryText: {
    fontWeight: "600",
  },
  primaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  primaryText: {
    fontWeight: "600",
  },
});
