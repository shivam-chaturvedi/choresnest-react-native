import React, { useState, useEffect, useCallback } from "react";
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
import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";
import { useFamily } from "../../contexts/FamilyContext";
import { PROFILE_COLORS } from "../../constants/profileColors";
import { AppIcon, CustomDateTimePicker } from "../ui";
import { useCountry } from "../../contexts/CountryContext";
import { toZonedTime } from "date-fns-tz";

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSave?: (task: TaskData) => void;
  taskToEdit?: any; // Task being edited
}

interface TaskData {
  name: string;
  icon: string;
  priority: string;
  dueDate: Date;
  person: string;
}

const taskIcons = ["📝", "📞", "💊", "📧", "🏫", "🔧", "📦", "🧹", "🧺", "🍽️", "🛏️", "🐕"];

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ open, onClose, onSave, taskToEdit }) => {
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const { members, activeMember } = useFamily();
  const { currentCountry } = useCountry();

  const priorities = [
    { label: "High", value: "high", color: colors.primary, bgColor: colors.danger + "20", textColor: colors.danger },
    { label: "Medium", value: "medium", color: colors.success, bgColor: colors.warning + "20", textColor: "#000000" }, // Adjusted for visibility
    { label: "Low", value: "low", color: colors.mutedForeground, bgColor: colors.muted, textColor: colors.mutedForeground },
  ];

  const defaultMemberId = members?.[0]?.id;
  const buildLocalizedNow = () => toZonedTime(new Date(), currentCountry.timeZone);

  const createDefaultTaskData = useCallback((): TaskData => ({
    name: "",
    icon: "📝",
    priority: "medium",
    dueDate: buildLocalizedNow(),
    person: activeMember?.id || defaultMemberId || "1",
  }), [currentCountry.timeZone, activeMember?.id, defaultMemberId]);

  const [formData, setFormData] = useState<TaskData>(createDefaultTaskData);

  useEffect(() => {
    if (!open) return;

    if (taskToEdit) {
      // Prefill form with existing task data
      const dueDate = new Date();

      // Parse date if available
      if (taskToEdit.date) {
        const [year, month, day] = taskToEdit.date.split('-').map(Number);
        dueDate.setFullYear(year, month - 1, day);
      }

      // Parse time if available (format: "HH:MM AM/PM")
      if (taskToEdit.due) {
        const timeMatch = taskToEdit.due.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          const period = timeMatch[3].toUpperCase();

          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;

          dueDate.setHours(hours, minutes, 0, 0);
        }
      }

      setFormData({
        name: taskToEdit.name || '',
        icon: taskToEdit.icon || '📝',
        priority: taskToEdit.priority || 'medium',
        dueDate: dueDate,
        person: taskToEdit.assignee || activeMember?.id || defaultMemberId || '1',
      });
    } else {
      // Reset to default for new task
      setFormData(createDefaultTaskData());
    }
  }, [open, taskToEdit, createDefaultTaskData, activeMember?.id, defaultMemberId]);


  const handleSave = () => {
    try {
      if (formData.name.trim()) {
        onSave?.(formData);
        setFormData(createDefaultTaskData());
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
          style={[styles.container, { backgroundColor: colors.card, borderRadius: radius.xl }]}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Task Name - Underline Style */}
            <TextInput
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Task name"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.nameInput,
                { color: colors.foreground, borderBottomColor: colors.primary }
              ]}
              autoFocus
            />

            {/* Icon Selection */}
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <AppIcon name="tag" size={16} color={colors.mutedForeground} />
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Icon</Text>
              </View>
              <View style={styles.iconGrid}>
                {taskIcons.map((icon) => (
                  <Pressable
                    key={icon}
                    onPress={() => setFormData({ ...formData, icon })}
                    style={[
                      styles.iconButton,
                      { backgroundColor: colors.muted, borderRadius: radius.md },
                      formData.icon === icon && { backgroundColor: colors.success, transform: [{ scale: 1.1 }] },
                    ]}
                  >
                    <Text style={styles.iconText}>{icon}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Priority */}
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <AppIcon name="alertCircle" size={16} color={colors.mutedForeground} />
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Priority</Text>
              </View>
              <View style={styles.priorityRow}>
                {priorities.map((p) => {
                  const isSelected = formData.priority === p.value;
                  return (
                    <Pressable
                      key={p.value}
                      onPress={() => setFormData({ ...formData, priority: p.value })}
                      style={[
                        styles.priorityButton,
                        { backgroundColor: colors.muted, borderRadius: radius.md },
                        isSelected && {
                          backgroundColor: p.bgColor,
                          borderColor: p.textColor,
                          borderWidth: 1
                        }
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
            </View>

            {/* Due Date & Time */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.mutedForeground, marginVertical: 8 }]}>Due Date</Text>
              <View style={styles.dateTimeRow}>
                <View style={{ flex: 1.5 }}>
                  <CustomDateTimePicker
                    mode="date"
                    value={formData.dueDate}
                    onChange={(date) => setFormData({ ...formData, dueDate: date })}
                    label=""
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <CustomDateTimePicker
                    mode="time"
                    value={formData.dueDate}
                    onChange={(date) => setFormData({ ...formData, dueDate: date })}
                    label=""
                  />
                </View>
              </View>
            </View>

            {/* Assign To */}
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <AppIcon name="user" size={16} color={colors.mutedForeground} />
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Assign to</Text>
              </View>
              <View style={styles.assigneeRow}>
                {members.map((member: any) => {
                  const profileColor = PROFILE_COLORS.find(c => c.value === member.color)?.hex || colors.primary;
                  const isSelected = formData.person === member.id;
                  return (
                    <Pressable
                      key={member.id}
                      onPress={() => setFormData({ ...formData, person: member.id })}
                      style={[
                        styles.assigneeButton,
                        { backgroundColor: colors.muted, borderRadius: radius.full },
                        isSelected && { backgroundColor: profileColor },
                      ]}
                    >
                      <Text style={styles.assigneeEmoji}>{member.symbol}</Text>
                      <Text style={[
                        styles.assigneeText,
                        { color: colors.mutedForeground },
                        isSelected && { color: "#fff" }
                      ]}>
                        {member.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Footer Buttons */}
            <View style={styles.footer}>
              <Pressable
                style={[
                  styles.cancelButton,
                  { borderColor: colors.border, borderRadius: radius.md }
                ]}
                onPress={onClose}
              >
                <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.saveButton,
                  { backgroundColor: colors.success, borderRadius: radius.md }
                ]}
                onPress={handleSave}
              >
                <Text style={[styles.saveButtonText, { color: colors.primaryForeground }]}>{taskToEdit ? 'Update Task' : 'Add Task'}</Text>
              </Pressable>
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
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end", // Bottom-aligned
  },
  container: {
    padding: 24,
    backgroundColor: 'white',
    maxHeight: "90%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  section: {
    marginBottom: 20,
  },
  nameInput: {
    fontSize: 24,
    fontWeight: "700",
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  iconButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    fontSize: 20,
  },
  priorityRow: {
    flexDirection: "row",
    gap: 12,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  priorityText: {
    fontWeight: "700",
    fontSize: 14,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  assigneeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  assigneeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  assigneeEmoji: {
    fontSize: 16,
  },
  assigneeText: {
    fontWeight: "600",
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelButtonText: {
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: {
    fontWeight: "600",
  },
});
