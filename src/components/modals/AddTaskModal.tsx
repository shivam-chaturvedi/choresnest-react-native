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
const priorities = [
  { label: "High", value: "high", color: theme.colors.primary, bgColor: "#FEE2E2", textColor: "#991B1B" },
  { label: "Medium", value: "medium", color: theme.colors.success, bgColor: "#FEF3C7", textColor: "#92400E" },
  { label: "Low", value: "low", color: theme.colors.mutedForeground, bgColor: "#F3F4F6", textColor: "#374151" },
];
const familyMembers = ["You", "Mom", "Dad", "Kids"];

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ open, onClose, onSave }) => {
  const [formData, setFormData] = useState<TaskData>({
    name: "",
    icon: "📝",
    priority: "medium",
    dueDate: new Date(),
    person: "You",
  });

  const handleSave = () => {
    if (formData.name.trim()) {
      onSave?.(formData);
      setFormData({
        name: "",
        icon: "📝",
        priority: "medium",
        dueDate: new Date(),
        person: "You",
      });
      onClose();
    }
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppIcon name="checkSquare" size={20} color={theme.colors.success} style={{ marginRight: 8 }} />
              <Text style={styles.title}>Add New Task</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Task Name */}
            <Text style={styles.label}>Task Name</Text>
            <TextInput
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter task name"
              placeholderTextColor={theme.colors.mutedForeground}
              style={styles.input}
            />

            {/* Icon Selection */}
            <Text style={styles.label}>Choose Icon</Text>
            <View style={styles.iconRow}>
              {taskIcons.map((icon) => (
                <Pressable
                  key={icon}
                  onPress={() => setFormData({ ...formData, icon })}
                  style={[
                    styles.iconButton,
                    formData.icon === icon && styles.iconButtonActive,
                  ]}
                >
                  <Text style={styles.iconText}>{icon}</Text>
                </Pressable>
              ))}
            </View>

            {/* Priority */}
            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityRow}>
              {priorities.map((p) => {
                const isSelected = formData.priority === p.value;
                return (
                  <Pressable
                    key={p.value}
                    onPress={() => setFormData({ ...formData, priority: p.value })}
                    style={[
                      styles.priorityButton,
                      isSelected && { backgroundColor: p.bgColor, borderColor: p.textColor, borderWidth: 1 }
                    ]}
                  >
                    <Text style={[
                      styles.priorityText,
                      isSelected ? { color: p.textColor } : { color: theme.colors.mutedForeground }
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

            {/* Assign Person */}
            <Text style={styles.label}>Assign To</Text>
            <View style={styles.assigneeRow}>
              {familyMembers.map((member) => (
                <Pressable
                  key={member}
                  onPress={() => setFormData({ ...formData, person: member })}
                  style={[
                    styles.assigneeButton,
                    formData.person === member && styles.assigneeButtonActive,
                  ]}
                >
                  <Text style={[
                    styles.assigneeText,
                    formData.person === member && styles.assigneeTextActive
                  ]}>{member}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Add Task</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    padding: theme.spacing.md,
  },
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    padding: theme.spacing.lg,
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
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.foreground,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.foreground,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: theme.colors.muted,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: theme.colors.foreground,
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
    backgroundColor: theme.colors.muted,
    justifyContent: "center",
    alignItems: "center",
  },
  iconButtonActive: {
    backgroundColor: theme.colors.success,
    transform: [{ scale: 1.1 }],
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
    backgroundColor: theme.colors.muted,
  },
  priorityText: {
    fontWeight: "600",
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.muted,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  dateInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.foreground,
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
    backgroundColor: theme.colors.muted,
  },
  assigneeButtonActive: {
    backgroundColor: theme.colors.success,
  },
  assigneeText: {
    fontWeight: "600",
    color: theme.colors.mutedForeground,
  },
  assigneeTextActive: {
    color: "#fff",
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
    borderColor: theme.colors.border,
    alignItems: "center",
  },
  cancelButtonText: {
    fontWeight: "600",
    color: theme.colors.foreground,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.success,
    alignItems: "center",
  },
  saveButtonText: {
    fontWeight: "600",
    color: "#fff",
  },
});
