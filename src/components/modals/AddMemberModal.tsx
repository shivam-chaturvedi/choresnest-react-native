import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
  Dimensions,
} from "react-native";
import { Check } from "lucide-react-native";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.70;

import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";
import { useFamily } from "../../contexts/FamilyContext";
import { PROFILE_COLORS } from "../../constants/profileColors";
import { AppIcon } from "../ui/AppIcon";
import { MEMBER_ICON_OPTIONS, DEFAULT_MEMBER_ICON } from "../../constants/memberIcons";
import { MemberIcon } from "../ui/MemberIcon";

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  memberToEdit?: any; // FamilyMember
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ open, onClose, memberToEdit }) => {
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const { addMember, updateMember, deleteMemberCascade, members } = useFamily();

  const availableColors = PROFILE_COLORS.filter(c => !members.some((m: any) => m.color === c.value && m.id !== memberToEdit?.id));
  const initialColor = availableColors.length > 0 ? availableColors[0].value : PROFILE_COLORS[0].value;

  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string>(DEFAULT_MEMBER_ICON);
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize form when modal opens or memberToEdit changes
  React.useEffect(() => {
    if (open) {
      if (memberToEdit) {
        setName(memberToEdit.name);
        setSelectedAvatar(memberToEdit.symbol || DEFAULT_MEMBER_ICON);
        setSelectedColor(memberToEdit.color);
      } else {
        setName("");
        setSelectedAvatar(DEFAULT_MEMBER_ICON);
        setSelectedColor(initialColor);
      }
      setError("");
      setIsDeleting(false);
    }
  }, [open, memberToEdit]);

  const handleSave = async () => {
    try {
      if (!name.trim()) {
        setError("Please enter a name");
        return;
      }

      const normalizedName = name.trim().toLowerCase();
      const duplicate = members.some((m: any) =>
        m.name.trim().toLowerCase() === normalizedName &&
        m.id !== memberToEdit?.id
      );

      if (duplicate) {
        setError("A member with this name already exists.");
        return;
      }

      if (memberToEdit) {
        await updateMember(memberToEdit.id, {
          name: name.trim(),
          symbol: selectedAvatar,
          color: selectedColor,
        });
      } else {
        await addMember({
          name: name.trim(),
          symbol: selectedAvatar,
          color: selectedColor,
          isActive: false,
        });
      }

      onClose();
    } catch (error) {
      console.error("Failed to save member:", error);
      Alert.alert("Error", "Failed to save member. Please try again.");
    }
  };

  const handleDelete = () => {
    if (!memberToEdit) return;

    // Prevent removing the last member — every profile must have at least one.
    if (members.length <= 1) {
      Alert.alert(
        "Cannot Remove Member",
        "At least one member is required. You cannot delete the only remaining member of this profile.",
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Delete Member",
      `Are you sure you want to remove ${memberToEdit.name}? This will remove their tasks, events, documents, and list items.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteMemberCascade(memberToEdit.id);
              onClose();
            } catch (error: any) {
              // WatermelonDB throws "Record not found" when the member was
              // already deleted (e.g. DB was reset during guest mode). In that
              // case the member is already gone, so just close the modal.
              const isStaleRecord =
                error?.message?.includes('not found') ||
                error?.message?.includes('Record') ||
                error?.name === 'DiagnosticError';
              if (isStaleRecord) {
                console.warn('AddMemberModal: Member record was already deleted, closing modal cleanly.');
                onClose();
              } else {
                console.error("Failed to delete member:", error);
                Alert.alert("Error", "Unable to delete member right now.");
              }
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              shadowColor: colors.shadow,
              borderRadius: radius.xl
            }
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.headerRow}>
              <Text style={[styles.heading, { color: colors.foreground }]}>{memberToEdit ? "Edit Member" : "Create child account"}</Text>
              <Pressable onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.6 }]}> 
                <AppIcon name="x" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>
            {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Member name"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  color: colors.foreground,
                  borderRadius: radius.md
                }
              ]}
            />

            {/* Avatar Selection */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Avatar</Text>
            <View style={styles.grid}>
              {MEMBER_ICON_OPTIONS.map((avatar) => {
                const isSelected = selectedAvatar === avatar;
                return (
                  <Pressable
                    key={avatar}
                    onPress={() => setSelectedAvatar(avatar)}
                    style={[
                      styles.avatarItem,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.muted,
                        borderRadius: radius.sm
                      }
                    ]}
                  >
                    <AppIcon source={avatar} size={28} color={isSelected ? colors.background : colors.foreground} />
                  </Pressable>
                )
              })}
            </View>

            {/* Color Selection */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Profile Color</Text>
            <View style={styles.grid}>
              {availableColors.map((color) => {
                const isSelected = selectedColor === color.value;
                return (
                  <Pressable
                    key={color.id}
                    onPress={() => setSelectedColor(color.value)}
                    style={[
                      styles.colorItem,
                      {
                        backgroundColor: color.hex,
                        borderRadius: radius.sm,
                        borderWidth: isSelected ? 2 : 0,
                        borderColor: colors.card
                      }
                    ]}
                  >
                    {isSelected && <Check size={16} color="#fff" strokeWidth={3} />}
                  </Pressable>
                )
              })}
            </View>

            {/* Action Button */}
            <View style={{ marginTop: 24 }}>
              <Pressable
                style={[
                  styles.addButton,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: radius.md
                  }
                ]}
                onPress={handleSave}
              >
                <Text style={[styles.addButtonText, { color: colors.foreground }]}>{memberToEdit ? "Update Member" : "Add Member"}</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.cancelButton,
                  {
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    marginTop: 12,
                  }
                ]}
                onPress={onClose}
              >
                <Text style={[styles.cancelButtonText, { color: colors.mutedForeground }]}>Cancel</Text>
              </Pressable>
              {memberToEdit && (
                <Pressable
                  style={[
                    styles.deleteButton,
                    {
                      marginTop: 12,
                      borderRadius: radius.md,
                      borderColor: colors.danger,
                      backgroundColor: colors.danger + '15',
                    }
                  ]}
                  onPress={handleDelete}
                  disabled={isDeleting}
                >
                  <Text style={[styles.deleteButtonText, { color: colors.danger }]}>Delete Member</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
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
    maxWidth: 380,
    height: MODAL_HEIGHT,
    padding: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  closeButton: {
    padding: 4,
    borderRadius: 999,
  },
  scrollContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    opacity: 0.8
  },
  input: {
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  avatarItem: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorItem: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
