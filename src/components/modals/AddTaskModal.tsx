import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { useThemeColors } from "../../contexts/ThemeContext";
import { useFamily } from "../../contexts/FamilyContext";
import { PROFILE_COLORS } from "../../constants/profileColors";
import { theme } from "../../theme";
import { AppIcon, CustomDateTimePicker } from "../ui";

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSave?: (task: TaskData) => void;
}

interface TaskData {
  name: string;
  icon: string;
  priority: string;
  dueDate: Date;
  person: string;
}

const taskIcons = ["📝", "📞", "💊", "📧", "🏫", "🔧", "📦", "🧹", "🧺", "🍽️", "🛏️", "🐕"];

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ open, onClose, onSave }) => {
  const colors = useThemeColors();
  const { members, activeMember } = useFamily();

  const priorities = [
    { label: "High", value: "high", color: colors.primary, bgColor: colors.danger + "20", textColor: colors.danger },
    { label: "Medium", value: "medium", color: colors.success, bgColor: colors.warning + "20", textColor: colors.warningLight }, // Adjusted for visibility
    { label: "Low", value: "low", color: colors.mutedForeground, bgColor: colors.muted, textColor: colors.mutedForeground },
  ];

  const [formData, setFormData] = useState<TaskData>({
    name: "",
    icon: "📝",
    priority: "medium",
    dueDate: new Date(),
    person: activeMember?.id || (members?.[0]?.id || "1"),
  });


  const handleSave = () => {
    try {
      if (formData.name.trim()) {
        onSave?.(formData);
        setFormData({
          name: "",
          icon: "📝",
          priority: "medium",
          dueDate: new Date(),
          person: activeMember?.id || (members?.[0]?.id || "1"),
        });
        onClose();
      }
    } catch (error) {
      console.error("Error saving task:", error);
      import('react-native').then(({ Alert }) => {
        Alert.alert("Error", "Failed to save task. Please try again.");
      });
    }
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.container, { backgroundColor: colors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppIcon name="checkSquare" size={20} color={colors.success} style={{ marginRight: 8 }} />
              <Text style={[styles.title, { color: colors.foreground }]}>Add New Task</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Task Name */}
            <Text style={[styles.label, { color: colors.foreground }]}>Task Name</Text>
            <TextInput
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter task name"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
            />

            {/* Icon Selection */}
            <Text style={[styles.label, { color: colors.foreground }]}>Choose Icon</Text>
            <View style={styles.iconRow}>
              {taskIcons.map((icon) => (
                <Pressable
                  key={icon}
                  onPress={() => setFormData({ ...formData, icon })}
                  style={[
                    styles.iconButton,
                    { backgroundColor: colors.muted },
                    formData.icon === icon && { backgroundColor: colors.success, transform: [{ scale: 1.1 }] },
                  ]}
                >
                  <Text style={styles.iconText}>{icon}</Text>
                </Pressable>
              ))}
            </View>

            {/* Priority */}
            <Text style={[styles.label, { color: colors.foreground }]}>Priority</Text>
            <View style={styles.priorityRow}>
              {priorities.map((p) => {
                const isSelected = formData.priority === p.value;
                return (
                  <Pressable
                    key={p.value}
                    onPress={() => setFormData({ ...formData, priority: p.value })}
                    style={[
                      styles.priorityButton,
                      { backgroundColor: colors.muted },
                      isSelected && { backgroundColor: p.bgColor, borderColor: p.textColor, borderWidth: 1 }
                    ]}
                  >
                    <Text style={[
                      styles.priorityText,
                      { color: isSelected ? p.textColor : colors.mutedForeground }
                    ]}>{p.label}</Text>
                  </Pressable>
                )
              })}
            </View>

            {/* Due Date */}
            <CustomDateTimePicker
              mode="date"
              value={formData.dueDate}
              onChange={(date) => setFormData({ ...formData, dueDate: date })}
              label="Due Date"
            />

            {/* Assign To */}
            <Text style={[styles.label, { color: colors.foreground }]}>Assign To</Text>
            <View style={styles.assigneeRow}>
              {members.map((member) => {
                const profileColor = PROFILE_COLORS.find(c => c.value === member.color)?.hex || colors.primary;
                const isSelected = formData.person === member.id;
                return (
                  <Pressable
                    key={member.id}
                    onPress={() => setFormData({ ...formData, person: member.id })}
                    style={[
                      styles.assigneeButton,
                      { backgroundColor: colors.muted },
                      isSelected && { backgroundColor: profileColor },
                    ]}
                  >
                    <Text style={[
                      styles.assigneeText,
                      { color: colors.mutedForeground },
                      isSelected && { color: "#fff" }
                    ]}>
                      {member.symbol} {member.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[
                styles.cancelButton,
                { borderColor: colors.border }
              ]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.saveButton,
                { backgroundColor: colors.success }
              ]}
              onPress={handleSave}
            >
              <Text style={[styles.saveButtonText, { color: colors.primaryForeground }]}>Add Task</Text>
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
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    padding: 16,
  },
  container: {
    borderRadius: 24,
    padding: 20,
    maxHeight: "85%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  iconRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    fontSize: 20,
  },
  priorityRow: {
    flexDirection: "row",
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  priorityText: {
    fontWeight: "600",
  },
  assigneeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  assigneeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  assigneeText: {
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelButtonText: {
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: {
    fontWeight: "600",
  },
});
