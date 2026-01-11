import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppLayout } from "../components/layout/AppLayout";
import { theme } from "../theme";
import { useSidebar } from "../contexts/SidebarContext";
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
  ArrowLeft,
  Check,
} from "lucide-react-native";

const notificationTypes = [
  { id: 'events', label: "Calendar Events", description: "Get notified about upcoming events", icon: Calendar },
  { id: 'tasks', label: "Task Reminders", description: "Due dates and assignments", icon: CheckSquare },
  { id: 'grocery', label: "Shopping List Updates", description: "When items are added or checked", icon: ShoppingCart },
  { id: 'vault', label: "Document Alerts", description: "Warranty and expiry reminders", icon: Bell },
  { id: 'mealprep', label: "Meal Prep Reminders", description: "Time to start cooking", icon: ChefHat },
];

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { openSidebar } = useSidebar();

  // Dropdown options
  const calendarOptions = ["5 min before", "15 min before", "30 min before", "1 hour before", "1 day before"];
  const mealPrepOptions = ["30 min before", "1 hour before", "1.5 hours before", "2 hours before"];

  // State
  const [enableNotifications, setEnableNotifications] = useState(true);

  // Reminder Toggles
  const [calendarEnabled, setCalendarEnabled] = useState(true);
  const [mealPrepEnabled, setMealPrepEnabled] = useState(true);

  // Custom Dropdown State
  const [calendarDropdownOpen, setCalendarDropdownOpen] = useState(false);
  const [mealDropdownOpen, setMealDropdownOpen] = useState(false);
  const [selectedCalendarTime, setSelectedCalendarTime] = useState("30 min before");
  const [selectedMealTime, setSelectedMealTime] = useState("1 hour before");

  // Notification Types State
  const [typesState, setTypesState] = useState<Record<string, boolean>>(
    notificationTypes.reduce((acc, curr) => ({ ...acc, [curr.id]: true }), {})
  );

  // Quiet Hours
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("07:00");

  // Delivery Methods
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const toggleType = (id: string) => {
    setTypesState(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const DropdownMenu = ({
    options,
    selected,
    onSelect,
    onClose
  }: {
    options: string[],
    selected: string,
    onSelect: (val: string) => void,
    onClose: () => void
  }) => (
    <Pressable style={styles.dropdownOverlay} onPress={onClose}>
      <View style={styles.dropdownContainer}>
        {options.map((option, index) => (
          <Pressable
            key={option}
            style={[
              styles.dropdownItem,
              selected === option && styles.dropdownItemSelected,
              index === options.length - 1 && { borderBottomWidth: 0 }
            ]}
            onPress={() => {
              onSelect(option);
              onClose();
            }}
          >
            {selected === option && (
              <Check size={16} color="#fff" style={{ marginRight: 8 }} />
            )}
            <Text style={[
              styles.dropdownText,
              selected === option && styles.dropdownTextSelected,
              selected !== option && { marginLeft: 24 } // indent if no check
            ]}>
              {option}
            </Text>
          </Pressable>
        ))}
      </View>
    </Pressable>
  );

  return (
    <AppLayout>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
            <ChevronLeft size={24} color={theme.colors.foreground} />
          </Pressable>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>

        {/* Enable Notifications Main Card */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View style={styles.mainIconBg}>
                <Bell size={24} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Enable Notifications</Text>
                <Text style={styles.cardSubtitle}>Get reminders for events and meals</Text>
              </View>
            </View>
            <Pressable
              onPress={() => setEnableNotifications(!enableNotifications)}
              style={[styles.enableBtn, enableNotifications && styles.enableBtnActive]}
            >
              <Text style={[styles.enableBtnText, enableNotifications && { color: '#fff' }]}>
                {enableNotifications ? 'Enabled' : 'Enable'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Specific Reminders */}
        <View style={[styles.card, { zIndex: 10 }]}>
          {/* Calendar */}
          <View style={{ marginBottom: 20, zIndex: calendarDropdownOpen ? 20 : 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Calendar size={20} color={theme.colors.foreground} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>Calendar Event Reminders</Text>
                <Text style={styles.itemSubtitle}>Get notified before events</Text>
              </View>
              <Switch
                value={calendarEnabled}
                onValueChange={setCalendarEnabled}
                trackColor={{ false: theme.colors.muted, true: theme.colors.primary }}
              />
            </View>
            <View style={styles.settingsRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Clock size={16} color={theme.colors.mutedForeground} />
                <Text style={styles.label}>Remind me</Text>
              </View>
              <View>
                <Pressable
                  style={styles.selectBox}
                  onPress={() => {
                    setMealDropdownOpen(false);
                    setCalendarDropdownOpen(!calendarDropdownOpen);
                  }}
                >
                  <Text style={styles.selectText}>{selectedCalendarTime}</Text>
                  <ChevronLeft size={16} color={theme.colors.mutedForeground} style={{ transform: [{ rotate: '-90deg' }] }} />
                </Pressable>
                {calendarDropdownOpen && (
                  <View style={styles.dropdownWrapper}>
                    <DropdownMenu
                      options={calendarOptions}
                      selected={selectedCalendarTime}
                      onSelect={setSelectedCalendarTime}
                      onClose={() => setCalendarDropdownOpen(false)}
                    />
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={[styles.divider, { zIndex: -1 }]} />

          {/* Meal Prep */}
          <View style={{ marginTop: 20, zIndex: mealDropdownOpen ? 20 : 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <ChefHat size={20} color={theme.colors.foreground} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>Meal Prep Reminders</Text>
                <Text style={styles.itemSubtitle}>Start cooking on time</Text>
              </View>
              <Switch
                value={mealPrepEnabled}
                onValueChange={setMealPrepEnabled}
                trackColor={{ false: theme.colors.muted, true: theme.colors.primary }}
              />
            </View>
            <View style={styles.settingsRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Clock size={16} color={theme.colors.mutedForeground} />
                <Text style={styles.label}>Start prep</Text>
              </View>
              <View>
                <Pressable
                  style={styles.selectBox}
                  onPress={() => {
                    setCalendarDropdownOpen(false);
                    setMealDropdownOpen(!mealDropdownOpen);
                  }}
                >
                  <Text style={styles.selectText}>{selectedMealTime}</Text>
                  <ChevronLeft size={16} color={theme.colors.mutedForeground} style={{ transform: [{ rotate: '-90deg' }] }} />
                </Pressable>
                {mealDropdownOpen && (
                  <View style={styles.dropdownWrapper}>
                    <DropdownMenu
                      options={mealPrepOptions}
                      selected={selectedMealTime}
                      onSelect={setSelectedMealTime}
                      onClose={() => setMealDropdownOpen(false)}
                    />
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Notification Types */}
        <Text style={styles.sectionHeader}>Notification Types</Text>
        <View style={[styles.card, { paddingVertical: 8 }]}>
          {notificationTypes.map((item, index) => (
            <View key={item.id}>
              <View style={styles.typeRow}>
                <View style={styles.typeIconBg}>
                  <item.icon size={20} color={theme.colors.mutedForeground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item.label}</Text>
                  <Text style={styles.itemSubtitle}>{item.description}</Text>
                </View>
                <Switch
                  value={typesState[item.id]}
                  onValueChange={() => toggleType(item.id)}
                  trackColor={{ false: theme.colors.muted, true: theme.colors.primary }}
                />
              </View>
              {index < notificationTypes.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Quiet Hours */}
        <View style={[styles.card, { marginTop: 16 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.mainIconBg, { backgroundColor: theme.colors.muted }]}>
                <BellOff size={24} color={theme.colors.foreground} />
              </View>
              <View>
                <Text style={styles.cardTitle}>Quiet Hours</Text>
                <Text style={styles.cardSubtitle}>Pause notifications during set times</Text>
              </View>
            </View>
            <Switch
              value={quietHoursEnabled}
              onValueChange={setQuietHoursEnabled}
              trackColor={{ false: theme.colors.muted, true: theme.colors.primary }}
            />
          </View>

          {quietHoursEnabled && (
            <View style={styles.timeInputContainer}>
              <Clock size={20} color={theme.colors.mutedForeground} />
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <TextInput
                  style={styles.timeInput}
                  value={quietStart}
                  onChangeText={setQuietStart}
                />
                <Text style={styles.label}>to</Text>
                <TextInput
                  style={styles.timeInput}
                  value={quietEnd}
                  onChangeText={setQuietEnd}
                />
              </View>
            </View>
          )}
        </View>

        {/* Delivery Methods */}
        <Text style={styles.sectionHeader}>Delivery Methods</Text>
        <View style={styles.card}>
          <View style={styles.deliveryRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Smartphone size={20} color={theme.colors.mutedForeground} />
              <Text style={styles.itemTitle}>Push Notifications</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: theme.colors.muted, true: theme.colors.primary }}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.deliveryRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Mail size={20} color={theme.colors.mutedForeground} />
              <Text style={styles.itemTitle}>Email Notifications</Text>
            </View>
            <Switch
              value={emailEnabled}
              onValueChange={setEmailEnabled}
              trackColor={{ false: theme.colors.muted, true: theme.colors.primary }}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.deliveryRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Volume2 size={20} color={theme.colors.mutedForeground} />
              <Text style={styles.itemTitle}>Sound</Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: theme.colors.muted, true: theme.colors.primary }}
            />
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    marginTop: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 0,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  mainIconBg: {
    width: 48,
    height: 48,
    borderRadius: 0,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.foreground,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: theme.colors.mutedForeground,
  },
  enableBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 0,
    backgroundColor: theme.colors.muted,
  },
  enableBtnActive: {
    backgroundColor: '#1e3a8a', // Dark blue
  },
  enableBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.foreground,
  },
  itemSubtitle: {
    fontSize: 12,
    color: theme.colors.mutedForeground,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 32, // Indent to align with text above
  },
  label: {
    fontSize: 13,
    color: theme.colors.mutedForeground,
    fontWeight: '500',
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.muted,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 0,
    gap: 8,
    minWidth: 120,
    justifyContent: 'space-between',
  },
  selectText: {
    fontSize: 13,
    color: theme.colors.foreground,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 12,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.foreground,
    marginBottom: 12,
    marginTop: 8,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  typeIconBg: {
    width: 40,
    height: 40,
    borderRadius: 0,
    backgroundColor: theme.colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.muted,
    padding: 12,
    borderRadius: 0,
    gap: 12,
  },
  timeInput: {
    backgroundColor: theme.colors.card, // White/Dark
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 0,
    minWidth: 80,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  dropdownWrapper: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    backgroundColor: theme.colors.card,
    borderRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    zIndex: 100,
    minWidth: 160,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  dropdownContainer: {
    // This is handled by dropdownWrapper now, simplified logic
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dropdownItemSelected: {
    backgroundColor: '#1e3a8a', // Dark blue selected state
  },
  dropdownText: {
    fontSize: 13,
    color: theme.colors.foreground,
  },
  dropdownTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
});
