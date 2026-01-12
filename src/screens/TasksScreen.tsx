import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { AppLayout } from "../components/layout/AppLayout";
import { theme } from "../theme";
import { AddTaskModal } from "../components/modals/AddTaskModal";
import { GlobalSearch } from "../components/search/GlobalSearch";
import { useSidebar } from "../contexts/SidebarContext";
import { AppIcon } from "../components/ui/AppIcon";
import { ChoreRotationSystem } from "../components/chores/ChoreRotationSystem";

interface Task {
  id: string;
  icon: string;
  name: string;
  status: "pending" | "done";
  priority: "high" | "medium" | "low";
  due: string;
  assignee: string;
  tab: string;
}

const tabs = ["My Tasks", "Family Tasks", "Kids Chores"];

const initialTasks: Task[] = [
  { id: "t1", icon: "📝", name: "Complete project report", status: "pending", priority: "high", due: "Today", assignee: "You", tab: "My Tasks" },
  { id: "t2", icon: "📞", name: "Call insurance company", status: "pending", priority: "medium", due: "Today", assignee: "You", tab: "My Tasks" },
  { id: "t3", icon: "💊", name: "Pick up medications", status: "done", priority: "high", due: "Done", assignee: "You", tab: "My Tasks" },
  { id: "t4", icon: "📧", name: "Reply to emails", status: "done", priority: "low", due: "Done", assignee: "You", tab: "My Tasks" },

  { id: "t5", icon: "🏫", name: "Sign permission slip", status: "done", priority: "high", due: "Tomorrow", assignee: "Mom", tab: "Family Tasks" },
  { id: "t6", icon: "🛠️", name: "Fix leaky faucet", status: "pending", priority: "medium", due: "This week", assignee: "Dad", tab: "Family Tasks" },
  { id: "t7", icon: "📦", name: "Order birthday cake", status: "pending", priority: "high", due: "In 2 days", assignee: "You", tab: "Family Tasks" },
];

const getPriorityStyle = (priority: Task["priority"]) => {
  switch (priority) {
    case "high":
      return { label: "High", color: theme.colors.danger, background: theme.colors.danger + '25' };
    case "medium":
      return { label: "Medium", color: theme.colors.warning, background: theme.colors.warning + '30' };
    default:
      return { label: "Low", color: theme.colors.info, background: theme.colors.info + '40' };
  }
};

export const TasksScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState("My Tasks");
  const [showAddTask, setShowAddTask] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const { openSidebar } = useSidebar();

  const [taskEntries, setTaskEntries] = useState<Task[]>(initialTasks);

  const filteredTasks = useMemo(
    () => taskEntries.filter((task) => task.tab === activeTab),
    [activeTab, taskEntries]
  );

  const completedCount = filteredTasks.filter((task) => task.status === "done").length;
  const totalCount = filteredTasks.length;
  const progress = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  const toggleTask = (taskId: string) => {
    setTaskEntries((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, status: task.status === "done" ? "pending" : "done" }
          : task
      )
    );
  };

  return (
    <>
      <AppLayout
        showAddButton={true}
        showNav={false}
        onAddPress={() => setShowAddTask(true)}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={openSidebar} style={[styles.menuButton, { backgroundColor: theme.colors.card }]}>
              <AppIcon name="menu" size={20} color={theme.colors.foreground} />
            </Pressable>
            <Text style={[styles.title, { color: theme.colors.foreground }]}>Tasks</Text>
            <View style={styles.headerActions}>
              <Pressable style={[styles.roundAction, { backgroundColor: theme.colors.card }]} onPress={() => setShowSearch(true)}>
                <AppIcon source="🔍" size={18} color={theme.colors.foreground} />
              </Pressable>

              <Pressable style={[styles.plusAction, { backgroundColor: theme.colors.primary }]} onPress={() => setShowAddTask(true)}>
                <AppIcon name="plus" size={18} color={theme.colors.primaryForeground} />
              </Pressable>
            </View>
          </View>

          <View style={[styles.tabs, { backgroundColor: theme.colors.muted }]}>
            {tabs.map((tab) => {
              const isActive = tab === activeTab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[
                    styles.tab,
                    isActive && { backgroundColor: theme.colors.card, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }
                  ]}
                >
                  <Text style={[styles.tabText, { color: isActive ? theme.colors.foreground : theme.colors.mutedForeground }]}>{tab}</Text>
                </Pressable>
              );
            })}
          </View>

          {activeTab === "Kids Chores" ? (
            <ChoreRotationSystem />
          ) : (
            <>
              <View style={[styles.progressCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.border }]}>
                <View style={styles.progressHeader}>
                  <Text style={[styles.progressLabel, { color: theme.colors.foreground }]}>Progress: {completedCount}/{totalCount}</Text>
                  <Text style={[styles.progressPercent, { color: theme.colors.mutedForeground }]}>{progress}%</Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: theme.colors.muted }]}>
                  <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.colors.primary }]} />
                </View>
              </View>

              <View style={styles.taskList}>
                {filteredTasks.map((task) => {
                  const priorityStyle = getPriorityStyle(task.priority);
                  return (
                    <View
                      key={task.id}
                      style={[
                        styles.taskCard,
                        { backgroundColor: theme.colors.card, shadowColor: theme.colors.border },
                        task.status === "done" && { opacity: 0.6 }
                      ]}
                    >
                      <Pressable
                        style={[
                          styles.checkCircle,
                          { borderColor: theme.colors.mutedForeground },
                          task.status === "done" && { backgroundColor: theme.colors.success, borderColor: theme.colors.success }
                        ]}
                        onPress={() => toggleTask(task.id)}
                      >
                        {task.status === "done" && <Text style={styles.checkMark}>✓</Text>}
                      </Pressable>
                      <View style={styles.taskDetails}>
                        <View style={styles.taskTitleRow}>
                          <Text style={{ fontSize: 20, marginRight: 8 }}>{task.icon}</Text>
                          <Text style={[styles.taskTitle, { color: theme.colors.foreground }, task.status === "done" && { color: theme.colors.mutedForeground }]}>
                            {task.name}
                          </Text>
                        </View>
                        <View style={styles.metaRow}>
                          <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.background }]}>
                            <Text style={[styles.priorityText, { color: priorityStyle.color }]}>
                              {priorityStyle.label}
                            </Text>
                          </View>
                          <View style={styles.metaItem}>
                            <AppIcon name="clock" size={14} color={theme.colors.mutedForeground} style={styles.metaIcon} />
                            <Text style={[styles.metaText, { color: theme.colors.mutedForeground }]}>{task.due}</Text>
                          </View>
                          <View style={styles.metaItem}>
                            <AppIcon name="user" size={14} color={theme.colors.mutedForeground} style={styles.metaIcon} />
                            <Text style={[styles.metaText, { color: theme.colors.mutedForeground }]}>{task.assignee}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>

              <Pressable style={[styles.addNewRow]} onPress={() => setShowAddTask(true)}>
                <AppIcon name="plus" size={16} color={theme.colors.primary} style={styles.addNewIcon} />
                <Text style={[styles.addNewText, { color: theme.colors.primary }]}>Add new task</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </AppLayout>
      <GlobalSearch open={showSearch} onClose={() => setShowSearch(false)} />
      <AddTaskModal open={showAddTask} onClose={() => setShowAddTask(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 120,
    // Background handled by AppLayout
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    flex: 1,
    fontSize: 26,
    fontWeight: "700",
    marginLeft: 16,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  roundAction: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  plusAction: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  tabs: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 12,
  },
  tabText: {
    fontWeight: "600",
  },
  progressCard: {
    borderRadius: 20,
    padding: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    fontWeight: "600",
  },
  progressPercent: {
    fontWeight: "600",
  },
  progressBar: {
    height: 10,
    borderRadius: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 6,
  },
  taskList: {
    marginBottom: 24,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 22,
    padding: 16,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  checkMark: {
    color: "#fff",
    fontWeight: "bold",
  },
  taskDetails: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  metaIcon: {
    marginRight: 4,
  },
  priorityBadge: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  priorityText: {
    fontWeight: "700",
  },
  metaText: {
    fontSize: 12,
  },
  addNewRow: {
    marginTop: 8,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addNewIcon: {
    marginRight: 4,
  },
  addNewText: {
    fontWeight: "700",
    fontSize: 18,
  },
});
