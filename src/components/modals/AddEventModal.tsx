import React, { useState, useEffect, useRef } from "react";

import { safeFormat } from "../../utils/SafeDateUtils";
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
import { useFamily, CalendarEvent } from "../../contexts/FamilyContext";
import { useThemeColors, useTheme } from "../../contexts/ThemeContext";
import { useCountry } from "../../contexts/CountryContext";
import { AppIcon, AppIconName, CustomDateTimePicker } from "../ui";
import { PROFILE_COLORS } from "../../constants/profileColors";
import { NotificationPreferencesService } from "../../services/NotificationPreferencesService";
import { SyncService } from "../../services/SyncService";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface AddEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: string;
  initialTime?: string;
  eventToEdit?: CalendarEvent;
  onSelectEvent?: (event: CalendarEvent | any) => void;
}

const eventIcons: string[] = [
  "calendar-star", "cake-variant", "school", "briefcase", "hospital-building", "cart", "party-popper", "weight-lifter", "movie", "airplane", "silverware", "home-group", "laptop", "phone", "music", "home"
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

// Removed visibility and time zone options as requested

export const AddEventModal: React.FC<AddEventModalProps> = ({
  open,
  onOpenChange,
  initialDate,
  initialTime,
  eventToEdit,
  onSelectEvent,
}) => {
  /* Hook and State Setup */
  const { members, activeMember, events, tasks, addEvent, updateEvent, deleteEvent, addTask, updateTask, deleteTask } = useFamily();
  const colors = useThemeColors();
  const { appearanceMode } = useTheme();
  const isMidnight = appearanceMode === "midnight";
  const accentColor = isMidnight ? colors.foreground : colors.primary;
  const { currentCountry } = useCountry();

  const getPriorityMeta = (priority: string = "medium") => {
    switch (priority) {
      case "high":
        return { label: "High", color: colors.danger, background: colors.danger + "20", borderColor: colors.danger };
      case "medium":
        return { label: "Medium", color: colors.warning, background: colors.warning + "20", borderColor: colors.warning };
      default:
        return { label: "Low", color: colors.info, background: colors.info + "30", borderColor: colors.info };
    }
  };

  const [activeTab, setActiveTab] = useState<'event' | 'task' | 'existing'>('event');

  /* Event State */

  const isEditing = !!eventToEdit;
  const ownerIdCandidates = [
    eventToEdit?.memberId,
    eventToEdit?.assigneeId,
    eventToEdit?.assignee,
    (eventToEdit as any)?.ownerId,
  ];
  const ownerId = (ownerIdCandidates.find((id) => !!id) || "").trim();
  const isOwner = !eventToEdit || !ownerId || ownerId === activeMember?.id;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(() => new Date());
  const [startTime, setStartTime] = useState(() => new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [selectedIcon, setSelectedIcon] = useState("calendar-star");
  const [allDay, setAllDay] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [color, setColor] = useState("member-blue");

  const [repeatType, setRepeatType] = useState("never");
  const [repeatEndDate, setRepeatEndDate] = useState<Date | null>(null);
  const [showRepeatOptions, setShowRepeatOptions] = useState(false);

  /* Task State */
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskIcon, setTaskIcon] = useState("format-list-checks");


  const [reminder, setReminder] = useState(true);
  const [reminderTime, setReminderTime] = useState("15");
  const [defaultEventReminderMinutes, setDefaultEventReminderMinutes] = useState(15);
  const [showReminderOptions, setShowReminderOptions] = useState(false);

  const [notes, setNotes] = useState("");
  // Removed visibility and time zone states as requested

  const membersRef = useRef(members);
  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  useEffect(() => {
    let isMounted = true;
    NotificationPreferencesService.getReminderTime("events")
      .then((minutes) => {
        if (isMounted) {
          setDefaultEventReminderMinutes(minutes);
        }
      })
      .catch((error) => {
        console.error("Failed to load event reminder preference:", error);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const membersSnapshot = membersRef.current;
    const findMember = (id?: string) => membersSnapshot.find((m) => m.id === id);
    const defaultMember = membersSnapshot.find((m) => m.isActive) || membersSnapshot[0] || null;

    if (eventToEdit) {
      setActiveTab((eventToEdit as any).type === 'task' ? 'task' : 'event');
      const eventName = eventToEdit.title || (eventToEdit as any).name || "";
      setName(eventName);
      setDescription(eventToEdit.description || "");
      setNotes(eventToEdit.notes || "");
      setStartDate(new Date(eventToEdit.date));

      if (eventToEdit.time === "All Day") {
        setAllDay(true);
      } else {
        setAllDay(false);
        const timeParts = eventToEdit.time.match(/(\d+):(\d+)(\s*(AM|PM))?/i);
        if (timeParts) {
          let hours = parseInt(timeParts[1]);
          const minutes = parseInt(timeParts[2]);
          const period = timeParts[3] ? timeParts[3].trim().toUpperCase() : null;

          if (period === "PM" && hours !== 12) hours += 12;
          if (period === "AM" && hours === 12) hours = 0;

          const timeDate = new Date();
          timeDate.setHours(hours, minutes, 0, 0);
          setStartTime(timeDate);
        }
      }

      if (eventToEdit.endTime) {
        const timeParts = eventToEdit.endTime.match(/(\d+):(\d+)(\s*(AM|PM))?/i);
        if (timeParts) {
          let hours = parseInt(timeParts[1]);
          const minutes = parseInt(timeParts[2]);
          const period = timeParts[3] ? timeParts[3].trim().toUpperCase() : null;

          if (period === "PM" && hours !== 12) hours += 12;
          if (period === "AM" && hours === 12) hours = 0;

          const timeDate = new Date();
          timeDate.setHours(hours, minutes, 0, 0);
          setEndTime(timeDate);
        }
      } else {
        setEndTime(null);
      }

      setMemberId(eventToEdit.memberId || (eventToEdit as any).assignee || eventToEdit.assigneeId || "");

      const anyEvent = eventToEdit as any;
      if (anyEvent.type === 'task') {
        setActiveTab('task');
        setTaskPriority(anyEvent.priority || "medium");
        setTaskIcon(anyEvent.icon || "format-list-checks");
      } else {
        setActiveTab('event');
        setSelectedIcon(eventToEdit.icon || "calendar-star");
      }

      const member = findMember(eventToEdit.memberId);
      if (member) {
        setColor(member.color);
      } else if (defaultMember) {
        setColor(defaultMember.color);
      }

      if (eventToEdit.recurrenceRule) setRepeatType(eventToEdit.recurrenceRule);
      if (eventToEdit.recurrenceEndDate) setRepeatEndDate(new Date(eventToEdit.recurrenceEndDate));
      if (eventToEdit.endDate) {
        setEndDate(new Date(eventToEdit.endDate));
      } else {
        setEndDate(null);
      }
      if (eventToEdit.reminderOffsetMinutes !== undefined) {
        if (eventToEdit.reminderOffsetMinutes < 0) {
          setReminder(false);
          setReminderTime("15");
        } else {
          const matchOption = reminderOptions.find(o => parseInt(o.value, 10) === eventToEdit.reminderOffsetMinutes);
          setReminderTime(matchOption ? matchOption.value : eventToEdit.reminderOffsetMinutes.toString());
          setReminder(true);
        }
      } else {
        setReminder(true);
        setReminderTime(defaultEventReminderMinutes.toString());
      }
    } else {
      setActiveTab('event');
      setName("");
      setDescription("");
      setNotes("");

      const initDate = initialDate ? new Date(initialDate) : new Date();
      setStartDate(initDate);

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

      setSelectedIcon("calendar-star");
      setAllDay(false);
      const fallbackMember = defaultMember;
      setMemberId(fallbackMember?.id || membersSnapshot[0]?.id || "");
      setColor(fallbackMember?.color || "member-blue");

      setRepeatType("never");
      setRepeatEndDate(null);
      setReminder(true);
      setReminderTime(defaultEventReminderMinutes.toString());
      setShowRepeatOptions(false);
    }
  }, [open, eventToEdit?.id, initialDate, initialTime, defaultEventReminderMinutes]);



  // Helper to format time range
  const formatTimeRange = (start?: string, end?: string) => {
    if (!start) return "All Day";
    if (!end) return start;
    return `${start} - ${end}`;
  };

  // Helper to get events for the selected start date
  const getExistingItems = () => {
    const targetDateStr = safeFormat(startDate, "yyyy-MM-dd");

    // Using events and tasks from context (now destructured)
    const allEvents = events || [];
    const allTasks = tasks || [];

    const relevantEvents = allEvents.filter((e: any) => e.date === targetDateStr).map((e: any) => ({ ...e, type: 'event' }));
    const relevantTasks = allTasks.filter((t: any) => t.date === targetDateStr && t.status !== 'done').map((t: any) => ({
      id: t.id,
      title: t.name,
      icon: t.icon,
      date: t.date,
      time: t.due,
      endTime: undefined, // tasks usually don't have end time displayed same way
      startTime: t.due,
      memberId: t.assignee,
      type: 'task',
      priority: t.priority
    }));

    return [...relevantEvents, ...relevantTasks].sort((a, b) => {
      const timeA = a.time || "00:00";
      const timeB = b.time || "00:00";
      return timeA.localeCompare(timeB);
    });
  };

  // Update color when member selection changes
  useEffect(() => {
    const currentMembers = membersRef.current;
    const selectedMember = currentMembers.find((m: any) => m.id === memberId);
    if (selectedMember) {
      setColor(selectedMember.color);
      return;
    }

    if (!memberId && currentMembers.length > 0) {
      const active = currentMembers.find((m: any) => m.isActive) || currentMembers[0];
      if (active) {
        setMemberId(active.id);
        setColor(active.color);
      }
    }
  }, [memberId]);



  const handleSave = async () => {
    try {
      if (!name.trim()) {
        Alert.alert("Missing Information", `Please enter a ${activeTab === 'event' ? 'event' : 'task'} name.`);
        return;
      }

      const deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const fallbackTimeZone = deviceTimeZone || currentCountry.timeZone;
      const eventTimeZone = eventToEdit?.timeZone || fallbackTimeZone;

      // FIX: Use local time directly instead of converting to UTC to prevent time shifts
      const formattedDate = safeFormat(startDate, "yyyy-MM-dd");

      let formattedTime: string;
      let formattedEndTime: string | undefined;
      let formattedEndDate: string | undefined;

      if (allDay) {
        formattedTime = "12:00 AM";
        formattedEndTime = "11:59 PM";
      } else {
        formattedTime = safeFormat(startTime, "hh:mm aa");

        if (endTime) {
          formattedEndTime = safeFormat(endTime, "hh:mm aa");
        }
      }

      if (endDate) {
        formattedEndDate = safeFormat(endDate, "yyyy-MM-dd");
      }

      const reminderOffsetMinutes = reminder ? parseInt(reminderTime, 10) : -1;

      if (activeTab === 'task') {
        if (isEditing && eventToEdit) {
          await updateTask(eventToEdit.id, {
            name: name.trim(),
            icon: taskIcon,
            priority: taskPriority as any,
            dateString: formattedDate,
            dueDisplay: formattedTime,
            assigneeId: memberId,
          });
        } else {
          await addTask({
            name: name.trim(),
            icon: taskIcon,
            priority: taskPriority as any,
            dateString: formattedDate,
            dueDisplay: formattedTime,
            assigneeId: memberId,
            tab: "My Tasks",
            status: 'pending'
          });
        }
      } else {
        if (isEditing && eventToEdit) {
            await updateEvent(eventToEdit.id, {
              title: name.trim(),
              description: description.trim(),
              notes: notes.trim(),
              dateString: formattedDate,
              time: formattedTime,
              endTime: formattedEndTime,
              icon: selectedIcon,
              memberId,
              endDate: formattedEndDate,
              isRecurring: repeatType !== 'never',
              recurrenceRule: repeatType !== 'never' ? repeatType : undefined,
              recurrenceEndDate: safeFormat(repeatEndDate, "yyyy-MM-dd"),
              reminderOffsetMinutes,
              timeZone: eventTimeZone,
            });
        } else {
          // Validation for recurring events
          if (repeatType !== 'never') {
            if (!repeatEndDate) {
              Alert.alert("Missing End Date", "Please select an end date for this recurring event.");
              return;
            }
            if (repeatEndDate <= new Date()) {
              Alert.alert("Invalid End Date", "End date must be in the future.");
              return;
            }
          }

          await addEvent({
            title: name.trim(),
            description: description.trim(),
            notes: notes.trim(),
            dateString: formattedDate,
            time: formattedTime,
            endTime: formattedEndTime,
            icon: selectedIcon,
            memberId,
            endDate: formattedEndDate,
            isRecurring: repeatType !== 'never',
            recurrenceRule: repeatType !== 'never' ? repeatType : undefined,
            recurrenceEndDate: safeFormat(repeatEndDate, "yyyy-MM-dd"),
            reminderOffsetMinutes,
            timeZone: eventTimeZone,
          });
        }
      }

      try {
        await SyncService.requestSyncSoon();
      } catch (syncError) {
        console.warn('Failed to trigger sync after event save:', syncError);
      }
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
    const option = reminderOptions.find(o => o.value === reminderTime);
    if (option) return option.label;
    const minutes = parseInt(reminderTime, 10);
    if (!isNaN(minutes)) {
      if (minutes >= 60 && minutes % 60 === 0) {
        const hours = minutes / 60;
        return `${hours} hour${hours === 1 ? "" : "s"} before`;
      }
      return `${minutes} minutes before`;
    }
    return "Reminder set";
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => onOpenChange(false)}>
      <View style={styles.overlay}>
        <View
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.titleContainer}>
              <View style={[styles.headerIconCircle, { backgroundColor: colors.primary + "1A" }]}>
                <AppIcon name="calendar" size={20} color={accentColor} />
              </View>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                {isEditing ? (activeTab === 'task' ? "Edit Task" : "Edit Event") : (activeTab === 'task' ? "New Task" : "New Event")}
              </Text>
            </View>
            <Pressable onPress={() => onOpenChange(false)} style={[styles.closeButton, { backgroundColor: colors.muted }]}>
              <AppIcon name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Tab Switcher */}
          {!isEditing && (
            <View style={[styles.tabContainer, { backgroundColor: colors.muted }]}>
              <Pressable
                style={[styles.tabButton, activeTab === 'event' && { backgroundColor: colors.card, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 2 }]}
                onPress={() => setActiveTab('event')}
              >
                <Text style={[styles.tabText, { color: activeTab === 'event' ? accentColor : colors.mutedForeground }]}>Event</Text>
              </Pressable>
              <Pressable
                style={[styles.tabButton, activeTab === 'task' && { backgroundColor: colors.card, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 2 }]}
                onPress={() => setActiveTab('task')}
              >
                <Text style={[styles.tabText, { color: activeTab === 'task' ? accentColor : colors.mutedForeground }]}>Task</Text>
              </Pressable>
              <Pressable
                style={[styles.tabButton, activeTab === 'existing' && { backgroundColor: colors.card, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 2 }]}
                onPress={() => setActiveTab('existing')}
              >
                <Text style={[styles.tabText, { color: activeTab === 'existing' ? accentColor : colors.mutedForeground }]}>Existing</Text>
              </Pressable>
            </View>
          )}

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {activeTab === 'existing' ? (
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>
                    {safeFormat(startDate, "MMMM d, yyyy")}
                  </Text>
                  <Pressable
                    onPress={() => setActiveTab('event')}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <AppIcon name="plus" size={16} color={accentColor} />
                    <Text style={{ color: accentColor, fontWeight: '500' }}>Add New</Text>
                  </Pressable>
                </View>

                {getExistingItems().length === 0 ? (
                  <View style={{ alignItems: 'center', padding: 24, gap: 12 }}>
                    <Text style={{ fontSize: 40 }}>📅</Text>
                    <Text style={{ color: colors.mutedForeground, textAlign: 'center' }}>No events or tasks for this day.</Text>
                    <Pressable
                      onPress={() => setActiveTab('event')}
                      style={{ marginTop: 8, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.primary, borderRadius: 8 }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '600' }}>Create Event</Text>
                    </Pressable>
                  </View>
                ) : (
                  getExistingItems().map((item: any, index) => {
                    const member = members.find((m: any) => m.id === item.memberId);
                    const profileColor = PROFILE_COLORS.find(c => c.value === member?.color)?.hex || colors.primary;
                    const priorityMeta = getPriorityMeta(item.priority);

                    return (
                      <Pressable
                        key={`${item.type}-${item.id}`}
                        onPress={() => {
                          if (onSelectEvent) {
                            onSelectEvent(item);
                          }
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 12,
                          backgroundColor: colors.card,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: colors.border,
                          gap: 12,
                          position: 'relative',
                        }}
                      >
                        <View style={{
                          width: 4,
                          height: 32,
                          borderRadius: 2,
                          backgroundColor: item.type === 'task' ? colors.danger : profileColor
                        }} />

                        <View style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: item.type === 'task' ? colors.danger + '10' : profileColor + '10',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <MaterialCommunityIcons name={item.icon || 'calendar'} size={24} color={item.type === 'task' ? colors.danger : profileColor} />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>{item.title}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                              {item.time}
                            </Text>
                            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.mutedForeground }} />
                            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                              {member?.name}
                            </Text>
                          </View>
                        </View>

                        <View style={{ padding: 4 }}>
                          <AppIcon name="chevronRight" size={16} color={colors.mutedForeground} />
                        </View>
                        {item.type === 'task' && (
                          <View style={[styles.priorityBadge, { backgroundColor: priorityMeta.background, borderColor: priorityMeta.borderColor }]}>
                            <Text style={[styles.priorityBadgeText, { color: priorityMeta.color }]}>
                              {priorityMeta.label}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })
                )}
              </View>
            ) : (
              // Original Form Content
              <>
                {/* Ownership Notice */}
                {!isOwner && eventToEdit && (
                  <View style={[styles.ownerNotice, { backgroundColor: colors.primary + "1A" }]}>
                    <AppIcon name="info" size={16} color={accentColor} />
                    <Text style={[styles.ownerNoticeText, { color: accentColor }]}>
                      Only {members.find((m: any) => m.id === eventToEdit.memberId)?.name || "the owner"} can update this event
                    </Text>
                  </View>
                )}

                {/* Event/Task Name */}
                <TextInput
                  style={[
                    styles.nameInput,
                    {
                      color: colors.foreground,
                      borderBottomWidth: 2,
                      borderBottomColor: accentColor
                    }
                  ]}
                  placeholder={activeTab === 'event' ? "Event name" : "Task name"}
                  placeholderTextColor={colors.mutedForeground}
                  value={name}
                  onChangeText={setName}
                  autoFocus={!isEditing}
                  editable={activeTab === 'task' || isOwner}
                />

                {/* Task Specific Fields */}
                {activeTab === 'task' && (
                  <>
                    {/* Icon Selection - TASK ONLY */}
                    <View style={styles.fieldGroup}>
                      <View style={styles.labelRow}>
                        <AppIcon name="tag" size={14} color={colors.mutedForeground} />
                        <Text style={[styles.label, { color: colors.mutedForeground }]}>Icon</Text>
                      </View>
                      <View style={styles.iconGrid}>
                        {["format-list-checks", "phone", "pill", "email", "school", "wrench", "package-variant", "broom", "basket", "silverware", "bed", "dog"].map((icon) => (
                          <Pressable
                            key={icon}
                            onPress={() => setTaskIcon(icon)}
                            style={[
                              styles.iconButton,
                              { backgroundColor: colors.card },
                              taskIcon === icon && { backgroundColor: colors.success, transform: [{ scale: 1.1 }] },
                            ]}
                          >
                            <MaterialCommunityIcons name={icon} size={24} color={taskIcon === icon ? colors.background : colors.foreground} />
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    {/* Priority - TASK ONLY */}
                    <View style={styles.fieldGroup}>
                      <View style={styles.labelRow}>
                        <AppIcon name="alertCircle" size={14} color={colors.mutedForeground} />
                        <Text style={[styles.label, { color: colors.mutedForeground }]}>Priority</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[
                          { label: "High", value: "high", color: colors.danger, bg: colors.danger + "20" },
                          { label: "Medium", value: "medium", color: colors.warning, bg: colors.warning + "20" },
                          { label: "Low", value: "low", color: colors.mutedForeground, bg: colors.muted }
                        ].map((p) => (
                          <Pressable
                            key={p.value}
                            onPress={() => setTaskPriority(p.value)}
                            style={[
                              { flex: 1, backgroundColor: taskPriority === p.value ? p.bg : colors.card, borderColor: taskPriority === p.value ? p.color : colors.border, borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' }
                            ]}
                          >
                            <Text style={{ color: taskPriority === p.value ? p.color : colors.mutedForeground, fontWeight: "600" }}>{p.label}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </>
                )}

                {activeTab === 'event' && (
                  <>
                    {/* Icon Selection - EVENT ONLY */}
                    <View style={styles.fieldGroup}>
                      <View style={styles.labelRow}>
                        <AppIcon name="tag" size={14} color={colors.mutedForeground} />
                        <Text style={[styles.label, { color: colors.mutedForeground }]}>Icon</Text>
                      </View>
                      <View style={styles.iconGrid}>
                        {eventIcons.map((icon) => (
                          <Pressable
                            key={icon}
                            onPress={() => isOwner && setSelectedIcon(icon)}
                            style={[
                              styles.iconButton,
                              { backgroundColor: colors.card },
                              selectedIcon === icon && { backgroundColor: colors.primary, transform: [{ scale: 1.1 }] },
                              !isOwner && { opacity: 0.6 }
                            ]}
                          >
                            <MaterialCommunityIcons name={icon} size={24} color={selectedIcon === icon ? colors.background : colors.foreground} />
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    {/* Description - EVENT ONLY */}
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
                        editable={isOwner}
                      />
                    </View>

                    {/* All Day Toggle - EVENT ONLY */}
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
                        disabled={!isOwner}
                      />
                    </View>
                  </>
                )}

                {/* Schedule */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{activeTab === 'task' ? 'Due Date' : 'Schedule'}</Text>
                  <View style={styles.row}>
                    <View style={styles.halfField}>
                      <CustomDateTimePicker
                        mode="date"
                        value={startDate}
                        onChange={setStartDate}
                        label="Start Date"
                        disabled={activeTab === 'event' && !isOwner}
                      />
                    </View>
                    {!allDay && ( // Show time for events (if not all day) AND tasks
                      <View style={styles.halfField}>
                        <CustomDateTimePicker
                          mode="time"
                          value={startTime}
                          onChange={setStartTime}
                          label={activeTab === 'task' ? "Due Time" : "Start Time"}
                          disabled={!isOwner}
                        />
                      </View>
                    )}
                  </View>

                  {activeTab === 'event' && (
                    <View style={styles.row}>
                      <View style={styles.halfField}>
                        <CustomDateTimePicker
                          mode="date"
                          value={endDate || new Date()}
                          onChange={setEndDate}
                          label="End Date (Optional)"
                          disabled={!isOwner}
                        />
                      </View>
                      {!allDay && (
                        <View style={styles.halfField}>
                          <CustomDateTimePicker
                            mode="time"
                            value={endTime || new Date()}
                            onChange={setEndTime}
                            label="End Time"
                            disabled={!isOwner}
                          />
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Repeat Options - EVENT ONLY */}
                {activeTab === 'event' && (
                  <View style={styles.fieldGroup}>
                    <Pressable
                      style={[styles.expandableHeader, { backgroundColor: colors.card }]}
                      onPress={() => isOwner && setShowRepeatOptions(!showRepeatOptions)}
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
                              onPress={() => isOwner && setRepeatType(option.value)}
                              style={[
                                styles.chip,
                                { backgroundColor: colors.background },
                                repeatType === option.value && { backgroundColor: colors.primary },
                                !isOwner && { opacity: 0.6 }
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
                            <View style={styles.labelRow}>
                              <AppIcon name="calendar" size={14} color={colors.mutedForeground} />
                              <Text style={[styles.label, { color: colors.mutedForeground }]}>Repeat Until</Text>
                            </View>
                            <Text style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: 8, marginLeft: 2 }}>
                              Select when this recurring event should stop
                            </Text>
                            <CustomDateTimePicker
                              mode="date"
                              value={repeatEndDate || new Date()}
                              onChange={setRepeatEndDate}
                              label="Select End Date (Mandatory)"
                              placeholder="Never"
                              disabled={!isOwner}
                            />
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* Reminder Options - EVENT ONLY */}
                {activeTab === 'event' && (
                  <View style={styles.fieldGroup}>
                    <Pressable
                      style={[styles.expandableHeader, { backgroundColor: colors.card }]}
                      onPress={() => isOwner && setShowReminderOptions(!showReminderOptions)}
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
                          disabled={!isOwner}
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
                              onPress={() => isOwner && setReminderTime(option.value)}
                              style={[
                                styles.chip,
                                { backgroundColor: colors.background },
                                reminderTime === option.value && { backgroundColor: colors.primary },
                                !isOwner && { opacity: 0.6 }
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
                )}

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

                {/* Assign To */}
                <View style={styles.fieldGroup}>
                  <View style={styles.labelRow}>
                    <AppIcon name="user" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.label, { color: colors.mutedForeground }]}>Assign to</Text>
                  </View>
                  <View style={styles.chipsContainer}>
                    {members.map((member: any) => {
                      const profileColor = PROFILE_COLORS.find(c => c.value === member.color)?.hex || colors.primary;
                      return (
                        <Pressable
                          key={member.id}
                          onPress={() => isOwner && setMemberId(member.id)}
                          style={[
                            styles.memberChip,
                            { backgroundColor: colors.card },
                            memberId === member.id && { backgroundColor: profileColor },
                            !isOwner && { opacity: 0.6 }
                          ]}
                        >
                          <MaterialCommunityIcons name={member.symbol || 'account'} size={20} color={memberId === member.id ? '#fff' : colors.mutedForeground} style={{ marginRight: 6 }} />
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

                {/* Notes - EVENT ONLY */}
                {activeTab === 'event' && (
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.label, { color: colors.mutedForeground }]}>Notes</Text>
                    <TextInput
                      style={[styles.textArea, { backgroundColor: colors.card, color: colors.foreground }]}
                      placeholder="Add any additional notes..."
                      placeholderTextColor={colors.mutedForeground}
                      multiline
                      value={notes}
                      onChangeText={setNotes}
                      editable={isOwner}
                    />
                  </View>
                )}
              </>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Footer */}
          {activeTab !== 'existing' && (
            <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
              <Pressable
                style={[styles.cancelButton, { backgroundColor: colors.muted }]}
                onPress={() => onOpenChange(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>Cancel</Text>
              </Pressable>
              {isEditing && isOwner && (
                <Pressable
                  style={[styles.deleteButton, { backgroundColor: colors.muted }]}
                  onPress={() => {
                    const itemType = (eventToEdit as any).type === 'task' ? 'task' : 'event';
                    const itemName = itemType === 'task' ? 'Task' : 'Event';

                    Alert.alert(
                      `Delete ${itemName}`,
                      `Are you sure you want to delete this ${itemType}?`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => {
                            if (itemType === 'task') {
                              deleteTask(eventToEdit.id);
                            } else {
                              deleteEvent(eventToEdit.id);
                            }
                            onOpenChange(false);
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Text style={[styles.deleteButtonText, { color: colors.danger }]}>Delete</Text>
                </Pressable>
              )}
              {isOwner && (
                <Pressable
                  style={[styles.saveButton, { backgroundColor: colors.primary }]}
                  onPress={handleSave}
                >
                  <Text style={[styles.saveButtonText, { color: colors.primaryForeground }]}>
                    {isEditing ? "Save Changes" : (activeTab === 'event' ? "Add Event" : "Add Task")}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal >
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start", // Changed back to top-aligned
  },
  container: {
    padding: 0,
    backgroundColor: 'white',
    flex: 1, // Full height
    maxHeight: "100%", // Cover entire screen
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabText: {
    fontWeight: '600',
    fontSize: 14,
  },
  priorityButton: {},

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20, // Account for status bar
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
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  nameInput: {
    fontSize: 22, // Reduced from 24
    fontWeight: "700",
    marginBottom: 16, // Reduced from 24
    paddingVertical: 4, // Reduced from 8
  },
  fieldGroup: {
    marginBottom: 16, // Reduced from 24
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6, // Reduced from 8
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
    gap: 8, // Reduced from 10
  },
  iconButton: {
    width: 40, // Reduced from 44
    height: 40, // Reduced from 44
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 18, // Reduced from 20
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12, // Reduced from 16
    borderRadius: 12, // Reduced from 16
    marginBottom: 16, // Reduced from 24
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
    padding: 12, // Reduced from 16
    borderRadius: 12, // Reduced from 16
  },
  valueLabel: {
    fontSize: 12, // Reduced from 13
  },
  expandableContent: {
    marginTop: 8, // Reduced from 12
    padding: 8, // Reduced from 12
    borderRadius: 12, // Reduced from 16
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
    padding: 16, // Reduced from 20
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12, // Reduced from 16
    paddingBottom: Platform.OS === 'ios' ? 34 : 16, // Safe area
  },
  cancelButton: {
    flex: 1,
    padding: 14, // Reduced from 16
    borderRadius: 12, // Reduced from 16
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14, // Reduced from 16
    fontWeight: "600",
  },
  saveButton: {
    flex: 2, // Give more space to save button
    padding: 14, // Reduced from 16
    borderRadius: 12, // Reduced from 16
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 14, // Reduced from 16
    fontWeight: "600",
  },
  deleteButton: {
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  destructive: {
    color: "#ef4444",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
  },
  optionText: {
    fontSize: 14,
  },
  deleteButtonText: {
    fontWeight: "600",
  },
  ownerNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  ownerNoticeText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  existingEventsContainer: {
    gap: 12,
    marginTop: 12,
  },
  existingEventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
    position: 'relative',
  },
  existingEventColorBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  existingEventContent: {
    flex: 1,
  },
  existingEventTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  existingEventTime: {
    fontSize: 13,
  },
  priorityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  noEventsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  noEventsText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
