import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Modal,
  Platform,
  Alert
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppLayout } from "../components/layout";
import { theme } from "../theme";
import { useThemeColors, useThemeRadius } from '../contexts/ThemeContext';
import { useSidebar } from "../contexts/SidebarContext";
import { Button } from "../components/ui/Button";
import DateTimePicker from "@react-native-community/datetimepicker";
import { NotificationPreferencesService } from "../services/NotificationPreferencesService";
import {
  NotificationCategory,
  NotificationScheduler,
} from "../services/NotificationScheduler";
import { useToast } from "../components/ui/Toast";
import { checkPermission, requestPermission } from "../utils/permissions";
import {
  Calendar,
  CheckSquare,
  ShoppingCart,
  Bell,
  ChefHat,
  Smartphone,
  Mail,
  Volume2,
  ChevronLeft,
  BellOff,
  Clock,
  ChevronDown,
  X
} from "lucide-react-native";
import Config from "react-native-config";

const ENABLE_RECIPE_AND_MEALS = Config.ENABLE_RECIPE_AND_MEALS !== 'false';

// --- Data & Helpers ---

const notificationSettings = [
  { id: 'tasks', icon: CheckSquare, label: 'Task Reminders', description: 'Due dates and assignments', enabled: true },
  { id: 'vault', icon: Bell, label: 'Document Alerts', description: 'Warranty and expiry reminders', enabled: true },
  ...(ENABLE_RECIPE_AND_MEALS ? [{ id: 'mealprep', icon: ChefHat, label: 'Meal Prep Reminders', description: 'Time to start cooking', enabled: true }] : []),
];

const DELIVERY_CATEGORIES: NotificationCategory[] = ['events', 'tasks', 'documents', 'meals', 'budgets'];

const eventReminderOptions = [
  { label: '5 min before', value: 5 },
  { label: '15 min before', value: 15 },
  { label: '30 min before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '2 hr 25 min before', value: 145 },
  { label: '1 day before', value: 1440 },
];

const mealPrepOptions = [
  { label: '30 min before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '1.5 hours before', value: 90 },
  { label: '2 hours before', value: 120 },
];

// --- Components ---

interface TimeSelectorProps {
  label: string;
  value: number;
  options: { label: string; value: number }[];
  onSelect: (val: number) => void;
  visible: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const TimeSelector: React.FC<TimeSelectorProps> = ({
  label,
  value,
  options,
  onSelect,
  visible,
  onOpen,
  onClose
}) => {
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <>
      <Pressable style={[styles.selectorButton, { backgroundColor: colors.muted, borderRadius: radius.sm }]} onPress={onOpen}>
        <Text style={[styles.selectorButtonText, { color: colors.foreground }]}>{selectedOption.label}</Text>
        <ChevronDown size={16} color={colors.mutedForeground} />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderRadius: radius.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{label}</Text>
              <Pressable onPress={onClose}>
                <X size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.modalOption,
                    { borderRadius: radius.sm },
                    value === option.value && { backgroundColor: colors.muted }
                  ]}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    { color: value === option.value ? colors.primary : colors.foreground }
                  ]}>
                    {option.label}
                  </Text>
                  {value === option.value && <Text style={{ color: colors.primary }}>✓</Text>}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { openSidebar } = useSidebar();
  const colors = useThemeColors();
  const radius = useThemeRadius();

  const [settings, setSettings] = useState(notificationSettings);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');

  // Specific Reminders State
  const [eventReminders, setEventReminders] = useState(true);
  const [mealPrepReminders, setMealPrepReminders] = useState(true);
  const [eventReminderTime, setEventReminderTime] = useState(30);
  const [mealPrepTime, setMealPrepTime] = useState(60);

  // Delivery Methods State
  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Modal Visibility State
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [showMealPicker, setShowMealPicker] = useState(false);

  // Time Picker States
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const { showToast } = useToast();
  const ensureNotificationPermission = async (): Promise<boolean> => {
    const hasPermission = await checkPermission('notification');
    if (hasPermission) return true;
    const granted = await requestPermission('notification');
    if (!granted) {
      showToast({
        type: 'warning',
        title: 'Notifications permission required',
        description: 'Enable notifications in settings to keep reminders active.',
        duration: 3000,
      });
    }
    return granted;
  };

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await NotificationPreferencesService.getAllPreferences();

      setEventReminders(prefs.eventReminders);
      setEventReminderTime(prefs.eventReminderTime);
      setMealPrepReminders(prefs.mealPrepReminders);
      setMealPrepTime(prefs.mealPrepTime);

      // Update settings array
      setSettings(prev => prev.map(s => {
        if (s.id === 'tasks') return { ...s, enabled: prefs.taskReminders };
        if (s.id === 'vault') return { ...s, enabled: prefs.vaultReminders };
        if (s.id === 'mealprep') return { ...s, enabled: prefs.mealPrepReminders };
        return s;
      }));

      setPushEnabled(prefs.pushEnabled);
      setSoundEnabled(prefs.soundEnabled);

      // Load quiet hours
      if (prefs.quietHours) {
        setQuietHoursEnabled(prefs.quietHours.enabled);
        const startHour = prefs.quietHours.startHour.toString().padStart(2, '0');
        const startMin = prefs.quietHours.startMinute.toString().padStart(2, '0');
        const endHour = prefs.quietHours.endHour.toString().padStart(2, '0');
        const endMin = prefs.quietHours.endMinute.toString().padStart(2, '0');
        setQuietStart(`${startHour}:${startMin}`);
        setQuietEnd(`${endHour}:${endMin}`);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  // Save event reminders when changed
  const eventPrefsInitialized = useRef(false);
  useEffect(() => {
    const saveEventPrefs = async () => {
      if (!eventPrefsInitialized.current) {
        eventPrefsInitialized.current = true;
        return;
      }
      try {
        if (eventReminders) {
          const permissionGranted = await ensureNotificationPermission();
          if (!permissionGranted) {
            setEventReminders(false);
            return;
          }
        }
        await NotificationPreferencesService.toggleCategory('events', eventReminders);
        if (eventReminders) {
          await NotificationPreferencesService.saveReminderTime('events', eventReminderTime);
        }
      } catch (error) {
        console.error('Error saving event preferences:', error);
      }
    };
    saveEventPrefs();
  }, [eventReminders, eventReminderTime]);

  // Save meal prep reminders when changed
  const mealPrefsInitialized = useRef(false);
  useEffect(() => {
    const saveMealPrefs = async () => {
      if (!mealPrefsInitialized.current) {
        mealPrefsInitialized.current = true;
        return;
      }
      try {
        await NotificationPreferencesService.toggleCategory('meals', mealPrepReminders);
        if (mealPrepReminders) {
          await NotificationPreferencesService.saveReminderTime('meals', mealPrepTime);
        }
      } catch (error) {
        console.error('Error saving meal preferences:', error);
      }
    };
    saveMealPrefs();
  }, [mealPrepReminders, mealPrepTime]);

  // Save quiet hours when changed
  useEffect(() => {
    const saveQuietHours = async () => {
      try {
        const [startHour, startMinute] = quietStart.split(':').map(Number);
        const [endHour, endMinute] = quietEnd.split(':').map(Number);

        await NotificationPreferencesService.saveQuietHours({
          enabled: quietHoursEnabled,
          startHour,
          startMinute,
          endHour,
          endMinute,
        });
        await NotificationScheduler.rescheduleAllMissing();
      } catch (error) {
        console.error('Error saving quiet hours:', error);
      }
    };
    saveQuietHours();
  }, [quietHoursEnabled, quietStart, quietEnd]);

  const pushPrefsInitialized = useRef(false);
  useEffect(() => {
    const updatePush = async () => {
      if (!pushPrefsInitialized.current) {
        pushPrefsInitialized.current = true;
        return;
      }
      try {
        if (pushEnabled) {
          const permissionGranted = await ensureNotificationPermission();
          if (!permissionGranted) {
            setPushEnabled(false);
            return;
          }
        }
        await NotificationPreferencesService.setPushEnabled(pushEnabled);
        if (!pushEnabled) {
          await Promise.all(DELIVERY_CATEGORIES.map(category => NotificationScheduler.cancelAllForCategory(category)));
        } else {
          await NotificationScheduler.rescheduleAllMissing();
        }
      } catch (error) {
        console.error('Error updating push preference:', error);
      }
    };
    updatePush();
  }, [pushEnabled]);

  useEffect(() => {
    const updateSound = async () => {
      try {
        await NotificationPreferencesService.setSoundEnabled(soundEnabled);
        await NotificationScheduler.updateChannelSoundPreference(soundEnabled);
      } catch (error) {
        console.error('Error updating sound preference:', error);
      }
    };
    updateSound();
  }, [soundEnabled]);

  const toggleSetting = async (id: string) => {
    const currentSetting = settings.find(s => s.id === id);
    if (!currentSetting) return;
    const newEnabled = !currentSetting.enabled;
    if (newEnabled) {
      const permissionGranted = await ensureNotificationPermission();
      if (!permissionGranted) {
        return;
      }
    }
    const newSettings = settings.map(s => s.id === id ? { ...s, enabled: newEnabled } : s);
    setSettings(newSettings);

    // Save to database
    try {
      let category: 'tasks' | 'documents' | 'meals' = 'tasks';
      if (id === 'tasks') category = 'tasks';
      else if (id === 'vault') category = 'documents';
      else if (id === 'mealprep') category = 'meals';

      await NotificationPreferencesService.toggleCategory(category, newEnabled);
    } catch (error) {
      console.error('Error toggling setting:', error);
    }
  };

  // Helper to parse HH:mm string to Date
  const parseTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    return date;
  };

  const handleStartTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowStartPicker(false);

    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      setQuietStart(`${hours}:${minutes}`);
    }
  };

  const handleEndTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowEndPicker(false);

    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      setQuietEnd(`${hours}:${minutes}`);
    }
  };

  return (
    <AppLayout>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={[styles.iconButton, { borderRadius: radius.sm }]}>
            <ChevronLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notifications</Text>
        </View>

        {/* Push Notification Settings (Main Toggles) */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }]}>
          {/* Event Reminders */}
          <View style={styles.settingSection}>
            <View style={styles.settingHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Calendar size={20} color={colors.primary} />
                <View>
                  <Text style={[styles.labelTitle, { color: colors.foreground }]}>Calendar Event Reminders</Text>
                  <Text style={[styles.labelDesc, { color: colors.mutedForeground }]}>Get notified before events</Text>
                </View>
              </View>
              <Switch
                value={eventReminders}
                onValueChange={setEventReminders}
                trackColor={{ false: colors.muted, true: colors.primary }}
              />
            </View>
            {eventReminders && (
              <View style={styles.subSetting}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Clock size={16} color={colors.mutedForeground} />
                  <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>Remind me</Text>
                </View>
                <TimeSelector
                  label="Event Reminder Time"
                  value={eventReminderTime}
                  options={eventReminderOptions}
                  onSelect={setEventReminderTime}
                  visible={showEventPicker}
                  onOpen={() => setShowEventPicker(true)}
                  onClose={() => setShowEventPicker(false)}
                />
              </View>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Meal Prep Reminders */}
          {ENABLE_RECIPE_AND_MEALS && (
            <View style={styles.settingSection}>
              <View style={styles.settingHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <ChefHat size={20} color={colors.primary} />
                  <View>
                    <Text style={[styles.labelTitle, { color: colors.foreground }]}>Meal Prep Reminders</Text>
                    <Text style={[styles.labelDesc, { color: colors.mutedForeground }]}>Start cooking on time</Text>
                  </View>
                </View>
                <Switch
                  value={mealPrepReminders}
                  onValueChange={setMealPrepReminders}
                  trackColor={{ false: colors.muted, true: colors.primary }}
                />
              </View>
              {mealPrepReminders && (
                <View style={styles.subSetting}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Clock size={16} color={colors.mutedForeground} />
                    <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>Start prep</Text>
                  </View>
                  <TimeSelector
                    label="Meal Prep Time"
                    value={mealPrepTime}
                    options={mealPrepOptions}
                    onSelect={setMealPrepTime}
                    visible={showMealPicker}
                    onOpen={() => setShowMealPicker(true)}
                    onClose={() => setShowMealPicker(false)}
                  />
                </View>
              )}
            </View>
          )}
        </View>

        {/* Notification Types */}
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Notification Types</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }]}>
            {settings.map((setting, index) => (
              <View key={setting.id}>
                <View style={styles.typeRow}>
                  <View style={[styles.iconBox, { backgroundColor: colors.muted, borderRadius: radius.md }]}>
                    <setting.icon size={20} color={colors.mutedForeground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.labelTitle, { color: colors.foreground }]}>{setting.label}</Text>
                    <Text style={[styles.labelDesc, { color: colors.mutedForeground }]}>{setting.description}</Text>
                  </View>
                  <Switch
                    value={setting.enabled}
                    onValueChange={() => toggleSetting(setting.id)}
                    trackColor={{ false: colors.muted, true: colors.primary }}
                  />
                </View>
                {index !== settings.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              </View>
            ))}
          </View>
        </View>

        {/* Quiet Hours */}
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: radius.card }]}>
          <View style={styles.settingHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.largeIconBox, { backgroundColor: colors.secondary, borderRadius: radius.md }]}>
                <BellOff size={24} color={colors.secondaryForeground} />
              </View>
              <View>
                <Text style={[styles.labelTitle, { color: colors.foreground }]}>Quiet Hours</Text>
                <Text style={[styles.labelDesc, { color: colors.mutedForeground }]}>Pause notifications during set times</Text>
              </View>
            </View>
            <Switch
              value={quietHoursEnabled}
              onValueChange={setQuietHoursEnabled}
              trackColor={{ false: colors.muted, true: colors.primary }}
            />
          </View>

          {quietHoursEnabled && (
            <View style={[styles.quietHoursContainer, { backgroundColor: colors.muted, borderRadius: radius.md }]}>
              <Clock size={20} color={colors.mutedForeground} />
              <View style={styles.timeInputs}>
                <Pressable onPress={() => setShowStartPicker(true)} style={[styles.timeInputBox, { backgroundColor: colors.card, borderRadius: radius.xs }]}>
                  <Text style={[styles.timeText, { color: colors.foreground }]}>{quietStart}</Text>
                </Pressable>
                <Text style={[styles.toText, { color: colors.mutedForeground }]}>to</Text>
                <Pressable onPress={() => setShowEndPicker(true)} style={[styles.timeInputBox, { backgroundColor: colors.card, borderRadius: radius.xs }]}>
                  <Text style={[styles.timeText, { color: colors.foreground }]}>{quietEnd}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* DateTimePickers */}
          {showStartPicker && (
            <>
              <DateTimePicker
                value={parseTime(quietStart)}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleStartTimeChange}
              />
              {Platform.OS === 'ios' && (
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                  <Button size="sm" variant="ghost" onPress={() => setShowStartPicker(false)}><Text>Done</Text></Button>
                </View>
              )}
            </>
          )}
          {showEndPicker && (
            <>
              <DateTimePicker
                value={parseTime(quietEnd)}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleEndTimeChange}
              />
              {Platform.OS === 'ios' && (
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                  <Button size="sm" variant="ghost" onPress={() => setShowEndPicker(false)}><Text>Done</Text></Button>
                </View>
              )}
            </>
          )}
        </View>

        {/* Delivery Methods */}
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Delivery Methods</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }]}>
            <View style={styles.deliveryRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Smartphone size={20} color={colors.mutedForeground} />
                <Text style={[styles.labelTitle, { color: colors.foreground, fontSize: 14 }]}>Notifications</Text>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
                trackColor={{ false: colors.muted, true: colors.primary }}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.deliveryRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Volume2 size={20} color={colors.mutedForeground} />
                <Text style={[styles.labelTitle, { color: colors.foreground, fontSize: 14 }]}>Sound</Text>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: colors.muted, true: colors.primary }}
              />
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  iconButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  card: {
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  settingSection: {
    paddingVertical: 4,
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  labelDesc: {
    fontSize: 12,
  },
  subSetting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 32,
    marginTop: 4,
  },
  subLabel: {
    fontSize: 13,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  selectorButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeIconBox: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quietHoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginTop: 8,
  },
  timeInputs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInputBox: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  toText: {
    fontSize: 13,
  },
  deliveryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  modalOptionText: {
    fontSize: 15,
  },
});
