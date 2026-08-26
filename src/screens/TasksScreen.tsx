import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
} from 'react-native';
import { AppLayout } from '../components/layout';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AddTaskModal } from '../components/modals/AddTaskModal';
import { buildTaskRecurrenceWritePayload } from '../utils/taskFormUtils';
import { GlobalSearch } from '../components/search/GlobalSearch';
import { useSidebar } from '../contexts/SidebarContext';
import { useThemeColors, useThemeRadius } from '../contexts/ThemeContext';
import { AppIcon } from '../components/ui/AppIcon';
import { useFamily, Task } from '../contexts/FamilyContext';
import { trackScreen } from '../services/analytics';
import { safeFormat } from '../utils/SafeDateUtils';
import { getRecurringTaskLabel } from '../utils/taskRecurrence';

const tabs = ['My Tasks', 'Family Tasks'];

const getPriorityStyle = (priority: Task['priority'], colors: any) => {
  switch (priority) {
    case 'high':
      return {
        label: 'High',
        color: colors.danger,
        background: colors.danger + '25',
      };
    case 'medium':
      return {
        label: 'Medium',
        color: colors.warning,
        background: colors.warning + '30',
      };
    default:
      return {
        label: 'Low',
        color: colors.info,
        background: colors.info + '40',
      };
  }
};

export const TasksScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState('My Tasks');
  const [showAddTask, setShowAddTask] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

  const { openSidebar } = useSidebar();
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const { tasks, addTask, updateTask, deleteTask, members, activeMember } =
    useFamily();

  useEffect(() => {
    void trackScreen('TasksScreen');
  }, []);

  const filteredTasks = useMemo(() => {
    if (activeTab === 'My Tasks') {
      return tasks.filter((task: Task) => task.assignee === activeMember?.id);
    }

    return tasks.filter((task: Task) => task.assignee !== activeMember?.id);
  }, [activeTab, tasks, activeMember]);

  const completedCount = filteredTasks.filter(
    (task: Task) => task.status === 'done',
  ).length;
  const totalCount = filteredTasks.length;
  const progress = totalCount
    ? Math.round((completedCount / totalCount) * 100)
    : 0;

  const toggleTask = (taskId: string) => {
    try {
      if (!taskId) return;
      const task = tasks.find((t: Task) => t.id === taskId);
      if (task) {
        void updateTask(taskId, {
          status: task.status === 'done' ? 'pending' : 'done',
        });
      }
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowAddTask(true);
  };

  const handleDeleteTask = (task: Task) => {
    const clearEditingState = () => {
      if (editingTask?.id === task.id) {
        setEditingTask(undefined);
      }
    };

    if (task.isRecurring) {
      Alert.alert(
        'Recurring Task',
        `What would you like to do with "${task.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Skip This Time',
            onPress: () => {
              void deleteTask(task.id, {
                mode: 'occurrence',
                occurrenceDate: task.date,
              });
              clearEditingState();
            },
          },
          {
            text: 'Delete Series',
            style: 'destructive',
            onPress: () => {
              void deleteTask(task.id, { mode: 'series' });
              clearEditingState();
            },
          },
        ],
      );
      return;
    }

    Alert.alert('Delete Task', `Delete "${task.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteTask(task.id, { mode: 'series' });
          clearEditingState();
        },
      },
    ]);
  };

  const handleSaveTask = async (taskData: any) => {
    try {
      const formattedDate = safeFormat(taskData.dueDate, 'yyyy-MM-dd');
      const formattedTime = safeFormat(taskData.dueDate, 'hh:mm aa');

      const taskPayload = {
        name: taskData.name,
        icon: taskData.icon,
        priority: taskData.priority,
        dateString: formattedDate,
        dueDisplay: formattedTime,
        assigneeId: taskData.person,
        reminderEnabled: taskData.reminderEnabled ?? true,
        ...buildTaskRecurrenceWritePayload(
          {
            isRecurring: taskData.isRecurring ?? false,
            recurrenceRule: taskData.recurrenceRule,
            recurrenceInterval: taskData.recurrenceInterval,
            recurrenceDaysOfWeek: taskData.recurrenceDaysOfWeek,
            recurrenceEndDate: taskData.recurrenceEndDate,
          },
          formattedDate,
          taskData.dueDate,
          { includeAnchor: !editingTask },
        ),
      };

      if (editingTask) {
        await updateTask(editingTask.id, taskPayload);
      } else {
        await addTask(
          {
            ...taskPayload,
            status: 'pending',
          },
          { source: 'TasksScreen' },
        );
        // Switch to My Tasks so the newly assigned task is visible
        if (taskData.person === activeMember?.id) {
          setActiveTab('My Tasks');
        }
        Alert.alert(
          'Success',
          `Task "${taskData.name}" created successfully!\nDate: ${formattedDate}\nTime: ${formattedTime}`,
        );
      }
      setEditingTask(undefined);
    } catch (error) {
      console.error('Error saving task:', error);
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Failed to save task. Please try again.',
      );
    }
  };

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <Pressable
          onPress={openSidebar}
          style={[
            styles.menuButton,
            { backgroundColor: colors.card, borderRadius: radius.md },
          ]}
        >
          <AppIcon name="menu" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Tasks</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={[
              styles.roundAction,
              { backgroundColor: colors.card, borderRadius: radius.md },
            ]}
            onPress={() => setShowSearch(true)}
          >
            <AppIcon source="🔍" size={18} color={colors.foreground} />
          </Pressable>

          <Pressable
            style={[
              styles.plusAction,
              { backgroundColor: colors.primary, borderRadius: radius.lg },
            ]}
            onPress={() => {
              setEditingTask(undefined);
              setShowAddTask(true);
            }}
          >
            <AppIcon name="plus" size={18} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>

      <View
        style={[
          styles.tabs,
          { backgroundColor: colors.muted, borderRadius: radius.lg },
        ]}
      >
        {tabs.map(tab => {
          const isActive = tab === activeTab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                { borderRadius: radius.md },
                isActive && {
                  backgroundColor: colors.card,
                  shadowColor: '#000',
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isActive
                      ? colors.foreground
                      : colors.mutedForeground,
                  },
                ]}
              >
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View
        style={[
          styles.progressCard,
          {
            backgroundColor: colors.card,
            shadowColor: colors.border,
            borderRadius: radius.card,
          },
        ]}
      >
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: colors.foreground }]}>
            Progress: {completedCount}/{totalCount}
          </Text>
          <Text
            style={[styles.progressPercent, { color: colors.mutedForeground }]}
          >
            {progress}%
          </Text>
        </View>
        <View
          style={[
            styles.progressBar,
            { backgroundColor: colors.muted, borderRadius: radius.sm },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress}%`,
                backgroundColor: colors.primary,
                borderRadius: radius.sm,
              },
            ]}
          />
        </View>
      </View>
    </>
  );

  const renderTask = ({ item: task }: { item: Task }) => {
    const priorityStyle = getPriorityStyle(task.priority, colors);
    const assignee =
      members.find((m: any) => m.id === task.assignee)?.name || 'Unassigned';
    const recurrenceLabel = getRecurringTaskLabel(task);

    return (
      <View
        style={[
          styles.taskCard,
          {
            backgroundColor: colors.card,
            shadowColor: colors.border,
            borderRadius: radius.card,
          },
          task.status === 'done' && { opacity: 0.6 },
        ]}
      >
        <Pressable
          style={[
            styles.checkCircle,
            {
              borderColor: colors.mutedForeground,
              borderRadius: radius.sm,
            },
            task.status === 'done' && {
              backgroundColor: colors.success,
              borderColor: colors.success,
            },
          ]}
          onPress={() => toggleTask(task.id)}
          hitSlop={8}
        >
          {task.status === 'done' && <Text style={styles.checkMark}>✓</Text>}
        </Pressable>

        <Pressable
          onPress={() => handleEditTask(task)}
          style={styles.taskContentPressable}
        >
          <View style={styles.taskDetails}>
            <View style={styles.taskTitleRow}>
              <MaterialCommunityIcons
                name={
                  task.icon && task.icon.trim()
                    ? task.icon
                    : 'format-list-checks'
                }
                size={22}
                color={colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.taskTitle,
                  { color: colors.foreground },
                  task.status === 'done' && {
                    color: colors.mutedForeground,
                  },
                ]}
              >
                {task.name}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <View
                style={[
                  styles.priorityBadge,
                  {
                    backgroundColor: priorityStyle.background,
                    borderRadius: radius.full,
                  },
                ]}
              >
                <Text
                  style={[styles.priorityText, { color: priorityStyle.color }]}
                >
                  {priorityStyle.label}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <AppIcon
                  name="clock"
                  size={14}
                  color={colors.mutedForeground}
                  style={styles.metaIcon}
                />
                <Text
                  style={[styles.metaText, { color: colors.mutedForeground }]}
                >
                  {task.due}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <AppIcon
                  name="user"
                  size={14}
                  color={colors.mutedForeground}
                  style={styles.metaIcon}
                />
                <Text
                  style={[styles.metaText, { color: colors.mutedForeground }]}
                >
                  {assignee}
                </Text>
              </View>
              {recurrenceLabel && (
                <View style={styles.metaItem}>
                  <AppIcon
                    name="repeat"
                    size={14}
                    color={colors.mutedForeground}
                    style={styles.metaIcon}
                  />
                  <Text
                    style={[styles.metaText, { color: colors.mutedForeground }]}
                  >
                    {recurrenceLabel}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Pressable>

        <Pressable
          onPress={() => handleDeleteTask(task)}
          hitSlop={10}
          style={styles.deleteTaskButton}
        >
          <AppIcon name="trash" size={16} color={colors.danger} />
        </Pressable>
      </View>
    );
  };

  return (
    <>
      <AppLayout
        disableScroll={true}
        showAddButton={true}
        showNav={false}
        onAddPress={() => {
          setEditingTask(undefined);
          setShowAddTask(true);
        }}
      >
        <FlatList
          data={filteredTasks}
          keyExtractor={item => item.id}
          renderItem={renderTask}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No tasks here yet
              </Text>
              <Text
                style={[styles.emptyText, { color: colors.mutedForeground }]}
              >
                Add your first{' '}
                {activeTab === 'My Tasks' ? 'personal' : 'family'} task to get
                started.
              </Text>
            </View>
          }
          ListFooterComponent={
            <Pressable
              style={styles.addNewRow}
              onPress={() => {
                setEditingTask(undefined);
                setShowAddTask(true);
              }}
            >
              <AppIcon
                name="plus"
                size={16}
                color={colors.primary}
                style={styles.addNewIcon}
              />
              <Text style={[styles.addNewText, { color: colors.primary }]}>
                Add new task
              </Text>
            </Pressable>
          }
        />
      </AppLayout>
      <GlobalSearch open={showSearch} onClose={() => setShowSearch(false)} />
      <AddTaskModal
        open={showAddTask}
        onClose={() => setShowAddTask(false)}
        onSave={handleSaveTask}
        taskToEdit={editingTask}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    flex: 1,
    fontSize: 26,
    fontWeight: '700',
    marginLeft: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roundAction: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  plusAction: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  tabs: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabText: {
    fontWeight: '600',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontWeight: '600',
  },
  progressPercent: {
    fontWeight: '600',
  },
  progressBar: {
    height: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  checkMark: {
    color: '#fff',
    fontWeight: 'bold',
  },
  taskContentPressable: {
    flex: 1,
  },
  taskDetails: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  deleteTaskButton: {
    marginLeft: 12,
    padding: 6,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    marginTop: 4,
  },
  metaIcon: {
    marginRight: 4,
  },
  priorityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginTop: 4,
  },
  priorityText: {
    fontWeight: '700',
  },
  metaText: {
    fontSize: 12,
  },
  addNewRow: {
    marginTop: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addNewIcon: {
    marginRight: 4,
  },
  addNewText: {
    fontWeight: '700',
    fontSize: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
});
