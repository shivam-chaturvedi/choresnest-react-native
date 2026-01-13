import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Dimensions,
  Platform,
} from "react-native";
import { AppLayout } from "../components/layout/AppLayout";
import { AddEventModal } from "../components/modals/AddEventModal";
import { GlobalSearch } from "../components/search/GlobalSearch";
import { useFamily } from "../contexts/FamilyContext";
import { theme } from "../theme";
import { useThemeColors, useThemeRadius } from "../contexts/ThemeContext";
import { AppIcon } from "../components/ui/AppIcon";
import { PROFILE_COLORS } from "../constants/profileColors";
import { useSidebar } from "../contexts/SidebarContext";
import { format, addMonths, subMonths, addDays, startOfWeek, endOfWeek, isSameMonth, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

const filteredEvents = (events: any[], filterMember: string | null) => {
  if (!filterMember) return events;
  return events.filter((e) => e.memberId === filterMember);
};

const views = ["Day", "Week", "Month"];
const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const CalendarScreen: React.FC = () => {
  const { members, events } = useFamily();
  const { openSidebar } = useSidebar();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const radius = useThemeRadius();

  const [activeView, setActiveView] = useState("Day");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [filterMember, setFilterMember] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  /* New state for current time line */
  const [now, setNow] = useState(new Date());
  const scrollViewRef = useRef<ScrollView>(null);
  const HOUR_HEIGHT = 60;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if ((activeView === "Day" || activeView === "Week") && scrollViewRef.current) {
      const currentHour = new Date().getHours();
      // Scroll to current time - 1 hour for context
      const scrollY = Math.max(0, (currentHour - 1) * HOUR_HEIGHT);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: scrollY, animated: true });
      }, 500);
    }
  }, [activeView]);

  // Auto-scroll when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if ((activeView === "Day" || activeView === "Week") && scrollViewRef.current) {
        const currentHour = new Date().getHours();
        const scrollY = Math.max(0, (currentHour - 1) * HOUR_HEIGHT);
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: scrollY, animated: true });
        }, 500);
      }
    }, [activeView])
  );

  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);

  const today = new Date();

  const currentEvents = useMemo(() =>
    filteredEvents(events, filterMember),
    [events, filterMember]
  );

  const navigateDate = (direction: number) => {
    if (activeView === "Month") {
      setSelectedDate(prev => direction > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
    } else {
      setSelectedDate(prev => addDays(prev, direction * (activeView === "Week" ? 7 : 1)));
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
      {/* Day Headers */}
      <View style={styles.gridHeader}>
        {daysOfWeek.map((day, i) => (
          <Text key={i} style={[styles.gridHeaderLabel, { color: colors.mutedForeground }, i === 0 && styles.textDanger]}>
            {day}
          </Text>
        ))}
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {monthDays.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, selectedDate);
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          const dayEvents = currentEvents.filter(e => isSameDay(new Date(e.date), day));

          return (
            <Pressable
              key={i}
              onPress={() => setSelectedDate(day)}
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
                {format(day, "d")}
              </Text>

              <View style={styles.eventDotRx}>
                {dayEvents.slice(0, 3).map((e, idx) => {
                  const member = members.find(m => m.id === e.memberId);
                  const profileColor = PROFILE_COLORS.find(c => c.value === member?.color);
                  const dotColor = profileColor ? profileColor.hex : colors.primary;

                  return (
                    <View
                      key={idx}
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

  const renderTimeline = (days: Date[]) => {
    const isTodayInView = days.some(d => isSameDay(d, now));
    const dayColumnWidth = 100 / days.length;

    return (
      <View style={{ flex: 1 }}>
        {activeView === "Week" && (
          <View style={[styles.weekHeaderRow, { paddingLeft: 50 }]}>
            {days.map((day, i) => {
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, now);
              return (
                <Pressable
                  key={i}
                  onPress={() => setSelectedDate(day)}
                  style={[
                    styles.weekHeaderCell,
                    { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md },
                    isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                    isToday && !isSelected && { backgroundColor: colors.primary + '15' }
                  ]}
                >
                  <Text style={[styles.weekDayLabel, { color: colors.mutedForeground }, isSelected && styles.textWhite]}>{format(day, "EEE")}</Text>
                  <Text style={[styles.weekDateLabel, { color: colors.foreground }, isSelected && styles.textWhite]}>{format(day, "d")}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: radius.card, padding: 0, overflow: 'hidden', flex: 1 }]}>
          {activeView === "Day" && (
            <View style={styles.dayHeader}>
              <Text style={[styles.dayHeaderNumber, { color: colors.foreground }]}>{format(selectedDate, "d")}</Text>
              <View>
                <Text style={[styles.dayHeaderMonth, { color: colors.foreground }]}>{format(selectedDate, "MMMM yyyy")}</Text>
                <Text style={[styles.dayHeaderWeekday, { color: colors.primary }]}>{format(selectedDate, "EEEE")}</Text>
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
              <View style={{ width: 50, borderRightWidth: 1, borderRightColor: colors.border }}>
                {Array.from({ length: 24 }).map((_, hour) => (
                  <View key={hour} style={{ height: HOUR_HEIGHT, justifyContent: 'flex-start', alignItems: 'flex-end', paddingRight: 8 }}>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground, transform: [{ translateY: -8 }] }}>
                      {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                    </Text>
                  </View>
                ))}
              </View>

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

                {days.map((day, dayIndex) => {
                  const dayEvents = currentEvents.filter(e => isSameDay(new Date(e.date), day));
                  return dayEvents.map(event => {
                    const timeParts = event.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
                    if (!timeParts && event.time !== "All Day") return null;

                    let startHour = 0, startMin = 0;
                    if (timeParts) {
                      startHour = parseInt(timeParts[1]);
                      const period = timeParts[3].toUpperCase();
                      if (period === "PM" && startHour !== 12) startHour += 12;
                      if (period === "AM" && startHour === 12) startHour = 0;
                      startMin = parseInt(timeParts[2]);
                    } else { return null; }

                    const top = (startHour * HOUR_HEIGHT) + (startMin * (HOUR_HEIGHT / 60));
                    const height = HOUR_HEIGHT;

                    const member = members.find(m => m.id === event.memberId);
                    const profileColor = PROFILE_COLORS.find(c => c.value === member?.color);
                    const bgColor = profileColor ? profileColor.hex + "40" : colors.primary + "40";
                    const borderColor = profileColor ? profileColor.hex : colors.primary;

                    return (
                      <Pressable
                        key={event.id}
                        style={{
                          position: 'absolute',
                          top,
                          left: `${dayIndex * dayColumnWidth}%`,
                          width: `${dayColumnWidth}%`,
                          height,
                          backgroundColor: bgColor,
                          borderLeftWidth: 3,
                          borderLeftColor: borderColor,
                          borderRadius: 4,
                          padding: 4,
                          zIndex: 10,
                          overflow: 'hidden'
                        }}
                        onPress={() => { console.log("Event pressed:", event.title); }}
                      >
                        <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '700', color: colors.foreground }}>
                          {event.title}
                        </Text>
                      </Pressable>
                    );
                  });
                })}

                {/* Day View Red Line */}
                {activeView === "Day" && isSameDay(selectedDate, now) && (
                  <View
                    style={{
                      position: 'absolute',
                      top: (now.getHours() * HOUR_HEIGHT) + (now.getMinutes() * (HOUR_HEIGHT / 60)),
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

                {/* Week View Red Line */}
                {activeView === "Week" && isTodayInView && (
                  days.map((day, idx) => {
                    if (!isSameDay(day, now)) return null;
                    return (
                      <View
                        key="now-line-week"
                        style={{
                          position: 'absolute',
                          top: (now.getHours() * HOUR_HEIGHT) + (now.getMinutes() * (HOUR_HEIGHT / 60)),
                          left: `${idx * dayColumnWidth}%`,
                          width: `${dayColumnWidth}%`,
                          flexDirection: 'row',
                          alignItems: 'center',
                          zIndex: 50
                        }}
                      >
                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#ef4444', position: 'absolute', left: -6 }} />
                        <View style={{ flex: 1, height: 2, backgroundColor: '#ef4444' }} />
                      </View>
                    )
                  })
                )}

                {Array.from({ length: 24 }).map((_, hour) => (
                  <Pressable
                    key={`slot-${hour}`}
                    style={{
                      position: 'absolute',
                      top: hour * HOUR_HEIGHT,
                      left: 0,
                      right: 0,
                      height: HOUR_HEIGHT,
                      zIndex: 1,
                    }}
                    onPress={() => {
                      const timeString = hour === 0 ? "12:00 AM" : hour < 12 ? `${hour}:00 AM` : hour === 12 ? "12:00 PM" : `${hour - 12}:00 PM`;
                      setSelectedTime(timeString);
                      setShowAddEventModal(true);
                    }}
                  />
                ))}
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
        {/* Header Section */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Pressable onPress={openSidebar} style={[styles.iconButton, { borderRadius: radius.sm }]}>
                <AppIcon name="menu" size={20} color="#fff" />
              </Pressable>
              <View style={styles.monthSelector}>
                <Text style={styles.monthTitle}>{format(selectedDate, "MMMM yyyy")}</Text>
                <AppIcon name="chevronRight" size={16} color="#fff" />
              </View>
            </View>

            <View style={styles.headerRight}>
              <Pressable
                onPress={() => setShowSearch(true)}
                style={[styles.iconButton, { borderRadius: radius.sm }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <AppIcon name="search" size={20} color="#fff" />
              </Pressable>

              <Pressable
                style={[styles.addBtn, { backgroundColor: "#fff", borderRadius: radius.sm }]}
                onPress={() => {
                  console.log("Opening Add Event Modal");
                  setShowAddEventModal(true);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <AppIcon name="plus" size={20} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          {/* View Segmented Control */}
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
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Member Filters */}
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
            {members.map(member => (
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

          {/* Date Navigation */}
          <View style={styles.dateNav}>
            <Pressable onPress={() => navigateDate(-1)} style={[styles.navArrow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.sm }]}>
              <AppIcon name="chevronLeft" size={20} color={colors.foreground} />
            </Pressable>
            <Pressable onPress={() => setSelectedDate(new Date())} style={[styles.todayBtn, { backgroundColor: colors.primary + '15', borderRadius: radius.sm }]}>
              <Text style={[styles.todayText, { color: colors.primary }]}>Today</Text>
            </Pressable>
            <Pressable onPress={() => navigateDate(1)} style={[styles.navArrow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.sm }]}>
              <AppIcon name="chevronRight" size={20} color={colors.foreground} />
            </Pressable>
          </View>

          {activeView === "Month" && renderMonthView()}
          {(activeView === "Week" || activeView === "Day") && renderTimeline(activeView === "Week" ? weekDays : [selectedDate])}

          {/* Upcoming Events (Simplified Logic) */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>📋 Upcoming Events</Text>
            {currentEvents.slice(0, 3).map(event => (
              <View key={event.id} style={[styles.upcomingItem, { backgroundColor: colors.card, borderRadius: radius.card }]}>
                <View style={styles.upcomingLeft}>
                  <Text style={{ fontSize: 24 }}>{event.icon}</Text>
                  <View>
                    <Text style={[styles.upcomingTitle, { color: colors.foreground }]}>{event.title}</Text>
                    <Text style={[styles.upcomingMeta, { color: colors.mutedForeground }]}>{format(new Date(event.date), "MMM d")} · {event.time}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        <AddEventModal
          open={showAddEventModal}
          onOpenChange={(open) => {
            setShowAddEventModal(open);
            if (!open) setSelectedTime(undefined);
          }}
          initialDate={format(selectedDate, "yyyy-MM-dd")}
          initialTime={selectedTime}
        />
        <GlobalSearch open={showSearch} onClose={() => setShowSearch(false)} />
      </View>
    </AppLayout>
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
    flex: 1,
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
