import React, { useState, useEffect } from "react";
import { format } from "date-fns";
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
  Alert,
} from "react-native";
import { useFamily } from "../../contexts/FamilyContext";
import { useThemeColors } from "../../contexts/ThemeContext";
import { AppIcon, AppIconName, CustomDateTimePicker } from "../ui";
import { PROFILE_COLORS } from "../../constants/profileColors";

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
  const colors = useThemeColors();

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

      setEndDate(initDate);
      const defaultEndTime = new Date(initTime);
      defaultEndTime.setHours(defaultEndTime.getHours() + 1);
      setEndTime(defaultEndTime);

      setSelectedIcon("📅");
      setAllDay(false);
      setLocation("");

      // Default to active member if available
      const activeMemberObj = (members && members.length > 0)
        ? (members.find(m => m.isActive) || members[0])
        : null;

      setMemberId(activeMemberObj?.id || "1");

      // Auto-set color based on active/initial member
      const initialColor = activeMemberObj ? activeMemberObj.color : "member-blue";
      setColor(initialColor);

      setRepeatType("never");
      setRepeatEndDate(null);
      setReminder(true);
      setReminderTime("15");
      setNotes("");
      setShowRepeatOptions(false);
      setShowReminderOptions(false);
    }
  }, [open, initialDate, initialTime, members]);

  // Update color when member selection changes
  useEffect(() => {
    const selectedMember = members.find(m => m.id === memberId);
    if (selectedMember) {
      setColor(selectedMember.color);
    }
  }, [memberId, members]);

  const handleSave = () => {
    try {
      if (!name.trim()) {
        Alert.alert("Missing Information", "Please enter an event name.");
        return;
      }
      // Optional: if user really wants description required
      // if (!description.trim()) { Alert.alert("Missing Information", "Please enter a description."); return; }

      // Format date as YYYY-MM-DD using local time
      const formattedDate = format(startDate, "yyyy-MM-dd");

      // Format time as HH:MM AM/PM
      const formattedTime = allDay ? "All Day" : startTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const formattedEndTime = (allDay || !endTime) ? undefined : endTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      addEvent({
        title: name.trim(),
        date: formattedDate,
        time: formattedTime,
        endTime: formattedEndTime,
        icon: selectedIcon,
        memberId,
        location,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving event:", error);
      Alert.alert("Error", "Failed to save event. Please try again.");
    }
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
      <Pressable style={styles.overlay} onPress={() => onOpenChange(false)}>
        <Pressable
          style={[styles.container, { backgroundColor: colors.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.titleContainer}>
              <View style={[styles.headerIconCircle, { backgroundColor: colors.primary + "1A" }]}>
                <AppIcon name="calendar" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Event</Text>
            </View>
            <Pressable onPress={() => onOpenChange(false)} style={[styles.closeButton, { backgroundColor: colors.muted }]}>
              <AppIcon name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Event Name */}
            <TextInput
              style={[
                styles.nameInput,
                {
                  color: colors.foreground,
                  borderBottomWidth: 2,
                  borderBottomColor: colors.primary
                }
              ]}
              placeholder="Event name"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
              autoFocus={true}
            />

            {/* Description */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <AppIcon name="file" size={14} color={colors.mutedForeground} />
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Description</Text>
              </View>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.card, color: colors.foreground }]}
                placeholder="Add description..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Icon Selection */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <AppIcon name="tag" size={14} color={colors.mutedForeground} />
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Icon</Text>
              </View>
              <View style={styles.iconGrid}>
                {eventIcons.map((icon) => (
                  <Pressable
                    key={icon}
                    onPress={() => setSelectedIcon(icon)}
                    style={[
                      styles.iconButton,
                      { backgroundColor: colors.card },
                      selectedIcon === icon && { backgroundColor: colors.primary, transform: [{ scale: 1.1 }] }
                    ]}
                  >
                    <Text style={styles.iconText}>{icon}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* All Day Toggle */}
            <View style={[styles.toggleRow, { backgroundColor: colors.card }]}>
              <View style={styles.toggleLabelContainer}>
                <View style={[styles.iconBox, { backgroundColor: "#f973161A" }]}>
                  <AppIcon name="clock" size={18} color="#f97316" />
                </View>
                <Text style={[styles.toggleLabel, { color: colors.foreground }]}>All-day event</Text>
              </View>
              <Switch
                value={allDay}
                onValueChange={setAllDay}
                trackColor={{ false: colors.muted, true: colors.primary }}
              />
            </View>

            {/* Schedule */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Schedule</Text>
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
                style={[styles.expandableHeader, { backgroundColor: colors.card }]}
                onPress={() => setShowRepeatOptions(!showRepeatOptions)}
              >
                <View style={styles.toggleLabelContainer}>
                  <View style={[styles.iconBox, { backgroundColor: "#3b82f61A" }]}>
                    <AppIcon name="repeat" size={18} color="#3b82f6" />
                  </View>
                  <View>
                    <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Repeat</Text>
                    <Text style={[styles.valueLabel, { color: colors.mutedForeground }]}>{getRepeatLabel()}</Text>
                  </View>
                </View>
                <AppIcon
                  name="chevronDown"
                  size={20}
                  color={colors.mutedForeground}
                  style={{ transform: [{ rotate: showRepeatOptions ? '180deg' : '0deg' }] }}
                />
              </Pressable>

              {showRepeatOptions && (
                <View style={[styles.expandableContent, { backgroundColor: colors.card }]}>
                  <View style={styles.chipsContainer}>
                    {repeatOptions.map((option) => (
                      <Pressable
                        key={option.value}
                        onPress={() => setRepeatType(option.value)}
                        style={[
                          styles.chip,
                          { backgroundColor: colors.background },
                          repeatType === option.value && { backgroundColor: colors.primary }
                        ]}
                      >
                        <Text style={[
                          styles.chipText,
                          { color: colors.foreground },
                          repeatType === option.value && { color: colors.primaryForeground, fontWeight: "600" }
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
                style={[styles.expandableHeader, { backgroundColor: colors.card }]}
                onPress={() => setShowReminderOptions(!showReminderOptions)}
              >
                <View style={styles.toggleLabelContainer}>
                  <View style={[styles.iconBox, { backgroundColor: reminder ? "#22c55e1A" : colors.muted }]}>
                    <AppIcon name="bell" size={18} color={reminder ? "#22c55e" : colors.mutedForeground} />
                  </View>
                  <View>
                    <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Reminder</Text>
                    <Text style={[styles.valueLabel, { color: colors.mutedForeground }]}>{getReminderLabel()}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Switch
                    value={reminder}
                    onValueChange={setReminder}
                    trackColor={{ false: colors.muted, true: colors.primary }}
                  />
                  <AppIcon
                    name="chevronDown"
                    size={20}
                    color={colors.mutedForeground}
                    style={{ transform: [{ rotate: showReminderOptions ? '180deg' : '0deg' }] }}
                  />
                </View>
              </Pressable>

              {showReminderOptions && reminder && (
                <View style={[styles.expandableContent, { backgroundColor: colors.card }]}>
                  <View style={styles.chipsContainer}>
                    {reminderOptions.map((option) => (
                      <Pressable
                        key={option.value}
                        onPress={() => setReminderTime(option.value)}
                        style={[
                          styles.chip,
                          { backgroundColor: colors.background },
                          reminderTime === option.value && { backgroundColor: colors.primary }
                        ]}
                      >
                        <Text style={[
                          styles.chipText,
                          { color: colors.foreground },
                          reminderTime === option.value && { color: colors.primaryForeground, fontWeight: "600" }
                        ]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Color Selection - Hidden as it is auto-assigned */}
            {/* 
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Color</Text>
              <View style={styles.colorRow}>
                {eventColors.map((c) => (
                  <Pressable
                    key={c.value}
                    onPress={() => setColor(c.value)}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c.dot },
                      color === c.value && {
                        borderWidth: 3,
                        borderColor: colors.background,
                        shadowColor: colors.shadow,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                        transform: [{ scale: 1.1 }]
                      }
                    ]}
                  />
                ))}
              </View>
            </View> 
            */}

            {/* Location */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <AppIcon name="pin" size={14} color={colors.mutedForeground} />
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Location</Text>
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.foreground }]}
                value={location}
                onChangeText={setLocation}
                placeholder="Add location..."
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            {/* Assign To */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <AppIcon name="user" size={14} color={colors.mutedForeground} />
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Assign to</Text>
              </View>
              <View style={styles.chipsContainer}>
                {members.map((member) => {
                  const profileColor = PROFILE_COLORS.find(c => c.value === member.color)?.hex || colors.primary;
                  return (
                    <Pressable
                      key={member.id}
                      onPress={() => setMemberId(member.id)}
                      style={[
                        styles.memberChip,
                        { backgroundColor: colors.card },
                        memberId === member.id && { backgroundColor: profileColor }
                      ]}
                    >
                      <Text style={styles.memberEmoji}>{member.symbol}</Text>
                      <Text style={[
                        styles.memberChipText,
                        { color: colors.mutedForeground },
                        memberId === member.id && { color: "#fff" }
                      ]}>{member.name}</Text>
                    </Pressable>
                  );
                })}

              </View>
            </View>

            {/* Notes */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Notes</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.card, color: colors.foreground }]}
                placeholder="Add any additional notes..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <Pressable
              style={[styles.cancelButton, { backgroundColor: colors.muted }]}
              onPress={() => onOpenChange(false)}
            >
              <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
            >
              <Text style={[styles.saveButtonText, { color: colors.primaryForeground }]}>Add Event</Text>
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
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
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  nameInput: {
    fontSize: 24,
    fontWeight: "600",
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
  },
  textArea: {
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    textAlignVertical: "top",
    fontSize: 16,
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
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 20,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
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
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
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
  input: {
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  expandableHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
  },
  valueLabel: {
    fontSize: 13,
  },
  expandableContent: {
    marginTop: 12,
    padding: 12,
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
  },
  chipText: {
    fontSize: 14,
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
  memberChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  memberEmoji: {
    fontSize: 16,
  },
  memberChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
