import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { AppLayout } from "../components/layout/AppLayout";

import { AddTaskModal } from "../components/modals/AddTaskModal";
import { GlobalSearch } from "../components/search/GlobalSearch";
import { useSidebar } from "../contexts/SidebarContext";
import { useThemeColors, useThemeRadius } from "../contexts/ThemeContext";
import { AppIcon } from "../components/ui/AppIcon";
import { ChoreRotationSystem } from "../components/chores/ChoreRotationSystem";
import { useFamily, Task } from "../contexts/FamilyContext";

const tabs = ["My Tasks", "Family Tasks"];

const initialTasks: Task[] = [
  { id: "t1", icon: "📝", name: "Complete project report", status: "pending", priority: "high", due: "Today", assignee: "You", tab: "My Tasks", date: new Date().toISOString().split('T')[0] },
  { id: "t2", icon: "📞", name: "Call insurance company", status: "pending", priority: "medium", due: "Today", assignee: "You", tab: "My Tasks", date: new Date().toISOString().split('T')[0] },
  { id: "t3", icon: "💊", name: "Pick up medications", status: "done", priority: "high", due: "Done", assignee: "You", tab: "My Tasks", date: new Date().toISOString().split('T')[0] },
  { id: "t4", icon: "📧", name: "Reply to emails", status: "done", priority: "low", due: "Done", assignee: "You", tab: "My Tasks", date: new Date().toISOString().split('T')[0] },

  { id: "t5", icon: "🏫", name: "Sign permission slip", status: "done", priority: "high", due: "Tomorrow", assignee: "Mom", tab: "Family Tasks", date: new Date().toISOString().split('T')[0] },
  { id: "t6", icon: "🛠️", name: "Fix leaky faucet", status: "pending", priority: "medium", due: "This week", assignee: "Dad", tab: "Family Tasks", date: new Date().toISOString().split('T')[0] },
  { id: "t7", icon: "📦", name: "Order birthday cake", status: "pending", priority: "high", due: "In 2 days", assignee: "You", tab: "Family Tasks", date: new Date().toISOString().split('T')[0] },
];

const getPriorityStyle = (priority: Task["priority"], colors: any) => {
  switch (priority) {
    case "high":
      return { label: "High", color: colors.danger, background: colors.danger + '25' };
    case "medium":
      return { label: "Medium", color: colors.warning, background: colors.warning + '30' };
    default:
      return { label: "Low", color: colors.info, background: colors.info + '40' };
  }
};

export const TasksScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState("My Tasks");
  const [showAddTask, setShowAddTask] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

  const { openSidebar } = useSidebar();
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const { tasks, addTask, updateTask, members } = useFamily();

  const filteredTasks = useMemo(
    () => tasks.filter((task) => task.tab === activeTab),
    [activeTab, tasks]
  );

  const completedCount = filteredTasks.filter((task) => task.status === "done").length;
  const totalCount = filteredTasks.length;
  const progress = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  const toggleTask = (taskId: string) => {
    try {
      if (!taskId) return;
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        updateTask(taskId, { status: task.status === "done" ? "pending" : "done" });
      }
    } catch (error) {
      console.error("Error toggling task:", error);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowAddTask(true);
  };

  const handleSaveTask = (taskData: any) => {
    try {
      // Format date as YYYY-MM-DD using local time
      const formattedDate = taskData.dueDate.toISOString().split('T')[0];

      // Format time as HH:MM AM/PM
      const formattedTime = taskData.dueDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (editingTask) {
        updateTask(editingTask.id, {
          name: taskData.name,
          icon: taskData.icon,
          priority: taskData.priority,
          date: formattedDate,
          due: formattedTime,
          assignee: taskData.person,
          tab: activeTab
        });
      } else {
        addTask({
          name: taskData.name,
          icon: taskData.icon,
          priority: taskData.priority,
          date: formattedDate,
          due: formattedTime,
          assignee: taskData.person,
          tab: activeTab,
          status: 'pending'
        });
      }
      setEditingTask(undefined);
    } catch (error) {
      console.error("Error saving task:", error);
    }
  };

  return (
    <>
      <AppLayout
        showAddButton={true}
        showNav={false}
        onAddPress={() => {
          setEditingTask(undefined);
          setShowAddTask(true);
        }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={openSidebar} style={[styles.menuButton, { backgroundColor: colors.card, borderRadius: radius.md }]}>
              <AppIcon name="menu" size={20} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.title, { color: colors.foreground }]}>Tasks</Text>
            <View style={styles.headerActions}>
              <Pressable style={[styles.roundAction, { backgroundColor: colors.card, borderRadius: radius.md }]} onPress={() => setShowSearch(true)}>
                <AppIcon source="🔍" size={18} color={colors.foreground} />
              </Pressable>

              <Pressable style={[styles.plusAction, { backgroundColor: colors.primary, borderRadius: radius.lg }]} onPress={() => {
                setEditingTask(undefined);
                setShowAddTask(true);
              }}>
                <AppIcon name="plus" size={18} color={colors.primaryForeground} />
              </Pressable>
            </View>
          </View>

          <View style={[styles.tabs, { backgroundColor: colors.muted, borderRadius: radius.lg }]}>
            {tabs.map((tab) => {
              const isActive = tab === activeTab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[
                    styles.tab,
                    { borderRadius: radius.md },
                    isActive && { backgroundColor: colors.card, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }
                  ]}
                >
                  <Text style={[styles.tabText, { color: isActive ? colors.foreground : colors.mutedForeground }]}>{tab}</Text>
                </Pressable>
              );
            })}
          </View>

          {activeTab === "Kids Chores" ? (
            <ChoreRotationSystem />
          ) : (
            <>
              <View style={[styles.progressCard, { backgroundColor: colors.card, shadowColor: colors.border, borderRadius: radius.card }]}>
                <View style={styles.progressHeader}>
                  <Text style={[styles.progressLabel, { color: colors.foreground }]}>Progress: {completedCount}/{totalCount}</Text>
                  <Text style={[styles.progressPercent, { color: colors.mutedForeground }]}>{progress}%</Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.muted, borderRadius: radius.sm }]}>
                  <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.primary, borderRadius: radius.sm }]} />
                </View>
              </View>

              <View style={styles.taskList}>
                {filteredTasks.map((task) => {
                  const priorityStyle = getPriorityStyle(task.priority, colors);
                  const assignee = members.find(m => m.id === task.assignee)?.name || "Unassigned";

                  return (
                    <Pressable
                      key={task.id}
                      onPress={() => handleEditTask(task)}
                      style={[
                        styles.taskCard,
                        { backgroundColor: colors.card, shadowColor: colors.border, borderRadius: radius.card },
                        task.status === "done" && { opacity: 0.6 }
                      ]}
                    >
                      <Pressable
                        style={[
                          styles.checkCircle,
                          { borderColor: colors.mutedForeground, borderRadius: radius.sm },
                          task.status === "done" && { backgroundColor: colors.success, borderColor: colors.success }
                        ]}
                        onPress={() => toggleTask(task.id)}
                      >
                        {task.status === "done" && <Text style={styles.checkMark}>✓</Text>}
                      </Pressable>
                      <View style={styles.taskDetails}>
                        <View style={styles.taskTitleRow}>
                          <Text style={{ fontSize: 20, marginRight: 8 }}>{task.icon}</Text>
                          <Text style={[styles.taskTitle, { color: colors.foreground }, task.status === "done" && { color: colors.mutedForeground }]}>
                            {task.name}
                          </Text>
                        </View>
                        <View style={styles.metaRow}>
                          <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.background, borderRadius: radius.full }]}>
                            <Text style={[styles.priorityText, { color: priorityStyle.color }]}>
                              {priorityStyle.label}
                            </Text>
                          </View>
                          <View style={styles.metaItem}>
                            <AppIcon name="clock" size={14} color={colors.mutedForeground} style={styles.metaIcon} />
                            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{task.due}</Text>
                          </View>
                          <View style={styles.metaItem}>
                            <AppIcon name="user" size={14} color={colors.mutedForeground} style={styles.metaIcon} />
                            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{assignee}</Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable style={[styles.addNewRow]} onPress={() => {
                setEditingTask(undefined);
                setShowAddTask(true);
              }}>
                <AppIcon name="plus" size={16} color={colors.primary} style={styles.addNewIcon} />
                <Text style={[styles.addNewText, { color: colors.primary }]}>Add new task</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </AppLayout>
      <GlobalSearch open={showSearch} onClose={() => setShowSearch(false)} />
      <AddTaskModal
        open={showAddTask}
        onClose={() => setShowAddTask(false)}
        onSave={handleSaveTask}
      />
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
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  tabs: {
    flexDirection: "row",
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  tabText: {
    fontWeight: "600",
  },
  progressCard: {
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
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  taskList: {
    marginBottom: 24,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "flex-start",
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
