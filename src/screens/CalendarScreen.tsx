import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Dimensions,
  Platform,
  Animated,
  TextInput,
  InteractionManager,
  ActivityIndicator,
} from "react-native";
import { PanGestureHandler, State, PanGestureHandlerStateChangeEvent, ScrollView } from "react-native-gesture-handler";
import { AppLayout } from "../components/layout/AppLayout";
import { AddEventModal } from "../components/modals/AddEventModal";
import { GlobalSearch } from "../components/search/GlobalSearch";
import { useFamily, CalendarEvent, Task } from "../contexts/FamilyContext";
import { useThemeColors, useThemeRadius, useTheme } from "../contexts/ThemeContext";
import { AppIcon } from "../components/ui/AppIcon";
import { MemberIcon } from "../components/ui/MemberIcon";
import { PROFILE_COLORS } from "../constants/profileColors";
import { useSidebar } from "../contexts/SidebarContext";
import { useCountry } from "../contexts/CountryContext";
import { useIsFocused } from "@react-navigation/native";
import NetInfo from "@react-native-community/netinfo";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};
import { addMonths, subMonths, addDays, subDays, startOfWeek, endOfWeek, isSameMonth, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addYears, startOfDay, isAfter, isWithinInterval } from "date-fns";
import { Day } from "date-fns";
import { getEventsForDate, CalendarEventWithMeta } from "../utils/EventUtils";
import { parseDateTimeInZone, safeFormatInTimeZone, safeTimeZone } from "../utils/SafeDateUtils";
import { toZonedTime } from "date-fns-tz";
import { useObservableValue } from "../hooks/useObservableValue";
import { TaskService } from "../services/TaskService";
import { SyncService } from "../services/SyncService";
import type { Observable } from "rxjs";
import { withDeferredScreen } from "../components/layout/DeferredScreen";

type CalendarListEntry = (CalendarEvent & { type: 'event'; isVirtual?: boolean; originalDate?: string; timeZone?: string }) | (Pick<Task, 'id' | 'icon' | 'date' | 'priority'> & { type: 'task'; title: string; time: string; memberId?: string; timeZone?: string });
type UpcomingEntry = CalendarListEntry & { nextDate: Date };
type ObservableValue<T> = T extends Observable<infer U> ? U : never;
type TaskServiceEventRecord = ObservableValue<ReturnType<typeof TaskService.observeEvents>>;
type TaskServiceTaskRecord = ObservableValue<ReturnType<typeof TaskService.observeTasks>>;

const resolveEntryTitle = (entry: CalendarListEntry | UpcomingEntry) => {
  return entry.title || (entry as any).name || "";
};

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

const TIME_FORMAT_REGEX = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i;

const normalizeTimeString = (value?: string | null): string => {
  if (!value) return "All Day";
  const match = value.trim().match(TIME_FORMAT_REGEX);
  if (!match) return "All Day";
  const rawHours = parseInt(match[1], 10);
  const minutes = (match[2] || "00").padStart(2, "0");
  const period = match[3].toUpperCase();

  const normalizedHours = period === "PM" && rawHours !== 12
    ? rawHours + 12
    : period === "AM" && rawHours === 12
      ? 0
      : rawHours;

  const displayHours = normalizedHours === 0
    ? 12
    : normalizedHours > 12
      ? normalizedHours - 12
      : normalizedHours;

  return `${displayHours}:${minutes} ${period}`;
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

const getNextRecurringOccurrence = (event: CalendarEvent, reference: Date, fallbackTimeZone: string): Date | null => {
  if (!event.isRecurring || !event.recurrenceRule) return null;
  const eventTimeZone = event.timeZone || fallbackTimeZone;
  const start = parseDateTimeInZone(event.date, eventTimeZone, event.time);
  if (!start) return null;
  const recurrenceEnd = event.recurrenceEndDate ? parseDateTimeInZone(event.recurrenceEndDate, eventTimeZone) : null;

  let candidateDate = startOfDay(start);
  const limit = 500;

  for (let i = 0; i < limit; i += 1) {
    if (recurrenceEnd && isAfter(candidateDate, startOfDay(recurrenceEnd))) return null;
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

const getNextCandidateForEntry = (entry: CalendarListEntry, reference: Date, fallbackTimeZone: string): Date | null => {
  const entryTimeZone = entry.timeZone || fallbackTimeZone;
  const baseDate = parseDateTimeInZone(entry.date, entryTimeZone, entry.time);
  if (!baseDate) return null;

  if (entry.type === "event" && entry.isRecurring) {
    const recurring = getNextRecurringOccurrence(entry, reference, entryTimeZone);
    if (recurring) return recurring;
  }

  if (baseDate > reference) return baseDate;
  return null;
};

const getCalendarPriorityMeta = (priority: string = "medium") => {
  const normalized = priority.toLowerCase();
  switch (normalized) {
    case "high":
      return { label: "High", color: "#dc2626", background: "#fee2e2", borderColor: "#dc2626" };
    case "medium":
      return { label: "Medium", color: "#b45309", background: "#fef3c7", borderColor: "#b45309" };
    default:
      return { label: "Low", color: "#0369a1", background: "#dbeafe", borderColor: "#0369a1" };
  }
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
  const priorityMeta = event.type === 'task' ? getCalendarPriorityMeta(event.priority) : null;

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
            const eventTimeZone = event.timeZone || timeZone;
            const currentZoned = parseDateTimeInZone(event.date, eventTimeZone, event.time) || new Date();
            currentZoned.setDate(currentZoned.getDate() + colShift);
            newDate = safeFormatInTimeZone(currentZoned, eventTimeZone, "yyyy-MM-dd");
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
            position: 'relative',
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
              <MemberIcon symbol={event.icon} size={12} color={colors.foreground} />
                <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: '700', color: colors.foreground, flex: 1 }}>
                  {resolveEntryTitle(event)}
                </Text>
            </View>
              {event.totalCols < 3 && (
                <Text numberOfLines={1} style={{ fontSize: 9, color: colors.mutedForeground, marginTop: 2 }}>
                  {member?.name}
                </Text>
              )}
            </Pressable>
            {event.type === 'task' && priorityMeta && (
              <View style={[styles.calendarPriorityBadge, { backgroundColor: priorityMeta.background, borderColor: priorityMeta.borderColor }]}>
                <Text style={[styles.calendarPriorityBadgeText, { color: priorityMeta.color }]}>
                  Priority: {priorityMeta.label}
                </Text>
              </View>
            )}
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

const CalendarScreenContent: React.FC = () => {
  const {
    members, activeMember, addEvent, updateEvent, updateTask, profileId,
  } = useFamily();
  const { openSidebar } = useSidebar();
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const { appearanceMode } = useTheme();
  const isMidnight = appearanceMode === "midnight";
  const accentColor = isMidnight ? colors.foreground : colors.primary;
  const accentIconColor = (fallback: string) => (isMidnight ? colors.foreground : fallback);
  const { currentCountry } = useCountry();
  const timeZone = safeTimeZone(currentCountry.timeZone);
  const weekOptions = useMemo(
    () => ({ weekStartsOn: (currentCountry.code === 'US' ? 0 : 1) as Day }),
    [currentCountry.code]
  );
  const observeEvents = useCallback(() => TaskService.observeEvents(profileId), [profileId]);
  const rawEvents = useObservableValue(
    observeEvents,
    [observeEvents],
    [] as TaskServiceEventRecord
  );
  const observeTasks = useCallback(() => TaskService.observeTasks(profileId), [profileId]);
  const rawTasks = useObservableValue(
    observeTasks,
    [observeTasks],
    [] as TaskServiceTaskRecord
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const events = useMemo<CalendarEventWithMeta[]>(() => {
    const fallbackZone = timeZone;
    return rawEvents.reduce<CalendarEventWithMeta[]>((acc, record) => {
      const date = record.dateString || "";
      if (!date) return acc;
      const sanitizedTimeZone = safeTimeZone((record as any).timeZone, fallbackZone);
      const sanitizedTime = normalizeTimeString((record as any).time);
      const parsedStart = parseDateTimeInZone(
        date,
        sanitizedTimeZone,
        sanitizedTime === "All Day" ? undefined : sanitizedTime
      );
      if (!parsedStart) return acc;

      const rawEndDate = (record as any).endDate;
      const rawEndTime = (record as any).endTime;
      const sanitizedEndTime = rawEndTime ? normalizeTimeString(rawEndTime) : undefined;
      const endTimeArg =
        sanitizedEndTime && sanitizedEndTime !== "All Day"
          ? sanitizedEndTime
          : sanitizedTime !== "All Day"
            ? sanitizedTime
            : undefined;
      const parsedEnd = rawEndDate
        ? parseDateTimeInZone(rawEndDate, sanitizedTimeZone, endTimeArg) || parsedStart
        : parsedStart;
      const parsedRecurrenceEnd = (record as any).recurrenceEndDate
        ? parseDateTimeInZone((record as any).recurrenceEndDate, sanitizedTimeZone)
        : null;

      acc.push({
        ...record,
        date,
        time: sanitizedTime,
        endTime: sanitizedEndTime ?? (record as any).endTime,
        timeZone: sanitizedTimeZone,
        __cachedStart: parsedStart,
        __cachedEnd: parsedEnd,
        __cachedRecurrenceEnd: parsedRecurrenceEnd,
      });
      return acc;
    }, []);
  }, [rawEvents, timeZone]);
  const tasks = useMemo<Task[]>(() => {
    const fallbackZone = timeZone;
    return rawTasks.reduce<Task[]>((acc, record) => {
      const date = (record as any).dateString || "";
      if (!date) return acc;
      if (!parseDateTimeInZone(date, fallbackZone)) return acc;
      const sanitizedTime = normalizeTimeString((record as any).due || (record as any).dueDisplay);
      acc.push({
        ...record,
        date,
        due: sanitizedTime,
        memberId: (record as any).assigneeId || (record as any).memberId || undefined,
        assignee: (record as any).assigneeId || (record as any).memberId || undefined,
      });
      return acc;
    }, []);
  }, [rawTasks, timeZone]);

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

  const formatZoned = useCallback((value: Date | undefined, pattern: string): string => {
    if (!value) return "";
    return safeFormatInTimeZone(value, timeZone, pattern);
  }, [timeZone]);

  const isFocused = useIsFocused();

  const showPermissionToast = (type: 'event' | 'task') => {
    ReactNativeHapticFeedback.trigger("notificationError", hapticOptions);
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
  const scrollOffsetRef = useRef(0);
  const headerScrollRef = useRef<ScrollView>(null);
  const HOUR_HEIGHT = 60;
  const TIMELINE_VERTICAL_PADDING = 16;
  const TIMELINE_BOTTOM_BUFFER = 40;
  const layoutReadyRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const handleTimelineLayout = () => {
    layoutReadyRef.current = true;
  };

  const scrollToCurrentTime = useCallback((targetDate: Date | null = null, animated = true) => {
    if (!layoutReadyRef.current) return;
    if (activeView !== "Day" && activeView !== "Week") return;

    const referenceDate = targetDate || selectedDate;
    if (!referenceDate) return;

    const currentZoned = toZonedTime(new Date(), timeZone);
    const todayZoned = startOfDay(currentZoned);
    let shouldScroll = false;

    if (activeView === "Day") {
      shouldScroll = isSameDay(referenceDate, todayZoned);
    } else {
      const startOfCurrentWeek = startOfWeek(referenceDate, weekOptions);
      const endOfCurrentWeek = endOfWeek(referenceDate, weekOptions);
      shouldScroll = isWithinInterval(todayZoned, { start: startOfCurrentWeek, end: endOfCurrentWeek });
    }

    if (!shouldScroll) return;

    const now = new Date();
    const hour = parseInt(safeFormatInTimeZone(now, timeZone, 'H', '0'), 10);
    const minute = parseInt(safeFormatInTimeZone(now, timeZone, 'm', '0'), 10);
    const minutes = (hour * 60) + minute;
    const y = (minutes / 60) * HOUR_HEIGHT;
    const twoHoursInPx = 2 * HOUR_HEIGHT;
    const targetOffset = Math.max(0, y - twoHoursInPx);

    scrollOffsetRef.current = targetOffset;
    scrollViewRef.current?.scrollTo({
      y: targetOffset,
      animated,
    });
  }, [activeView, selectedDate, timeZone, weekOptions]);

  // Scroll on mount, view change, or when returning to today
  useEffect(() => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({
        y: scrollOffsetRef.current,
        animated: false,
      });
    });
  }, []);

  const focusScrollRef = useRef(false);
  const previousActiveViewRef = useRef(activeView);
  useEffect(() => {
    if (isFocused) {
      const viewChanged = previousActiveViewRef.current !== activeView;
      const isTimelineView = activeView === "Day" || activeView === "Week";
      if (!focusScrollRef.current || (viewChanged && isTimelineView)) {
        const nowZoned = toZonedTime(new Date(), timeZone);
        requestAnimationFrame(() => scrollToCurrentTime(nowZoned));
        focusScrollRef.current = true;
      }
      previousActiveViewRef.current = activeView;
    } else {
      focusScrollRef.current = false;
    }
  }, [activeView, isFocused, scrollToCurrentTime, timeZone]);

  useEffect(() => {
    return () => {
      scrollViewRef.current = null;
      headerScrollRef.current = null;
    };
  }, []);


  const today = toZonedTime(new Date(), timeZone);

  // Unified items (Events + Tasks)
  const filteredEvents = useMemo<CalendarEventWithMeta[]>(() => {
    if (!filterMember) return events;
    return events.filter((e: CalendarEventWithMeta) => e.memberId === filterMember);
  }, [events, filterMember]);

  const filteredTasks = useMemo(() => {
    if (!filterMember) return tasks;
    return tasks.filter((t: Task) => t.assignee === filterMember);
  }, [tasks, filterMember]);

  const zonedNow = toZonedTime(now, timeZone);
  const currentTimeHours = parseInt(safeFormatInTimeZone(now, timeZone, 'H', '0'), 10);
  const currentTimeMinutes = parseInt(safeFormatInTimeZone(now, timeZone, 'm', '0'), 10);
  const currentTimeTop = (currentTimeHours * HOUR_HEIGHT) + (currentTimeMinutes * (HOUR_HEIGHT / 60));

  const calendarItems = useMemo<CalendarListEntry[]>(() => {
    const eventItems = filteredEvents.map((e: CalendarEventWithMeta) => ({
      ...e,
      type: 'event' as const,
      timeZone: e.timeZone || timeZone,
    }));
    const taskItems = filteredTasks
      .filter((t: Task) => t.status !== 'done')
      .map((t: Task) => ({
        id: t.id,
        title: t.name,
        icon: t.icon,
        date: t.date,
        time: t.due || "All Day",
        memberId: t.assignee,
        type: 'task' as const,
        priority: t.priority,
        timeZone,
      }));

    return [...eventItems, ...taskItems];
  }, [filteredEvents, filteredTasks, timeZone]);

  const upcomingItems = useMemo<UpcomingEntry[]>(() => {
    const entries: UpcomingEntry[] = [];
    if (!selectedDate) return entries;
    const nowMinutes = currentTimeHours * 60 + currentTimeMinutes;
    // Look ahead up to 14 days to collect future events
    for (let i = 0; i < 14; i++) {
      const targetDay = addDays(zonedNow, i);
      const dayEvents = getEventsForDate(targetDay, filteredEvents, filteredTasks, timeZone) as CalendarListEntry[];

      dayEvents.forEach(item => {
        // For today, only include events that are in the future
        if (i === 0) {
          const itemStartMins = item.time && item.time !== "All Day"
            ? (() => { const m = item.time.match(/(\d+):(\d+)\s*(AM|PM)/i); if (!m) return -1; let h = parseInt(m[1]); if (m[3].toUpperCase() === "PM" && h !== 12) h += 12; if (m[3].toUpperCase() === "AM" && h === 12) h = 0; return h * 60 + parseInt(m[2]); })()
            : -1;

          // If it's an all-day event or happened in the past, skip it for the "upcoming" list
          if (itemStartMins < nowMinutes) return;
        }

        // Generate a valid 'nextDate' for sorting using the target day and the item's time
        const itemTime = item.time && item.time !== "All Day" ? item.time : "12:00 AM";
        const pseudoDate = parseTimeToDate(targetDay, itemTime);

        // Avoid duplicate IDs in the unified list (since getEventsForDate generates virtual IDs for recurrences, this is safe)
        if (!entries.find(e => e.id === item.id && isSameDay(e.nextDate, pseudoDate))) {
          entries.push({ ...item, nextDate: pseudoDate });
        }
      });

      // Break early if we have enough items
      if (entries.length > 10) break;
    }

    return entries.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
  }, [filteredEvents, filteredTasks, timeZone, zonedNow, currentTimeHours, currentTimeMinutes, selectedDate]);

  const todayUpcomingItems = useMemo<UpcomingEntry[]>(() => {
    if (!selectedDate) return [];
    const targetDateStr = safeFormatInTimeZone(zonedNow, timeZone, "yyyy-MM-dd");
    if (!targetDateStr) return [];
    return upcomingItems.filter(item => safeFormatInTimeZone(item.nextDate, timeZone, "yyyy-MM-dd") === targetDateStr);
  }, [upcomingItems, zonedNow, timeZone, selectedDate]);

  const navigateDate = (direction: number) => {
    if (activeView === "Month") {
      setSelectedDate(prev => direction > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
    } else if (activeView === "Week") {
      setSelectedDate(prev => {
        const nextWeek = direction > 0 ? addDays(prev, 7) : subDays(prev, 7);
        return startOfWeek(nextWeek, weekOptions);
      });
    } else {
      setSelectedDate(prev => addDays(prev, direction));
    }
  };

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(selectedDate), weekOptions);
    const end = endOfWeek(endOfMonth(selectedDate), weekOptions);
    return eachDayOfInterval({ start, end });
  }, [selectedDate, weekOptions]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, weekOptions);
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [selectedDate, weekOptions]);

  // ---------------------------------------------------------
  // Pre-process month events ONLY for the current month view
  // ---------------------------------------------------------
  // Pre-build member colour map once so month-grid event-dot rendering is O(1)
  const memberColorMap = useMemo<Map<string, string>>(() => {
    const map = new Map<string, string>();
    members.forEach((m: any) => {
      const pc = PROFILE_COLORS.find((c: any) => c.value === m.color);
      map.set(m.id, pc ? pc.hex : '');
    });
    return map;
  }, [members]);

  // ---------------------------------------------------------
  // Two-phase month event loading:
  //   Phase 1: instantly show the empty grid (no event dots)
  //   Phase 2: after the tab-switch animation settles, compute
  //            event dots in the background and setState
  // ---------------------------------------------------------
  const [groupedEventsForMonth, setGroupedEventsForMonth] = useState<Map<string, any[]>>(
    () => new Map()
  );

  useEffect(() => {
    if (activeView !== 'Month') {
      setGroupedEventsForMonth(new Map());
      return;
    }

    // Phase 1: Clear and render instant grid
    setGroupedEventsForMonth(new Map());

    const computeHandle = InteractionManager.runAfterInteractions(() => {
      const fullMap = new Map<string, any[]>();

      // Phase 2: Show today immediately as top priority
      const todayDate = new Date();
      const todayKey = safeFormatInTimeZone(todayDate, timeZone, 'yyyy-MM-dd') || '';
      const todayInMonth = monthDays.find(d => isSameDay(d, todayDate));

      if (todayInMonth) {
        const todayEvents = getEventsForDate(todayInMonth, filteredEvents, filteredTasks, timeZone) as any[];
        fullMap.set(todayKey, todayEvents);
        setGroupedEventsForMonth(new Map(fullMap));
      }

      // Phase 3: Background load everything else in small batches
      const otherDays = monthDays.filter(d => !todayInMonth || !isSameDay(d, todayInMonth));
      let index = 0;
      const CHUNK = 6; // Process one row at a time

      const backgroundProcess = () => {
        if (index >= otherDays.length) return;

        const end = Math.min(index + CHUNK, otherDays.length);
        for (let i = index; i < end; i++) {
          const day = otherDays[i];
          const key = safeFormatInTimeZone(day, timeZone, 'yyyy-MM-dd') || '';
          const events = getEventsForDate(day, filteredEvents, filteredTasks, timeZone) as any[];
          fullMap.set(key, events);
        }

        index = end;
        setGroupedEventsForMonth(new Map(fullMap));

        if (index < otherDays.length) {
          // Use setTimeout 0 to give the JS thread a breather between chunks
          setTimeout(backgroundProcess, 0);
        }
      };

      if (otherDays.length > 0) {
        setTimeout(backgroundProcess, 0);
      }
    });

    return () => computeHandle.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, monthDays, filteredEvents, filteredTasks, timeZone]);

  const monthViewJsx = useMemo(() => (
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

          const dateKey = safeFormatInTimeZone(day, timeZone, "yyyy-MM-dd") || '';
          const dayEvents = groupedEventsForMonth.get(dateKey) || [];
          // Day number label: just use getDate() — no timezone conversion needed for display
          const dayLabel = String(day.getDate());

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
                isToday && !isSelected && { color: accentColor, fontWeight: "700" }
              ]}>
                {dayLabel}
              </Text>

              <View style={styles.eventDotRx}>
                {dayEvents.slice(0, 3).map((e, idx) => {
                  // O(1) look-up using the pre-built map instead of two nested Array.find() calls
                  const dotColor = memberColorMap.get(e.memberId) || accentColor;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [monthDays, selectedDate, today, groupedEventsForMonth, memberColorMap, colors, radius, timeZone]);

  // Keep a stable function reference so consumers can call renderMonthView()
  const renderMonthView = useCallback(() => monthViewJsx, [monthViewJsx]);

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

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = Boolean(state.isConnected && (state.isInternetReachable ?? true));
      setIsOnline(connected);
    });
    return () => unsubscribe();
  }, []);

  const handleManualRefresh = useCallback(async () => {
    if (!isOnline || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await SyncService.sync(false, { mode: "manual" });
    } catch (error) {
      console.error("CalendarScreen: Manual sync failed", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isOnline, isRefreshing]);

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
                <Text style={[styles.dayHeaderWeekday, { color: accentColor }]}>{formatZoned(selectedDate, "EEEE")}</Text>
              </View>
            </View>
          )}

            <ScrollView
              ref={scrollViewRef}
              style={{ height: 300 }}
              contentContainerStyle={{
                height: 24 * HOUR_HEIGHT + TIMELINE_VERTICAL_PADDING + TIMELINE_BOTTOM_BUFFER,
              }}
              onLayout={handleTimelineLayout}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(event) => {
                scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
              }}
            >
              <View style={{ flexDirection: 'row', height: '100%' }}>
                <View
                  style={{
                    width: 50,
                    borderRightWidth: 1,
                    borderRightColor: colors.border,
                    backgroundColor: colors.card,
                    zIndex: 20,
                    paddingTop: TIMELINE_VERTICAL_PADDING,
                    paddingBottom: TIMELINE_BOTTOM_BUFFER,
                  }}
                >
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <View key={`hour-${hour}`} style={{ height: HOUR_HEIGHT, justifyContent: 'flex-start', alignItems: 'flex-end', paddingRight: 8 }}>
                      <Text style={{ fontSize: 12, color: colors.mutedForeground, transform: [{ translateY: -8 }] }}>
                        {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                      </Text>
                    </View>
                  ))}
                  <View style={{ height: HOUR_HEIGHT, justifyContent: 'flex-start', alignItems: 'flex-end', paddingRight: 8 }}>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground, transform: [{ translateY: -8 }] }}>
                      12 AM
                    </Text>
                  </View>
                </View>

                <View
                  style={{ width: (Dimensions.get('window').width - DAY_VIEW_OFFSET) }}
                >
                  <View
                    style={{
                      flex: 1,
                      position: 'relative',
                      paddingTop: TIMELINE_VERTICAL_PADDING,
                      paddingBottom: TIMELINE_BOTTOM_BUFFER,
                    }}
                  >
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
                    const dayEvents = getEventsForDate(day, filteredEvents, filteredTasks, timeZone) as any[];

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
                        top: currentTimeTop,
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
              {isOnline && (
                <Pressable
                  style={[
                    styles.refreshButton,
                    { borderColor: "rgba(255,255,255,0.4)" },
                    isRefreshing && { opacity: 0.7 },
                  ]}
                  onPress={handleManualRefresh}
                  disabled={isRefreshing}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {isRefreshing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <AppIcon name="rotateCw" size={20} color="#fff" />
                  )}
                </Pressable>
              )}
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
                  activeView === view && [
                    styles.segmentBtnActive,
                    { backgroundColor: isMidnight ? colors.primary : "#fff" },
                  ]
                ]}
              >
                <Text style={[
                  styles.segmentText,
                  activeView === view
                    ? { color: isMidnight ? colors.primaryForeground : colors.primary }
                    : { color: "rgba(255,255,255,0.8)" }
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
                <MemberIcon symbol={member.symbol} size={16} color={filterMember === member.id ? "#fff" : colors.foreground} />
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
            <Pressable onPress={() => {
              const now = toZonedTime(new Date(), timeZone);
              setSelectedDate(now);
              requestAnimationFrame(() => scrollToCurrentTime(now));
            }} style={[styles.todayBtn, { backgroundColor: colors.primary + '15', borderRadius: radius.sm }]}>
              <Text style={[styles.todayText, { color: accentColor }]}>Today</Text>
            </Pressable>
            <Pressable onPress={() => navigateDate(1)} style={[styles.navArrow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.sm }]}>
              <AppIcon name="chevronRight" size={20} color={colors.foreground} />
            </Pressable>
          </View>

          {activeView === "Month" && renderMonthView()}
          {(activeView === "Week" || activeView === "Day") && renderTimeline(activeView === "Week" ? weekDays : [selectedDate])}

          {todayUpcomingItems.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>📆 Today ahead</Text>
              {todayUpcomingItems.map(event => {
                const displayTime = event.time && event.time !== "All Day" ? event.time : "All Day";
                return (
                  <Pressable
                    key={`${event.id}-${event.nextDate.getTime()}-today`}
                    onPress={() => {
                      setSelectedEvent(event);
                      setShowAddEventModal(true);
                    }}
                    style={[styles.upcomingItem, { backgroundColor: colors.card, borderRadius: radius.card }]}
                  >
                    <View style={styles.upcomingLeft}>
                      <AppIcon source={event.icon || ''} size={24} color={colors.foreground} />
                      <View>
                        <Text style={[styles.upcomingTitle, { color: colors.foreground }]}>{resolveEntryTitle(event)}</Text>
                        <Text style={[styles.upcomingMeta, { color: colors.mutedForeground }]}>{displayTime}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>📋 Upcoming Events</Text>
            {upcomingItems.slice(0, 3).map(event => {
              const displayDate = safeFormatInTimeZone(event.nextDate, timeZone, "MMM d");
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
                    <AppIcon source={event.icon || ''} size={24} color={colors.foreground} />
                    <View>
                      <Text style={[styles.upcomingTitle, { color: colors.foreground }]}>{resolveEntryTitle(event)}</Text>
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
    paddingRight: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
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
  calendarPriorityBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  calendarPriorityBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },
});

export const CalendarScreen = withDeferredScreen(CalendarScreenContent, {
  title: "Calendar",
  subtitle: "Gathering events...",
  layoutProps: { showNav: false, showAddButton: true },
});
