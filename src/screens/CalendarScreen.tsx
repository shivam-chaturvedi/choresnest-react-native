import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Dimensions,
  Platform,
  Animated,
  TextInput,
} from "react-native";
import { PanGestureHandler, State, PanGestureHandlerStateChangeEvent, ScrollView } from "react-native-gesture-handler";
import { AppLayout } from "../components/layout/AppLayout";
import { AddEventModal } from "../components/modals/AddEventModal";
import { GlobalSearch } from "../components/search/GlobalSearch";
import { useFamily, CalendarEvent, Task } from "../contexts/FamilyContext";
import { theme } from "../theme";
import { useThemeColors, useThemeRadius } from "../contexts/ThemeContext";
import { AppIcon } from "../components/ui/AppIcon";
import { PROFILE_COLORS } from "../constants/profileColors";
import { useSidebar } from "../contexts/SidebarContext";
import { useCountry } from "../contexts/CountryContext";
import { addMonths, subMonths, addDays, subDays, startOfWeek, endOfWeek, isSameMonth, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addYears, startOfDay, isAfter } from "date-fns";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { getEventsForDate } from "../utils/EventUtils";
import { safeParseDate } from "../utils/SafeDateUtils";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

const filteredEvents = (events: any[], filterMember: string | null) => {
  if (!filterMember) return events;
  return events.filter((e) => e.memberId === filterMember);
};

type CalendarListEntry = (CalendarEvent & { type: 'event'; isVirtual?: boolean; originalDate?: string }) | (Pick<Task, 'id' | 'icon' | 'date' | 'priority'> & { type: 'task'; title: string; time: string; memberId?: string });
type UpcomingEntry = CalendarListEntry & { nextDate: Date };

const parseTimeToDate = (date: Date, time?: string): Date => {
  const result = new Date(date.getTime());
  result.setHours(0, 0, 0, 0);
  if (!time || time === "All Day") return result;

  const match = time.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!match) return result;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2] || "0", 10);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  result.setHours(hours, minutes, 0, 0);
  return result;
};

const advanceRecurrenceDate = (date: Date, rule: string): Date | null => {
  switch (rule) {
    case "daily":
      return addDays(date, 1);
    case "weekly":
      return addDays(date, 7);
    case "biweekly":
      return addDays(date, 14);
    case "monthly":
      return addMonths(date, 1);
    case "yearly":
      return addYears(date, 1);
    case "weekday": {
      let next = addDays(date, 1);
      while (next.getDay() === 0 || next.getDay() === 6) {
        next = addDays(next, 1);
      }
      return next;
    }
    default:
      return null;
  }
};

const getNextRecurringOccurrence = (event: CalendarEvent, reference: Date): Date | null => {
  if (!event.isRecurring || !event.recurrenceRule) return null;
  const start = safeParseDate(event.date);
  if (!start) return null;
  const endDate = event.recurrenceEndDate ? safeParseDate(event.recurrenceEndDate) : null;

  let candidateDate = startOfDay(start);
  const limit = 500;

  for (let i = 0; i < limit; i += 1) {
    if (endDate && isAfter(candidateDate, startOfDay(endDate))) return null;
    const candidateDateTime = parseTimeToDate(candidateDate, event.time);
    if (candidateDateTime > reference) {
      return candidateDateTime;
    }
    const nextDate = advanceRecurrenceDate(candidateDate, event.recurrenceRule);
    if (!nextDate) break;
    candidateDate = nextDate;
  }
  return null;
};

const getNextCandidateForEntry = (entry: CalendarListEntry, reference: Date): Date | null => {
  const baseDate = safeParseDate(entry.date);
  if (!baseDate) return null;

  if (entry.type === "event") {
    if (entry.isRecurring) {
      const recurring = getNextRecurringOccurrence(entry, reference);
      if (recurring) return recurring;
    }
  }

  const candidate = parseTimeToDate(baseDate, entry.time);
  if (candidate > reference) return candidate;
  return null;
};

const views = ["Day", "Week", "Month"];
const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_VIEW_OFFSET = 84;

const DraggableEvent: React.FC<{
  event: any;
  dayIndex: number;
  dayColumnWidth: number;
  HOUR_HEIGHT: number;
  isOwner: boolean;
  colors: any;
  members: any[];
  activeView: string;
  timeZone: string;
  onUpdate: (id: string, updates: any) => void;
  onPress: (event: any) => void;
  onPermissionDenied: (type: 'event' | 'task') => void;
}> = ({ event, dayIndex, dayColumnWidth, HOUR_HEIGHT, isOwner, colors, members, activeView, timeZone, onUpdate, onPress, onPermissionDenied }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const resizeY = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const member = members.find((m: any) => m.id === event.memberId);
  const profileColor = PROFILE_COLORS.find((c: any) => c.value === member?.color);
  const bgColor = profileColor ? profileColor.hex + "40" : colors.primary + "40";
  const borderColor = profileColor ? profileColor.hex : colors.primary;

  const eventWidth = dayColumnWidth / event.totalCols;
  const eventLeft = (dayIndex * dayColumnWidth) + (event.colIndex * eventWidth);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY, translationX: translateX } }],
    { useNativeDriver: false }
  );

  const onResizeEvent = Animated.event(
    [{ nativeEvent: { translationY: resizeY } }],
    { useNativeDriver: false }
  );

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const onHandlerStateChangeBegan = (eventData: PanGestureHandlerStateChangeEvent) => {
    if (eventData.nativeEvent.state === State.BEGAN && !isOwner) {
      triggerShake();
      onPermissionDenied(event.type || 'event');
      return true; // Indicate permission denied
    }
    return false; // Permission granted
  };

  const onHandlerStateChange = (eventData: PanGestureHandlerStateChangeEvent) => {
    try {
      // Don't process drag if permission denied
      if (!isOwner && eventData.nativeEvent.state === State.END) {
        translateY.setValue(0);
        translateX.setValue(0);
        return;
      }

      if (eventData.nativeEvent.state === State.END) {
        const deltaY = eventData.nativeEvent.translationY;
        const deltaX = eventData.nativeEvent.translationX;

        const totalY = event.top + deltaY;

        // Calculate new day if in Week view
        let newDate = event.date;
        // In the new Week view (Single Day with Header), we disable dragging between days
        // because only one day is rendered at a time in the body.

        if (activeView === "Week") {
          // Allow easier dragging between days (threshold: 1/3 screen width)
          const colShift = Math.round(deltaX / (Dimensions.get('window').width / 3));
          if (colShift !== 0) {
            const currentDate = new Date(event.date);
            currentDate.setDate(currentDate.getDate() + colShift);
            newDate = formatInTimeZone(currentDate, timeZone, "yyyy-MM-dd");
          }
        }

        // Calculate new start time in minutes
        const totalMinutes = (totalY / HOUR_HEIGHT) * 60;
        // Snap to 15-minute increments
        const snappedMinutes = Math.round(totalMinutes / 15) * 15;

        const hours = Math.floor(snappedMinutes / 60);
        const minutes = snappedMinutes % 60;

        if (hours >= 0 && hours < 24) {
          const period = hours >= 12 ? "PM" : "AM";
          const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
          const formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;

          // Calculate duration and update endTime
          const durationMatch = event.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
          const endMatch = event.endTime?.match(/(\d+):(\d+)\s*(AM|PM)/i);

          if (durationMatch && endMatch) {
            let startH = parseInt(durationMatch[1]);
            if (durationMatch[3].toUpperCase() === "PM" && startH !== 12) startH += 12;
            if (durationMatch[3].toUpperCase() === "AM" && startH === 12) startH = 0;
            const startM = (startH * 60) + parseInt(durationMatch[2]);

            let endH = parseInt(endMatch[1]);
            if (endMatch[3].toUpperCase() === "PM" && endH !== 12) endH += 12;
            if (endMatch[3].toUpperCase() === "AM" && endH === 12) endH = 0;
            const endM = (endH * 60) + parseInt(endMatch[2]);

            const duration = endM - startM;
            const newEndM = snappedMinutes + duration;

            const eHours = Math.floor(newEndM / 60);
            const eMinutes = newEndM % 60;
            const ePeriod = eHours >= 12 ? "PM" : "AM";
            const eDisplayHours = eHours === 0 ? 12 : eHours > 24 ? (eHours % 24) : eHours > 12 ? eHours - 12 : eHours;
            const formattedEndTime = `${eDisplayHours}:${eMinutes.toString().padStart(2, '0')} ${ePeriod}`;

            onUpdate(event.id, { date: newDate, time: formattedTime, endTime: formattedEndTime });
          } else {
            onUpdate(event.id, { date: newDate, time: formattedTime });
          }
        }

        translateY.setValue(0);
        translateX.setValue(0);
      }
    } catch (error) {
      console.error("Error in onHandlerStateChange (drag):", error);
      translateY.setValue(0);
      translateX.setValue(0);
    }
  };

  const onResizeStateChange = (eventData: PanGestureHandlerStateChangeEvent) => {
    if (eventData.nativeEvent.state === State.END) {
      const deltaY = eventData.nativeEvent.translationY;
      const newHeight = Math.max(25, event.height + deltaY);

      // Calculate new duration and end time
      const durationMins = (newHeight / HOUR_HEIGHT) * 60;
      const snappedDuration = Math.round(durationMins / 15) * 15;

      const durationMatch = event.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (durationMatch) {
        let startH = parseInt(durationMatch[1]);
        if (durationMatch[3].toUpperCase() === "PM" && startH !== 12) startH += 12;
        if (durationMatch[3].toUpperCase() === "AM" && startH === 12) startH = 0;
        const startM = (startH * 60) + parseInt(durationMatch[2]);

        const newEndM = startM + snappedDuration;
        const eHours = Math.floor(newEndM / 60);
        const eMinutes = newEndM % 60;
        const ePeriod = eHours >= 12 ? "PM" : "AM";
        const eDisplayHours = eHours === 0 ? 12 : eHours > 24 ? (eHours % 24) : eHours > 12 ? eHours - 12 : eHours;
        const formattedEndTime = `${eDisplayHours}:${eMinutes.toString().padStart(2, '0')} ${ePeriod}`;

        onUpdate(event.id, { endTime: formattedEndTime });
      }

      resizeY.setValue(0);
    }
  };

  const isRightMost = event.colIndex === event.totalCols - 1;

  return (
    <View style={{
      position: 'absolute',
      top: event.top,
      left: `${eventLeft}%`,
      width: `${eventWidth}%`,
      height: event.height,
      zIndex: 10,
      paddingHorizontal: 1,
      paddingRight: isRightMost ? 1 : 1, // Only apply large gutter to the rightmost event
    }}>
      <PanGestureHandler
        enabled={true}
        onGestureEvent={isOwner ? onGestureEvent : undefined}
        onHandlerStateChange={(e) => {
          onHandlerStateChangeBegan(e);
          if (isOwner) {
            onHandlerStateChange(e);
          }
        }}
        activeOffsetX={[-10, 10]}
        activeOffsetY={[-10, 10]}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: bgColor,
            borderLeftWidth: 4,
            borderLeftColor: borderColor,
            borderWidth: 1.5,
            borderColor: "#000000",
            borderRadius: 6,
            padding: 4,
            overflow: 'hidden',
            elevation: 3,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            transform: [
              { translateY: translateY },
              { translateX: Animated.add(translateX, shakeAnim) }
            ]
          }}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={() => onPress(event)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 10, fontWeight: '900', color: event.type === 'task' ? '#ef4444' : '#8b5cf6' }}>
                {event.type === 'task' ? 'TASK' : 'EVENT'}
              </Text>
              <Text style={{ fontSize: 10 }}>{event.icon}</Text>
              <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: '700', color: colors.foreground, flex: 1 }}>
                {event.title}
              </Text>
            </View>
            {event.totalCols < 3 && (
              <Text numberOfLines={1} style={{ fontSize: 9, color: colors.mutedForeground, marginTop: 2 }}>
                {member?.name}
              </Text>
            )}
          </Pressable>
        </Animated.View>
      </PanGestureHandler>

      {isOwner && (
        <PanGestureHandler
          onGestureEvent={onResizeEvent}
          onHandlerStateChange={onResizeStateChange}
        >
          <Animated.View
            style={{
              position: 'absolute',
              bottom: -5,
              left: 0,
              right: 0,
              height: 20,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 20,
              transform: [{ translateY: resizeY }]
            }}
          >
            <View style={{ width: 30, height: 4, borderRadius: 2, backgroundColor: '#00000040' }} />
          </Animated.View>
        </PanGestureHandler>
      )}
    </View>
  );
};

export const CalendarScreen: React.FC = () => {
  const {
    members, activeMember, events, tasks, addEvent, updateEvent, updateTask,
  } = useFamily();
  const { openSidebar } = useSidebar();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const { currentCountry } = useCountry();
  const timeZone = currentCountry.timeZone;

  const [activeView, setActiveView] = useState("Day");
  const [selectedDate, setSelectedDate] = useState(() => toZonedTime(new Date(), timeZone));
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [filterMember, setFilterMember] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setSelectedDate(toZonedTime(new Date(), timeZone));
  }, [timeZone]);

  const formatZoned = (value: Date | undefined, pattern: string) => {
    if (!value) return "";
    try {
      return formatInTimeZone(value, timeZone, pattern);
    } catch {
      return "";
    }
  };

  const showPermissionToast = (type: 'event' | 'task') => {
    const message = type === 'task'
      ? "You cannot update another user's task"
      : "You cannot update another user's event";

    setToastMessage(message);
    toastOpacity.setValue(0);

    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setToastMessage(null));
  };


  /* New state for current time line */
  const [now, setNow] = useState(new Date());
  const scrollViewRef = useRef<ScrollView>(null);
  const headerScrollRef = useRef<ScrollView>(null);
  const HOUR_HEIGHT = 60;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if ((activeView === "Day" || activeView === "Week") && isSameDay(selectedDate, today)) {
        // Wait for layout to be ready
        const timer = setTimeout(() => {
          const current = toZonedTime(new Date(), timeZone);
          const minutes = (current.getHours() * 60) + current.getMinutes();
          const y = (minutes / 60) * HOUR_HEIGHT;
          // Scroll to 2 hours before current time to show context
          const twoHoursInPx = 2 * HOUR_HEIGHT;
          scrollViewRef.current?.scrollTo({
            y: Math.max(0, y - twoHoursInPx),
            animated: true
          });
        }, 500);

        return () => clearTimeout(timer);
      }
    }, [activeView, selectedDate])
  );

  const today = toZonedTime(new Date(), timeZone);

  // Unified items (Events + Tasks)
  const filteredEvents = useMemo(() => {
    if (!filterMember) return events;
    return events.filter((e: CalendarEvent) => e.memberId === filterMember);
  }, [events, filterMember]);

  const filteredTasks = useMemo(() => {
    if (!filterMember) return tasks;
    return tasks.filter((t: Task) => t.assignee === filterMember);
  }, [tasks, filterMember]);

  const zonedNow = toZonedTime(now, timeZone);

  const calendarItems = useMemo<CalendarListEntry[]>(() => {
    const eventItems = filteredEvents.map((e: CalendarEvent) => ({ ...e, type: 'event' as const }));
    const taskItems = filteredTasks
      .filter((t: Task) => t.status !== 'done')
      .map((t: Task) => ({
        id: t.id,
        title: t.name,
        icon: t.icon,
        date: t.date,
        time: t.due && t.due.match(/\d+:\d+\s*(AM|PM)/i) ? t.due : "All Day",
        memberId: t.assignee,
        type: 'task' as const,
        priority: t.priority,
      }));

    return [...eventItems, ...taskItems];
  }, [filteredEvents, filteredTasks]);

  const upcomingItems = useMemo<UpcomingEntry[]>(() => {
    const entries: UpcomingEntry[] = [];
    calendarItems.forEach(item => {
      const nextDate = getNextCandidateForEntry(item, zonedNow);
      if (nextDate) {
        entries.push({ ...item, nextDate });
      }
    });
    return entries.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
  }, [calendarItems, zonedNow]);

  const navigateDate = (direction: number) => {
    if (activeView === "Month") {
      setSelectedDate(prev => direction > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
    } else if (activeView === "Week") {
      setSelectedDate(prev => {
        const nextWeek = direction > 0 ? addDays(prev, 7) : subDays(prev, 7);
        return startOfWeek(nextWeek);
      });
    } else {
      setSelectedDate(prev => addDays(prev, direction));
    }
  };

  const generateMonthDays = () => {
    const start = startOfWeek(startOfMonth(selectedDate));
    const end = endOfWeek(endOfMonth(selectedDate));
    return eachDayOfInterval({ start, end });
  };

  const generateWeekDays = () => {
    const start = startOfWeek(selectedDate);
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  };

  const monthDays = useMemo(() => generateMonthDays(), [selectedDate]);
  const weekDays = useMemo(() => generateWeekDays(), [selectedDate]);

  const renderMonthView = () => (
    <View style={[styles.card, { backgroundColor: colors.card, borderRadius: radius.card }]}>
      <View style={styles.gridHeader}>
        {daysOfWeek.map((day, i) => (
          <Text key={i} style={[styles.gridHeaderLabel, { color: colors.mutedForeground }, i === 0 && styles.textDanger]}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {monthDays.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, selectedDate);
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);

          // Use helper to get proper events including recurring and multi-day
          const dayEvents = getEventsForDate(day, filteredEvents as CalendarEvent[], filteredTasks as Task[], timeZone) as any[];

          return (
            <Pressable
              key={i}
              onPress={() => {
                setSelectedDate(day);
                setShowAddEventModal(true);
              }}
              style={[
                styles.dayCell,
                { borderRadius: radius.sm },
                !isCurrentMonth && styles.dayCellFaded,
                isSelected && { backgroundColor: colors.primary, shadowColor: colors.primary },
                isToday && !isSelected && { backgroundColor: colors.primary + '15', borderWidth: 1, borderColor: colors.primary }
              ]}
            >
              <Text style={[
                styles.dayText,
                { color: colors.foreground },
                !isCurrentMonth && { color: colors.mutedForeground },
                isSelected && { color: "#fff", fontWeight: "700" },
                isToday && !isSelected && { color: colors.primary, fontWeight: "700" }
              ]}>
                {formatZoned(day, "d")}
              </Text>

              <View style={styles.eventDotRx}>
                {dayEvents.slice(0, 3).map((e, idx) => {
                  const member = members.find((m: any) => m.id === e.memberId);
                  const profileColor = PROFILE_COLORS.find((c: any) => c.value === member?.color);
                  const dotColor = profileColor ? profileColor.hex : colors.primary;

                  return (
                    <Pressable
                      key={idx}
                      onPress={() => {
                        setSelectedEvent(e);
                        setShowAddEventModal(true);
                      }}
                      style={[
                        styles.eventDot,
                        { borderRadius: radius.full },
                        { backgroundColor: isSelected ? "#fff" : dotColor }
                      ]}
                    />
                  );
                })}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const [quickAddText, setQuickAddText] = useState("");

  const handleQuickAdd = () => {
    try {
      if (!quickAddText.trim()) return;

      let title = quickAddText.trim();
      let timeString = formatZoned(zonedNow, "h:mm aa");

      const timeMatch = title.match(/at (\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
      if (timeMatch) {
        timeString = timeMatch[1].toUpperCase();
        if (!timeString.includes("AM") && !timeString.includes("PM")) {
          timeString += " PM";
        }
        title = title.replace(timeMatch[0], "").trim();
      }

      addEvent({
        title,
        dateString: formatZoned(selectedDate, "yyyy-MM-dd"),
        time: timeString,
        icon: "📅",
        memberId: activeMember?.id || members[0]?.id,
        timeZone,
      });

      setQuickAddText("");
    } catch (error) {
      console.error("Error in handleQuickAdd:", error);
    }
  };

  const renderTimeline = (days: Date[]) => {
    const dayColumnWidthPercent = 100;
    const daysToRender = activeView === "Week" ? [selectedDate] : days;

    return (
      <View style={{ flex: 1 }}>
        {activeView === "Week" && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            ref={headerScrollRef}
            scrollEnabled={true}
            contentContainerStyle={{ paddingLeft: 16, paddingRight: 16 }}
          >
            <View style={styles.weekHeaderRow}>
              {days.map((day, i) => {
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, zonedNow);
                return (
                  <Pressable
                    key={i}
                    onPress={() => setSelectedDate(day)}
                    style={[
                      styles.weekHeaderCell,
                      { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md, width: 60, marginRight: 8 },
                      isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                      isToday && !isSelected && { backgroundColor: colors.primary + '10', borderColor: colors.primary, borderWidth: 1 }
                    ]}
                  >
                    <Text style={[styles.weekDayLabel, { color: colors.mutedForeground, fontSize: 11 }, isSelected && styles.textWhite]}>{formatZoned(day, "EEE")}</Text>
                    <Text style={[styles.weekDateLabel, { color: colors.foreground, fontSize: 16, fontWeight: '600' }, isSelected && styles.textWhite]}>{formatZoned(day, "d")}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}

        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: radius.card, padding: 0, overflow: 'hidden', flex: 1 }]}>
          {(activeView === "Day" || activeView === "Week") && (
            <View style={styles.dayHeader}>
              <Text style={[styles.dayHeaderNumber, { color: colors.foreground }]}>{formatZoned(selectedDate, "d")}</Text>
              <View>
                <Text style={[styles.dayHeaderMonth, { color: colors.foreground }]}>{formatZoned(selectedDate, "MMMM yyyy")}</Text>
                <Text style={[styles.dayHeaderWeekday, { color: colors.primary }]}>{formatZoned(selectedDate, "EEEE")}</Text>
              </View>
            </View>
          )}

          <ScrollView
            ref={scrollViewRef}
            style={{ height: 300 }}
            contentContainerStyle={{ height: 24 * HOUR_HEIGHT }}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ flexDirection: 'row', height: '100%' }}>
              <View style={{ width: 50, borderRightWidth: 1, borderRightColor: colors.border, backgroundColor: colors.card, zIndex: 20 }}>
                {Array.from({ length: 24 }).map((_, hour) => (
                  <View key={hour} style={{ height: HOUR_HEIGHT, justifyContent: 'flex-start', alignItems: 'flex-end', paddingRight: 8 }}>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground, transform: [{ translateY: -8 }] }}>
                      {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                    </Text>
                  </View>
                ))}
              </View>

              <View
                style={{ width: (Dimensions.get('window').width - DAY_VIEW_OFFSET) }}
              >
                <View style={{ flex: 1, position: 'relative' }}>
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <View
                      key={`line-${hour}`}
                      style={{
                        position: 'absolute',
                        top: hour * HOUR_HEIGHT,
                        left: 0,
                        right: 0,
                        height: 1,
                        backgroundColor: colors.border,
                        opacity: 0.3
                      }}
                    />
                  ))}

                  {daysToRender.map((day, dayIndex) => {
                    const dateStr = formatZoned(day, "yyyy-MM-dd");
                    // Use helper to get proper events including recurring and multi-day
                    const dayEvents = getEventsForDate(day, filteredEvents as CalendarEvent[], filteredTasks as Task[], timeZone) as any[];

                    const parseTimeToMinutes = (timeStr: string | undefined): number | null => {
                      if (!timeStr || timeStr === "All Day") return null;
                      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
                      if (!match) return null;
                      let hours = parseInt(match[1]);
                      const minutes = parseInt(match[2]);
                      const period = match[3].toUpperCase();
                      if (period === "PM" && hours !== 12) hours += 12;
                      if (period === "AM" && hours === 12) hours = 0;
                      return (hours * 60) + minutes;
                    };

                    const processedEvents = dayEvents.map(event => {
                      const startMins = parseTimeToMinutes(event.time);
                      const top = startMins !== null ? (startMins / 60) * HOUR_HEIGHT : undefined;
                      const endMins = startMins !== null ? (parseTimeToMinutes(event.endTime) || (startMins + 60)) : undefined;
                      let durationMins = (startMins !== null && endMins !== undefined) ? endMins - startMins : undefined;

                      if (durationMins !== undefined && durationMins <= 0) durationMins = 60;
                      const height = durationMins !== undefined ? Math.max(25, (durationMins / 60) * HOUR_HEIGHT) : undefined;
                      const bottom = (top !== undefined && height !== undefined) ? top + height : undefined;

                      return { ...event, top, height, bottom };
                    });

                    const alldayItems = processedEvents.filter(e => e.top === undefined || e.time === "All Day");
                    const timedEvents = processedEvents.filter(e => e.top !== undefined && e.time !== "All Day") as any[];

                    timedEvents.sort((a, b) => (a.top || 0) - (b.top || 0));

                    // Group events into clusters of conflicting events
                    const clusters: any[][] = [];
                    let currentCluster: any[] = [];
                    let clusterEnd = -1;

                    timedEvents.forEach(event => {
                      if (currentCluster.length === 0) {
                        currentCluster.push(event);
                        clusterEnd = event.bottom;
                      } else {
                        // Check if event overlaps with the current cluster's bounds
                        if (event.top < clusterEnd - 0.1) { // 0.1 buffer for floating point
                          currentCluster.push(event);
                          clusterEnd = Math.max(clusterEnd, event.bottom);
                        } else {
                          // Start new cluster
                          clusters.push(currentCluster);
                          currentCluster = [event];
                          clusterEnd = event.bottom;
                        }
                      }
                    });
                    if (currentCluster.length > 0) clusters.push(currentCluster);

                    // Process each cluster independently
                    clusters.forEach(cluster => {
                      const columns: any[][] = [];
                      cluster.forEach(event => {
                        let placed = false;
                        for (let i = 0; i < columns.length; i++) {
                          const lastEventInColumn = columns[i][columns[i].length - 1];
                          if (event.top >= lastEventInColumn.bottom - 0.1) {
                            columns[i].push(event);
                            event.colIndex = i;
                            placed = true;
                            break;
                          }
                        }
                        if (!placed) {
                          event.colIndex = columns.length;
                          columns.push([event]);
                        }
                      });

                      // Assign totalCols based on THIS cluster's max columns
                      const maxCols = columns.length;
                      cluster.forEach(event => {
                        event.totalCols = maxCols;
                      });
                    });

                    return (
                      <React.Fragment key={dateStr}>
                        {alldayItems.length > 0 && (
                          <View style={{
                            position: 'absolute',
                            top: 0,
                            left: `${dayIndex * dayColumnWidthPercent}%`,
                            width: `${dayColumnWidthPercent}%`,
                            backgroundColor: colors.primary + '08',
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                            zIndex: 30,
                            padding: 4,
                            gap: 2
                          }}>
                            {alldayItems.map(item => (
                              <Pressable
                                key={item.id}
                                onPress={() => {
                                  setSelectedEvent(item);
                                  setShowAddEventModal(true);
                                }}
                                style={{
                                  backgroundColor: colors.card,
                                  borderRadius: 4,
                                  padding: 4,
                                  borderLeftWidth: 3,
                                  borderLeftColor: item.type === 'task' ? '#ef4444' : '#8b5cf6',
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 4,
                                  borderWidth: 1,
                                  borderColor: colors.border
                                }}
                              >
                                <Text style={{ fontSize: 8, fontWeight: '900', color: item.type === 'task' ? '#ef4444' : '#8b5cf6' }}>
                                  {item.type === 'task' ? 'TASK' : 'EVENT'}
                                </Text>
                                <Text style={{ fontSize: 10 }}>{item.icon}</Text>
                                <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: '600', color: colors.foreground, flex: 1 }}>
                                  {item.title}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        )}

                        {timedEvents.map(event => {
                          const eventWidth = dayColumnWidthPercent / event.totalCols;
                          const eventLeft = (dayIndex * dayColumnWidthPercent) + (event.colIndex * eventWidth);

                          return (
                            <DraggableEvent
                              key={event.id}
                              event={event}
                              dayIndex={dayIndex}
                              dayColumnWidth={dayColumnWidthPercent}
                              HOUR_HEIGHT={HOUR_HEIGHT}
                              isOwner={activeMember?.id === event.memberId || (!activeMember && members.length > 0)}
                              colors={colors}
                              members={members}
                              activeView={activeView}
                              timeZone={timeZone}
                              onUpdate={(id, updates) => {
                                if (event.type === 'task') {
                                  const taskUpdates: any = {};
                                  if (updates.date) taskUpdates.dateString = updates.date;
                                  if (updates.time) taskUpdates.dueDisplay = updates.time;
                                  updateTask(id, taskUpdates);
                                } else {
                                  const eventUpdates: any = {};
                                  if (updates.date) eventUpdates.dateString = updates.date;
                                  if (updates.time) eventUpdates.time = updates.time;
                                  if (updates.endTime !== undefined) eventUpdates.endTime = updates.endTime;
                                  if (updates.endDate !== undefined) eventUpdates.endDate = updates.endDate;
                                  updateEvent(id, eventUpdates);
                                }
                              }}
                              onPress={(e) => {
                                setSelectedEvent(e);
                                setShowAddEventModal(true);
                              }}
                              onPermissionDenied={showPermissionToast}
                            />
                          );
                        })}
                      </React.Fragment>
                    );
                  })}

                  {(activeView === "Day" || activeView === "Week") && isSameDay(selectedDate, zonedNow) && (
                    <View
                      style={{
                        position: 'absolute',
                        top: (zonedNow.getHours() * HOUR_HEIGHT) + (zonedNow.getMinutes() * (HOUR_HEIGHT / 60)),
                        left: 0,
                        right: 0,
                        flexDirection: 'row',
                        alignItems: 'center',
                        zIndex: 50
                      }}
                    >
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#ef4444', position: 'absolute', left: -6 }} />
                      <View style={{ flex: 1, height: 2, backgroundColor: '#ef4444' }} />
                    </View>
                  )}

                  {Array.from({ length: 24 }).map((_, hour) => (
                    <Pressable
                      key={`slot-${hour}`}
                      style={{ position: 'absolute', top: hour * HOUR_HEIGHT, left: 0, right: 0, height: HOUR_HEIGHT, zIndex: 1 }}
                      onPress={() => {
                        const timeString = hour === 0 ? "12:00 AM" : hour < 12 ? `${hour}:00 AM` : hour === 12 ? "12:00 PM" : `${hour - 12}:00 PM`;
                        setSelectedTime(timeString);
                        setShowAddEventModal(true);
                      }}
                    />
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  return (
    <AppLayout showNav={false} showAddButton={true} onAddPress={() => {
      const currentTime = new Date();
      const hour = currentTime.getHours();
      const minute = currentTime.getMinutes();
      const timeString = hour === 0 ? `12:${minute.toString().padStart(2, '0')} AM`
        : hour < 12 ? `${hour}:${minute.toString().padStart(2, '0')} AM`
          : hour === 12 ? `12:${minute.toString().padStart(2, '0')} PM`
            : `${hour - 12}:${minute.toString().padStart(2, '0')} PM`;
      setSelectedTime(timeString);
      setShowAddEventModal(true);
    }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Pressable onPress={openSidebar} style={[styles.iconButton, { borderRadius: radius.sm }]}>
                <AppIcon name="menu" size={20} color="#fff" />
              </Pressable>
              {!showSearch && (
                <View style={styles.monthSelector}>
                  <Pressable onPress={() => navigateDate(-1)} style={{ padding: 4 }}>
                    <AppIcon name="chevronLeft" size={20} color="#fff" />
                  </Pressable>
                  <Text style={[styles.monthTitle, { marginHorizontal: 8 }]}>{formatZoned(selectedDate, "MMMM yyyy")}</Text>
                  <Pressable onPress={() => navigateDate(1)} style={{ padding: 4 }}>
                    <AppIcon name="chevronRight" size={20} color="#fff" />
                  </Pressable>
                </View>
              )}
            </View>

            <View style={styles.headerRight}>
              {showSearch ? (
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.sm, paddingHorizontal: 8, marginRight: 8 }}>
                  <TextInput
                    style={{ flex: 1, color: '#fff', height: 40, fontSize: 14 }}
                    placeholder="Quick add: 'Task at 2pm'"
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    value={quickAddText}
                    onChangeText={setQuickAddText}
                    onSubmitEditing={handleQuickAdd}
                    autoFocus
                  />
                  <Pressable onPress={() => setShowSearch(false)}>
                    <AppIcon name="x" size={20} color="#fff" />
                  </Pressable>
                </View>
              ) : (
                <>
                  <Pressable
                    onPress={() => setShowSearch(true)}
                    style={[styles.iconButton, { borderRadius: radius.sm }]}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <AppIcon name="search" size={20} color="#fff" />
                  </Pressable>

                  <Pressable
                    style={[styles.addBtn, { backgroundColor: "#fff", borderRadius: radius.sm }]}
                    onPress={() => setShowAddEventModal(true)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <AppIcon name="plus" size={20} color={colors.primary} />
                  </Pressable>
                </>
              )}
            </View>
          </View>

          <View style={[styles.segmentContainer, { borderRadius: radius.md }]}>
            {views.map(view => (
              <Pressable
                key={view}
                onPress={() => setActiveView(view)}
                style={[
                  styles.segmentBtn,
                  { borderRadius: radius.sm },
                  activeView === view && [styles.segmentBtnActive, { backgroundColor: "#fff" }]
                ]}
              >
                <Text style={[
                  styles.segmentText,
                  activeView === view ? { color: colors.primary } : { color: "rgba(255,255,255,0.8)" }
                ]}>{view}</Text>
              </Pressable>
            ))}
          </View>
        </View >

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <Pressable
              onPress={() => setFilterMember(null)}
              style={[
                styles.filterChip,
                { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.full },
                filterMember === null && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
            >
              <AppIcon name="users" size={14} color={filterMember === null ? "#fff" : colors.foreground} />
              <Text style={[
                styles.filterText,
                { color: colors.foreground },
                filterMember === null && styles.textWhite
              ]}>All</Text>
            </Pressable>
            {members.map((member: any) => (
              <Pressable
                key={member.id}
                onPress={() => setFilterMember(member.id)}
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.full },
                  filterMember === member.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
              >
                <Text style={styles.filterEmoji}>{member.symbol}</Text>
                <Text style={[
                  styles.filterText,
                  { color: colors.foreground },
                  filterMember === member.id && styles.textWhite
                ]}>{member.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.dateNav}>
            <Pressable onPress={() => navigateDate(-1)} style={[styles.navArrow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.sm }]}>
              <AppIcon name="chevronLeft" size={20} color={colors.foreground} />
            </Pressable>
            <Pressable onPress={() => setSelectedDate(toZonedTime(new Date(), timeZone))} style={[styles.todayBtn, { backgroundColor: colors.primary + '15', borderRadius: radius.sm }]}>
              <Text style={[styles.todayText, { color: colors.primary }]}>Today</Text>
            </Pressable>
            <Pressable onPress={() => navigateDate(1)} style={[styles.navArrow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.sm }]}>
              <AppIcon name="chevronRight" size={20} color={colors.foreground} />
            </Pressable>
          </View>

          {activeView === "Month" && renderMonthView()}
          {(activeView === "Week" || activeView === "Day") && renderTimeline(activeView === "Week" ? weekDays : [selectedDate])}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>📋 Upcoming Events</Text>
            {upcomingItems.slice(0, 3).map(event => {
              const displayDate = formatInTimeZone(event.nextDate, timeZone, "MMM d");
              const displayTime = event.time && event.time !== "All Day" ? event.time : "All Day";
              return (
                <Pressable
                  key={`${event.id}-${event.nextDate.getTime()}`}
                  onPress={() => {
                    setSelectedEvent(event);
                    setShowAddEventModal(true);
                  }}
                  style={[styles.upcomingItem, { backgroundColor: colors.card, borderRadius: radius.card }]}
                >
                  <View style={styles.upcomingLeft}>
                    <Text style={{ fontSize: 24 }}>{event.icon}</Text>
                    <View>
                      <Text style={[styles.upcomingTitle, { color: colors.foreground }]}>{event.title}</Text>
                      <Text style={[styles.upcomingMeta, { color: colors.mutedForeground }]}>{displayDate} · {displayTime}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
            {upcomingItems.length === 0 && (
              <Text style={{ color: colors.mutedForeground, fontStyle: 'italic', marginTop: 8 }}>No upcoming events</Text>
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        <AddEventModal
          open={showAddEventModal}
          onOpenChange={(open) => {
            setShowAddEventModal(open);
            if (!open) {
              setSelectedTime(undefined);
              setSelectedEvent(undefined);
            }
          }}
          initialDate={formatZoned(selectedDate, "yyyy-MM-dd")}
          initialTime={selectedTime}
          eventToEdit={selectedEvent as CalendarEvent}
          onSelectEvent={setSelectedEvent}
        />
        <GlobalSearch open={showSearch} onClose={() => setShowSearch(false)} />

        {/* Permission Toast Notification */}
        {toastMessage && (
          <Animated.View
            style={{
              position: 'absolute',
              top: 190,
              left: 20,
              right: 20,
              backgroundColor: colors.danger,
              padding: 16,
              borderRadius: radius.card,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
              opacity: toastOpacity,
              zIndex: 9999,
              borderWidth: 1,
              borderColor: colors.dangerDark,
            }}
          >
            <Text style={{ color: colors.primaryForeground, fontWeight: '600', textAlign: 'center', fontSize: 14 }}>
              {toastMessage}
            </Text>
          </Animated.View>
        )}
      </View>
    </AppLayout >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addBtnText: {
    fontWeight: "600",
    fontSize: 14,
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
  },
  segmentBtnActive: {
    // handled inline
  },
  segmentText: {
    fontWeight: "600",
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
  },
  filterScroll: {
    marginBottom: 16,
    flexGrow: 0,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderWidth: 1,
    gap: 6,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
  },
  filterEmoji: {
    fontSize: 14,
  },
  dateNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  navArrow: {
    padding: 8,
    borderWidth: 1,
  },
  todayBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  todayText: {
    fontWeight: "600",
  },
  card: {
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 20,
  },
  gridHeader: {
    flexDirection: "row",
    marginBottom: 8,
  },
  gridHeaderLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
  },
  textDanger: {
    color: "#ef4444",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    height: 65,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 2,
    marginBottom: 0,
  },
  dayCellFaded: {
    opacity: 0.3,
  },

  dayText: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 2,
  },
  eventDotRx: {
    flexDirection: "row",
    gap: 2,
    justifyContent: "center",
  },
  eventDot: {
    width: 4,
    height: 4,
  },
  weekHeaderRow: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 8,
  },
  weekHeaderCell: {
    width: 112,
    alignItems: "center",
    paddingVertical: 12,
    borderWidth: 1,
  },
  weekDayLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  weekDateLabel: {
    fontSize: 18,
    fontWeight: "700",
  },
  textWhite: {
    color: "#fff",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  dayHeaderNumber: {
    fontSize: 40,
    fontWeight: "700",
  },
  dayHeaderMonth: {
    fontSize: 16,
    fontWeight: "600",
  },
  dayHeaderWeekday: {
    fontSize: 14,
  },
  timelineRow: {
    flexDirection: "row",
    minHeight: 45,
  },
  timeLabel: {
    width: 60,
    textAlign: "right",
    paddingRight: 12,
    fontSize: 12,
    paddingTop: 8,
  },
  timelineContent: {
    flex: 1,
    borderLeftWidth: 1,
    paddingLeft: 8,
    paddingBottom: 8,
  },
  eventBlock: {
    padding: 8,
    marginBottom: 4,
  },
  eventBlockTitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  upcomingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
  },
  upcomingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  upcomingMeta: {
    fontSize: 12,
  },
});
