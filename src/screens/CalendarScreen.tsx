// ... imports
import React, { useState, useRef, useMemo } from "react";
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
import { AppIcon } from "../components/ui/AppIcon";
import { useSidebar } from "../contexts/SidebarContext";
import { format, addMonths, subMonths, addDays, startOfWeek, endOfWeek, isSameMonth, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { useNavigation } from "@react-navigation/native";

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

  const [activeView, setActiveView] = useState("Day");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [filterMember, setFilterMember] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
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
    <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
      {/* Day Headers */}
      <View style={styles.gridHeader}>
        {daysOfWeek.map((day, i) => (
          <Text key={i} style={[styles.gridHeaderLabel, { color: theme.colors.mutedForeground }, i === 0 && styles.textDanger]}>
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
                !isCurrentMonth && styles.dayCellFaded,
                isSelected && { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary },
                isToday && !isSelected && { backgroundColor: "rgba(59, 130, 246, 0.1)", borderWidth: 1, borderColor: theme.colors.primary }
              ]}
            >
              <Text style={[
                styles.dayText,
                { color: theme.colors.foreground },
                !isCurrentMonth && { color: theme.colors.mutedForeground },
                isSelected && { color: "#fff", fontWeight: "700" },
                isToday && !isSelected && { color: theme.colors.primary, fontWeight: "700" }
              ]}>
                {format(day, "d")}
              </Text>

              <View style={styles.eventDotRx}>
                {dayEvents.slice(0, 3).map((e, idx) => {
                  const member = members.find(m => m.id === e.memberId);
                  const dotColor = member?.color === "member-blue" ? "#3b82f6" :
                    member?.color === "member-green" ? "#22c55e" :
                      member?.color === "member-orange" ? "#f97316" :
                        member?.color === "member-pink" ? "#ec4899" :
                          member?.color === "member-purple" ? "#8b5cf6" : "#ef4444";
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.eventDot,
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

  const renderTimeline = (days: Date[]) => (
    <View style={{ flex: 1 }}>
      {/* Week Header if Week View */}
      {activeView === "Week" && (
        <View style={styles.weekHeaderRow}>
          {days.map((day, i) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, today);
            return (
              <Pressable
                key={i}
                onPress={() => setSelectedDate(day)}
                style={[
                  styles.weekHeaderCell,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                  isSelected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                  isToday && !isSelected && { backgroundColor: "rgba(59, 130, 246, 0.1)" }
                ]}
              >
                <Text style={[styles.weekDayLabel, { color: theme.colors.mutedForeground }, isSelected && styles.textWhite]}>{format(day, "EEE")}</Text>
                <Text style={[styles.weekDateLabel, { color: theme.colors.foreground }, isSelected && styles.textWhite]}>{format(day, "d")}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Timeline */}
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        {activeView === "Day" && (
          <View style={styles.dayHeader}>
            <Text style={[styles.dayHeaderNumber, { color: theme.colors.foreground }]}>{format(selectedDate, "d")}</Text>
            <View>
              <Text style={[styles.dayHeaderMonth, { color: theme.colors.foreground }]}>{format(selectedDate, "MMMM yyyy")}</Text>
              <Text style={[styles.dayHeaderWeekday, { color: theme.colors.primary }]}>{format(selectedDate, "EEEE")}</Text>
            </View>
          </View>
        )}

        <ScrollView style={{ height: 300 }} nestedScrollEnabled={true}>
          {Array.from({ length: 24 }).map((_, hour) => {
            const hourEvents = activeView === "Day"
              ? currentEvents.filter(e => {
                const d = new Date(e.date);
                // Simple check: assumes event.time is HH:MM or similar. ideally use Date objects.
                // For now, filtering by date string match + strict hour parsing if possible, or just date match for simplicity in this MVP step if filteredFilters is weak
                return isSameDay(d, selectedDate) && (parseInt(e.time) === hour || (!parseInt(e.time) && hour === 9)); // fallback
              })
              : [];
            // Improving time filter:
            const eventsInHour = currentEvents.filter(e => {
              if (!isSameDay(new Date(e.date), selectedDate)) return false;
              if (e.time === "All Day") return hour === 0;
              const h = parseInt(e.time.split(":")[0]);
              return h === hour;
            });

            return (
              <Pressable
                key={hour}
                style={styles.timelineRow}
                onPress={() => {
                  const timeString = hour === 0 ? "12:00 AM" : hour < 12 ? `${hour}:00 AM` : hour === 12 ? "12:00 PM" : `${hour - 12}:00 PM`;
                  setSelectedTime(timeString);
                  setShowAddEventModal(true);
                }}
              >
                <Text style={[styles.timeLabel, { color: theme.colors.mutedForeground }]}>
                  {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                </Text>
                <View style={[styles.timelineContent, { borderLeftColor: theme.colors.border }]}>
                  {activeView === "Day" && eventsInHour.map((event, idx) => {
                    const member = members.find(m => m.id === event.memberId);
                    const bgColor = member?.color === "member-blue" ? "#dbeafe" :
                      member?.color === "member-green" ? "#dcfce7" : "#ffedd5";
                    return (
                      <View key={event.id} style={[styles.eventBlock, { backgroundColor: bgColor }]}>
                        <Text style={[styles.eventBlockTitle, { color: theme.colors.foreground }]}>{event.title}</Text>
                      </View>
                    );
                  })}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <AppLayout showNav={false} showAddButton={true} onAddPress={() => setShowAddEventModal(true)}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header Section */}
        <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Pressable onPress={openSidebar} style={styles.iconButton}>
                <AppIcon name="menu" size={20} color="#fff" />
              </Pressable>
              <View style={styles.monthSelector}>
                <Text style={styles.monthTitle}>{format(selectedDate, "MMMM yyyy")}</Text>
                <AppIcon name="chevronRight" size={16} color="#fff" />
              </View>
            </View>

            <View style={styles.headerRight}>
              <Pressable onPress={() => setShowSearch(true)} style={styles.iconButton}>
                <AppIcon name="search" size={20} color="#fff" />
              </Pressable>
              <Pressable style={styles.iconButton}>
                <AppIcon name="bell" size={20} color="#fff" />
              </Pressable>
              <Pressable
                style={styles.addBtn}
                onPress={() => setShowAddEventModal(true)}
              >
                <AppIcon name="plus" size={20} color={theme.colors.primary} />
              </Pressable>
            </View>
          </View>

          {/* View Segmented Control */}
          <View style={styles.segmentContainer}>
            {views.map(view => (
              <Pressable
                key={view}
                onPress={() => setActiveView(view)}
                style={[
                  styles.segmentBtn,
                  activeView === view && styles.segmentBtnActive
                ]}
              >
                <Text style={[
                  styles.segmentText,
                  activeView === view ? { color: theme.colors.primary } : { color: "rgba(255,255,255,0.8)" }
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
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                filterMember === null && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
              ]}
            >
              <AppIcon name="users" size={14} color={filterMember === null ? "#fff" : theme.colors.foreground} />
              <Text style={[
                styles.filterText,
                { color: theme.colors.foreground },
                filterMember === null && styles.textWhite
              ]}>All</Text>
            </Pressable>
            {members.map(member => (
              <Pressable
                key={member.id}
                onPress={() => setFilterMember(member.id)}
                style={[
                  styles.filterChip,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                  filterMember === member.id && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                ]}
              >
                <Text style={styles.filterEmoji}>{member.symbol}</Text>
                <Text style={[
                  styles.filterText,
                  { color: theme.colors.foreground },
                  filterMember === member.id && styles.textWhite
                ]}>{member.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Date Navigation */}
          <View style={styles.dateNav}>
            <Pressable onPress={() => navigateDate(-1)} style={[styles.navArrow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <AppIcon name="chevronLeft" size={20} color={theme.colors.foreground} />
            </Pressable>
            <Pressable onPress={() => setSelectedDate(new Date())} style={styles.todayBtn}>
              <Text style={[styles.todayText, { color: theme.colors.primary }]}>Today</Text>
            </Pressable>
            <Pressable onPress={() => navigateDate(1)} style={[styles.navArrow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <AppIcon name="chevronRight" size={20} color={theme.colors.foreground} />
            </Pressable>
          </View>

          {activeView === "Month" && renderMonthView()}
          {(activeView === "Week" || activeView === "Day") && renderTimeline(activeView === "Week" ? weekDays : [selectedDate])}

          {/* Upcoming Events (Simplified Logic) */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>📋 Upcoming Events</Text>
            {currentEvents.slice(0, 3).map(event => (
              <View key={event.id} style={[styles.upcomingItem, { backgroundColor: theme.colors.card }]}>
                <View style={styles.upcomingLeft}>
                  <Text style={{ fontSize: 24 }}>{event.icon}</Text>
                  <View>
                    <Text style={[styles.upcomingTitle, { color: theme.colors.foreground }]}>{event.title}</Text>
                    <Text style={[styles.upcomingMeta, { color: theme.colors.mutedForeground }]}>{format(new Date(event.date), "MMM d")} · {event.time}</Text>
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
    backgroundColor: theme.colors.background,
  },
  header: {
    // backgroundColor handled inline
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
    borderRadius: 4,
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
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
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
    borderRadius: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 2,
  },
  segmentBtnActive: {
    backgroundColor: "#fff",
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
    borderRadius: 4,
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
    borderRadius: 4,
    borderWidth: 1,
  },
  todayBtn: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  todayText: {
    fontWeight: "600",
  },
  card: {
    borderRadius: 4,
    padding: 12,
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
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 8,
    borderRadius: 4,
  },
  dayCellFaded: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  eventDotRx: {
    flexDirection: "row",
    gap: 2,
    justifyContent: "center",
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
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
    borderRadius: 4,
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
    minHeight: 60,
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
    borderRadius: 4,
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
    borderRadius: 4,
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
