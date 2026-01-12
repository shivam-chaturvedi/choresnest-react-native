import React, { useState, useEffect } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Switch,
  Platform,
} from "react-native";
import { theme } from "../../theme";
import { useFamily } from "../../contexts/FamilyContext";
import { AppIcon, AppIconName, CustomDateTimePicker } from "../ui";

interface AddEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: string;
  initialTime?: string;
}

const eventIcons: string[] = [
  "📅", "🎂", "🏫", "💼", "🏥", "🛒", "🎉", "🏋️", "🎬", "✈️", "🍽️", "👨‍👩‍👧", "💻", "📞", "🎵", "🏠"
];

const eventColors = [
  { name: "Blue", value: "member-blue", dot: "#3b82f6" },
  { name: "Green", value: "member-green", dot: "#22c55e" },
  { name: "Orange", value: "member-orange", dot: "#f97316" },
  { name: "Pink", value: "member-pink", dot: "#ec4899" },
  { name: "Purple", value: "member-purple", dot: "#8b5cf6" },
  { name: "Red", value: "member-red", dot: "#ef4444" },
];

const repeatOptions = [
  { value: "never", label: "Never repeats" },
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "Every week" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Every month" },
  { value: "yearly", label: "Every year" },
  { value: "weekday", label: "Every weekday (Mon-Fri)" },
  { value: "custom", label: "Custom..." },
];

const reminderOptions = [
  { value: "0", label: "At time of event" },
  { value: "5", label: "5 minutes before" },
  { value: "15", label: "15 minutes before" },
  { value: "30", label: "30 minutes before" },
  { value: "60", label: "1 hour before" },
  { value: "1440", label: "1 day before" },
  { value: "10080", label: "1 week before" },
];

export const AddEventModal: React.FC<AddEventModalProps> = ({
  open,
  onOpenChange,
  initialDate,
  initialTime,
}) => {
  const { members, addEvent } = useFamily();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [selectedIcon, setSelectedIcon] = useState("📅");
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [memberId, setMemberId] = useState("");
  const [color, setColor] = useState("member-blue");

  const [repeatType, setRepeatType] = useState("never");
  const [repeatEndDate, setRepeatEndDate] = useState<Date | null>(null);
  const [showRepeatOptions, setShowRepeatOptions] = useState(false);

  const [reminder, setReminder] = useState(true);
  const [reminderTime, setReminderTime] = useState("15");
  const [showReminderOptions, setShowReminderOptions] = useState(false);

  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      // Reset form
      setName("");
      setDescription("");

      // Parse initialDate if provided
      const initDate = initialDate ? new Date(initialDate) : new Date();
      setStartDate(initDate);

      // Parse initialTime if provided (format: "HH:MM AM/PM")
      const initTime = new Date();
      if (initialTime) {
        const timeParts = initialTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (timeParts) {
          let hours = parseInt(timeParts[1]);
          const minutes = parseInt(timeParts[2]);
          const period = timeParts[3].toUpperCase();

          if (period === "PM" && hours !== 12) hours += 12;
          if (period === "AM" && hours === 12) hours = 0;

          initTime.setHours(hours, minutes, 0, 0);
        }
      } else {
        initTime.setHours(9, 0, 0, 0);
      }
      setStartTime(initTime);

      setEndDate(null);
      setEndTime(null);
      setSelectedIcon("📅");
      setAllDay(false);
      setLocation("");
      setMemberId(members[0]?.id || "1");
      setColor("member-blue");
      setRepeatType("never");
      setRepeatEndDate(null);
      setReminder(true);
      setReminderTime("15");
      setNotes("");
      setShowRepeatOptions(false);
      setShowReminderOptions(false);
    }
  }, [open, initialDate, initialTime, members]);

  const handleSave = () => {
    if (!name.trim()) return;

    // Format date as YYYY-MM-DD
    const formattedDate = startDate.toISOString().split("T")[0];

    // Format time as HH:MM AM/PM
    const formattedTime = allDay ? "All Day" : startTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    addEvent({
      title: name.trim(),
      date: formattedDate,
      time: formattedTime,
      icon: selectedIcon,
      memberId,
      location,
    });

    onOpenChange(false);
  };

  const getRepeatLabel = () => {
    return repeatOptions.find(o => o.value === repeatType)?.label || "Never repeats";
  };

  const getReminderLabel = () => {
    if (!reminder) return "Off";
    return reminderOptions.find(o => o.value === reminderTime)?.label || "15 minutes before";
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => onOpenChange(false)}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <View style={styles.headerIconCircle}>
                <AppIcon name="calendar" size={20} color={theme.colors.primary} />
              </View>
              <Text style={styles.headerTitle}>New Event</Text>
            </View>
            <Pressable onPress={() => onOpenChange(false)} style={styles.closeButton}>
              <AppIcon name="x" size={20} color={theme.colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Event Name */}
            <TextInput
              style={styles.nameInput}
              placeholder="Event name"
              placeholderTextColor={theme.colors.mutedForeground}
              value={name}
              onChangeText={setName}
            />

            {/* Description */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <AppIcon name="file" size={14} color={theme.colors.mutedForeground} />
                <Text style={styles.label}>Description</Text>
              </View>
              <TextInput
                style={styles.textArea}
                placeholder="Add description..."
                placeholderTextColor={theme.colors.mutedForeground}
                multiline
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Icon Selection */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <AppIcon name="tag" size={14} color={theme.colors.mutedForeground} />
                <Text style={styles.label}>Icon</Text>
              </View>
              <View style={styles.iconGrid}>
                {eventIcons.map((icon) => (
                  <Pressable
                    key={icon}
                    onPress={() => setSelectedIcon(icon)}
                    style={[
                      styles.iconButton,
                      selectedIcon === icon && styles.iconButtonSelected
                    ]}
                  >
                    <Text style={styles.iconText}>{icon}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* All Day Toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelContainer}>
                <View style={[styles.iconBox, { backgroundColor: "rgba(249, 115, 22, 0.1)" }]}>
                  <AppIcon name="clock" size={18} color="#f97316" />
                </View>
                <Text style={styles.toggleLabel}>All-day event</Text>
              </View>
              <Switch
                value={allDay}
                onValueChange={setAllDay}
                trackColor={{ false: theme.colors.muted, true: theme.colors.primary }}
              />
            </View>

            {/* Schedule */}
            <View style={styles.fieldGroup}>
              <Text style={styles.sectionLabel}>Schedule</Text>
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <CustomDateTimePicker
                    mode="date"
                    value={startDate}
                    onChange={setStartDate}
                    label="Start Date"
                  />
                </View>
                {!allDay && (
                  <View style={styles.halfField}>
                    <CustomDateTimePicker
                      mode="time"
                      value={startTime}
                      onChange={setStartTime}
                      label="Start Time"
                    />
                  </View>
                )}
              </View>

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <CustomDateTimePicker
                    mode="date"
                    value={endDate || new Date()}
                    onChange={setEndDate}
                    label="End Date (Optional)"
                  />
                </View>
                {!allDay && (
                  <View style={styles.halfField}>
                    <CustomDateTimePicker
                      mode="time"
                      value={endTime || new Date()}
                      onChange={setEndTime}
                      label="End Time"
                    />
                  </View>
                )}
              </View>
            </View>

            {/* Repeat Options */}
            <View style={styles.fieldGroup}>
              <Pressable
                style={styles.expandableHeader}
                onPress={() => setShowRepeatOptions(!showRepeatOptions)}
              >
                <View style={styles.toggleLabelContainer}>
                  <View style={[styles.iconBox, { backgroundColor: "rgba(59, 130, 246, 0.1)" }]}>
                    <AppIcon name="repeat" size={18} color="#3b82f6" />
                  </View>
                  <View>
                    <Text style={styles.toggleLabel}>Repeat</Text>
                    <Text style={styles.valueLabel}>{getRepeatLabel()}</Text>
                  </View>
                </View>
                <AppIcon
                  name="chevronDown"
                  size={20}
                  color={theme.colors.mutedForeground}
                  style={{ transform: [{ rotate: showRepeatOptions ? '180deg' : '0deg' }] }}
                />
              </Pressable>

              {showRepeatOptions && (
                <View style={styles.expandableContent}>
                  <View style={styles.chipsContainer}>
                    {repeatOptions.map((option) => (
                      <Pressable
                        key={option.value}
                        onPress={() => setRepeatType(option.value)}
                        style={[
                          styles.chip,
                          repeatType === option.value && styles.chipActive
                        ]}
                      >
                        <Text style={[
                          styles.chipText,
                          repeatType === option.value && styles.chipTextActive
                        ]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {repeatType !== 'never' && (
                    <View style={{ marginTop: 12 }}>
                      <CustomDateTimePicker
                        mode="date"
                        value={repeatEndDate || new Date()}
                        onChange={setRepeatEndDate}
                        label="End repeat (Optional)"
                        placeholder="Never"
                      />
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Reminder Options */}
            <View style={styles.fieldGroup}>
              <Pressable
                style={styles.expandableHeader}
                onPress={() => setShowReminderOptions(!showReminderOptions)}
              >
                <View style={styles.toggleLabelContainer}>
                  <View style={[styles.iconBox, { backgroundColor: reminder ? "rgba(34, 197, 94, 0.1)" : theme.colors.muted }]}>
                    <AppIcon name="bell" size={18} color={reminder ? "#22c55e" : theme.colors.mutedForeground} />
                  </View>
                  <View>
                    <Text style={styles.toggleLabel}>Reminder</Text>
                    <Text style={styles.valueLabel}>{getReminderLabel()}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Switch
                    value={reminder}
                    onValueChange={setReminder}
                    trackColor={{ false: theme.colors.muted, true: theme.colors.primary }}
                  />
                  <AppIcon
                    name="chevronDown"
                    size={20}
                    color={theme.colors.mutedForeground}
                    style={{ transform: [{ rotate: showReminderOptions ? '180deg' : '0deg' }] }}
                  />
                </View>
              </Pressable>

              {showReminderOptions && reminder && (
                <View style={styles.expandableContent}>
                  <View style={styles.chipsContainer}>
                    {reminderOptions.map((option) => (
                      <Pressable
                        key={option.value}
                        onPress={() => setReminderTime(option.value)}
                        style={[
                          styles.chip,
                          reminderTime === option.value && styles.chipActive
                        ]}
                      >
                        <Text style={[
                          styles.chipText,
                          reminderTime === option.value && styles.chipTextActive
                        ]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Color Selection */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Color</Text>
              <View style={styles.colorRow}>
                {eventColors.map((c) => (
                  <Pressable
                    key={c.value}
                    onPress={() => setColor(c.value)}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c.dot },
                      color === c.value && styles.colorDotSelected
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Location */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <AppIcon name="pin" size={14} color={theme.colors.mutedForeground} />
                <Text style={styles.label}>Location</Text>
              </View>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="Add location..."
              />
            </View>

            {/* Assign To */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <AppIcon name="user" size={14} color={theme.colors.mutedForeground} />
                <Text style={styles.label}>Assign to</Text>
              </View>
              <View style={styles.chipsContainer}>
                {members.map((member) => (
                  <Pressable
                    key={member.id}
                    onPress={() => setMemberId(member.id)}
                    style={[
                      styles.memberChip,
                      memberId === member.id && styles.memberChipActive
                    ]}
                  >
                    <Text style={styles.memberEmoji}>{member.symbol}</Text>
                    <Text style={[
                      styles.memberChipText,
                      memberId === member.id && styles.memberChipTextActive
                    ]}>{member.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Add any additional notes..."
                placeholderTextColor={theme.colors.mutedForeground}
                multiline
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable
              style={styles.cancelButton}
              onPress={() => onOpenChange(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.saveButton}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Add Event</Text>
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: "92%",
    width: "100%",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 10 },
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.foreground,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.muted,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  nameInput: {
    fontSize: 24,
    fontWeight: "600",
    color: theme.colors.foreground,
    marginBottom: 24,
    paddingVertical: 8,
  },
  fieldGroup: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.mutedForeground,
  },
  textArea: {
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    textAlignVertical: "top",
    fontSize: 16,
    color: theme.colors.foreground,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonSelected: {
    backgroundColor: theme.colors.primary,
    transform: [{ scale: 1.1 }],
  },
  iconText: {
    fontSize: 20,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 16,
    marginBottom: 24,
  },
  toggleLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.colors.foreground,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.mutedForeground,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  halfField: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: theme.colors.mutedForeground,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: theme.colors.foreground,
  },
  expandableHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 16,
  },
  valueLabel: {
    fontSize: 13,
    color: theme.colors.mutedForeground,
  },
  expandableContent: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 16,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.card,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 14,
    color: theme.colors.foreground,
  },
  chipTextActive: {
    color: theme.colors.primaryForeground,
    fontWeight: "600",
  },
  colorRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: theme.colors.background,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    transform: [{ scale: 1.1 }],
  },
  memberChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.03)",
    gap: 6,
  },
  memberChipActive: {
    backgroundColor: theme.colors.primary,
  },
  memberEmoji: {
    fontSize: 16,
  },
  memberChipText: {
    fontSize: 14,
    color: theme.colors.mutedForeground,
    fontWeight: "500",
  },
  memberChipTextActive: {
    color: theme.colors.primaryForeground,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: "row",
    gap: 16,
    backgroundColor: theme.colors.background,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.muted,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.foreground,
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.primaryForeground,
  },
});
