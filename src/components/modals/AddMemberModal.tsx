import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from "react-native";
import { Check } from "lucide-react-native";

import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";
import { useFamily } from "../../contexts/FamilyContext";
import { PROFILE_COLORS } from "../../constants/profileColors";

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  memberToEdit?: any; // FamilyMember
}

const AVATARS = ["👤", "👩", "👨", "👶", "👧", "👦", "🧒", "👴", "👵", "👱", "👱‍♀️", "🧔", "👩‍🦰", "👨‍🦱", "👨‍🦳", "👩‍🦲"];

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ open, onClose, memberToEdit }) => {
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const { addMember, updateMember, members } = useFamily();

  const availableColors = PROFILE_COLORS.filter(c => !members.some((m: any) => m.color === c.value && m.id !== memberToEdit?.id));
  const initialColor = availableColors.length > 0 ? availableColors[0].value : PROFILE_COLORS[0].value;

  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [selectedColor, setSelectedColor] = useState(initialColor);

  // Initialize form when modal opens or memberToEdit changes
  React.useEffect(() => {
    if (open) {
      if (memberToEdit) {
        setName(memberToEdit.name);
        setSelectedAvatar(memberToEdit.symbol);
        setSelectedColor(memberToEdit.color);
      } else {
        setName("");
        setSelectedAvatar(AVATARS[0]);
        setSelectedColor(initialColor);
      }
      setError("");
    }
  }, [open, memberToEdit]);

  const handleSave = async () => {
    try {
      if (!name.trim()) {
        setError("Please enter a name");
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
          <Text style={[styles.heading, { color: colors.foreground }]}>{memberToEdit ? "Edit Member" : "Add New Member"}</Text>
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
            {AVATARS.map((avatar) => {
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
                  <Text style={{ fontSize: 24 }}>{avatar}</Text>
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
    maxWidth: 380,
    padding: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
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
  }
});
