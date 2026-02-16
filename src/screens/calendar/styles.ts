import { StyleSheet, Platform } from "react-native";
import { theme } from "../../theme";

export const styles = StyleSheet.create({
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
