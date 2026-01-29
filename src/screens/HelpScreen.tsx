import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from "react-native";
import { AppLayout } from "../components/layout/AppLayout";
import { useThemeColors, useThemeRadius } from '../contexts/ThemeContext';
import { useSidebar } from "../contexts/SidebarContext";
import { useNavigation } from "@react-navigation/native";
import { useToast } from "../components/ui/Toast";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Search,
  Home,
  Calendar,
  CheckSquare,
  ShoppingCart,
  FolderLock,
  Utensils,
  DollarSign,
  Users,
  Bell,
  Book,
  PlayCircle,
  ChevronRight,
  Shield,
  Download,
} from "lucide-react-native";
import { GettingStartedTutorial } from "../components/tutorial/GettingStartedTutorial";

// --- Data ---
const featureGuides = [
  {
    id: "home",
    icon: Home,
    title: "Home Dashboard",
    path: "Home",
    description: "Your central hub for family activities. View today's schedule, quick actions, and unified notifications.",
    howToUse: [
      "View today's weather and date at a glance",
      "See upcoming events and tasks sorted by time",
      "Use 'Quick Actions' to add events, tasks, or items instantly",
      "Access family member profiles to filter views",
      "Tap the Bell icon to view all History (Events, Tasks, & Docs)",
    ],
    tips: [
      "Check the dashboard every morning for a daily briefing",
      "The 'Bell' icon now shows a full history of all alerts",
      "Unread notifications are marked with a red badge",
    ],
  },
  {
    id: "calendar",
    icon: Calendar,
    title: "Family Calendar",
    path: "Calendar",
    description: "A shared calendar for events. Color-coded by family member.",
    howToUse: [
      "Tap '+' to add events with location and notes",
      "Assign events to specific family members (color-coded)",
      "Set multiple reminders (e.g., 1 day before, 1 hour before)",
      "Create recurring events (Daily, Weekly, Monthly, Custom)",
      "Switch between Timeline, Week, and Month views",
    ],
    tips: [
      "Use 'Custom' repeat for complex schedules (e.g., M-W-F)",
      "Tap an event to see location maps (if enabled)",
      "Long-press a date to quickly add an event",
    ],
  },
  {
    id: "tasks",
    icon: CheckSquare,
    title: "Tasks & Chores",
    path: "Tasks",
    description: "Manage household chores, assign tasks, and track completion.",
    howToUse: [
      "Create tasks and assign them to family members",
      "Set 'Chore Rotation' to auto-rotate tasks weekly",
      "Set deadlines with precise reminder alerts",
      "Prioritize tasks (High, Medium, Low)",
      "View 'My Tasks' vs 'Family Tasks' tabs",
    ],
    tips: [
      "Enable 'Exact Alarms' for critical deadlines",
      "Completed chores are saved in history for review",
      "Use subtasks for complex projects",
    ],
  },
  {
    id: "lists",
    icon: ShoppingCart,
    title: "Shopping & Todo Lists",
    path: "Lists",
    description: "Smart lists for groceries and general todos. Syncs instantly.",
    howToUse: [
      "Create 'Grocery' or 'Todo' type lists",
      "Items in Grocery lists auto-categorize (Produce, Dairy)",
      "Tap '+' to add items; swipe left to delete",
      "Tap 'Generate' in Meal Plan to fill grocery lists",
    ],
    tips: [
      "Share lists with family for collaborative shopping",
      "Use the 'Copy' feature to duplicate frequent lists",
      "Checked items move to the bottom automatically",
    ],
  },
  {
    id: "vault",
    icon: FolderLock,
    title: "Vault & Warranties",
    path: "Vault",
    description: "Secure storage for IDs, Insurance, and Warranties with expiry alerts.",
    howToUse: [
      "Upload documents, IDs, or Warranty cards",
      "Set Expiry Dates to get auto-reminders (30/14/7 days before)",
      "Tag documents by type (Medical, Financial, Vehicle)",
      "Use the search bar to find files instantly",
    ],
    tips: [
      "Store warranty receipts to get alerts before they expire",
      "Keep digital copies of all family Passports/IDs",
      "Vault alerts now appear in the Notification Center",
    ],
  },
  {
    id: "recipes",
    icon: Utensils,
    title: "Recipes & Collections",
    path: "Recipes",
    description: "Organize family recipes and build weekly meal plans.",
    howToUse: [
      "Save recipes with ingredients, steps, and photos",
      "Organize recipes into custom 'Collections' (e.g., 'Favorites')",
      "Use 'Cook Mode' for a step-by-step big screen view",
      "Add recipes directly to the Meal Planner",
    ],
    tips: [
      "Scale ingredients automatically by changing serving size",
      "Import recipes from supported websites (coming soon)",
      "Tag recipes by cuisine or dietary restriction",
    ],
  },
  {
    id: "finance",
    icon: DollarSign,
    title: "Finance & Budget",
    path: "Expenses",
    description: "Track income, expenses, and set category budgets.",
    howToUse: [
      "Log daily transactions (Income/Expense)",
      "Set monthly budgets for categories (Groceries, Fuel)",
      "View visual charts of spending habits",
      "Get alerted when nearing budget limits (80%, 100%)",
    ],
    tips: [
      "Log expenses immediately for accurate tracking",
      "Review 'Monthly Insights' to find savings",
      "Export finance data via the Data Export tool",
    ],
  },
  {
    id: "notifications",
    icon: Bell,
    title: "Notification Center",
    path: "Notifications",
    description: "Centralized history of all family alerts and reminders.",
    howToUse: [
      "Tap the Bell icon on Home to see everything",
      "View history of Events, Tasks, and Vault expiries",
      "Customize 'Quiet Hours' to silence non-urgent alerts",
      "Toggle specific categories on/off in Settings",
    ],
    tips: [
      "App Icon badges show unread count",
      "Clear all to mark everything as read",
      "Critical alerts (like Alarms) bypass Quiet Hours",
    ],
  },
  {
    id: 'privacy',
    icon: Shield,
    title: 'Security & App Lock',
    path: 'Privacy',
    description: 'Protect your family data with PIN and Biometrics.',
    howToUse: [
      'Enable "App Lock" in Settings',
      'Set a 4-digit secure PIN',
      'Enable FaceID / TouchID for instant unlock',
      'App locks immediately upon closing',
    ],
    tips: [
      'Biometrics are faster and more secure than PIN',
      'Use a PIN that is not easily guessable',
      'If you forget PIN, you may need to reset app data',
    ]
  },
  {
    id: 'dataexport',
    icon: Download,
    title: 'Data Backup & Export',
    path: 'DataExport',
    description: 'Export your data to JSON or CSV. No cloud lock-in.',
    howToUse: [
      'Go to Settings -> Data Export',
      'Select data types (Events, Tasks, Finance, etc.)',
      'Choose Format: JSON (Full Backup) or CSV (Excel)',
      'Tap "Export & Share" to save to Files or email',
    ],
    tips: [
      'JSON export contains ALL details (best for backup)',
      'CSV is great for viewing finance data in Excel',
      'File sizes are calculated live before export',
    ]
  },
];

const faqItems = [
  {
    category: "General & Security",
    questions: [
      {
        q: "How do I secure the app?",
        a: "Go to Settings > Privacy. Enable 'App Lock' and set a PIN. You can also turn on Biometric unlock (FaceID/Fingerprint) for faster access on startup.",
      },
      {
        q: "Is my data stored in the cloud?",
        a: "Your data is primarily stored locally on your device for privacy. We do not mine or sell your family data.",
      },
      {
        q: "What if I forget my App Lock PIN?",
        a: "For security, there is no 'forgot password' backdoor. You would need to reinstall the app, which resets secure data. We recommend enabling Biometrics as a backup.",
      },
    ],
  },
  {
    category: "Notifications",
    questions: [
      {
        q: "Why are my reminders not ringing?",
        a: "Ensure you have granted 'Notification' permissions. For critical tasks, the app uses 'Exact Alarms' which ensures delivery even in Doze mode.",
      },
      {
        q: "Can I stop notifications at night?",
        a: "Yes! Use 'Quiet Hours' in Notification Settings. You can set a start and end time (e.g., 10 PM to 7 AM) to mute non-urgent alerts.",
      },
      {
        q: "Where can I see past notifications?",
        a: "Tap the Bell icon on the Home screen. It shows a unified history of all missed events, tasks, and vault alerts from the last 7 days.",
      },
    ],
  },
  {
    category: "Data & Backup",
    questions: [
      {
        q: "How do I backup my data?",
        a: "Use the 'Data Export' feature in Settings. Select 'JSON' format for a complete backup of all your family info.",
      },
      {
        q: "Can I view my expenses in Excel?",
        a: "Yes! Select 'Finance' and choose 'CSV' format in the Data Export screen. You can then open the file in Excel or Google Sheets.",
      },
      {
        q: "Does the export include images?",
        a: "Currently, the JSON export includes text data and metadata. Heavy media files (images) are not embedded in the JSON to keep it lightweight.",
      },
    ],
  },
  {
    category: "Features",
    questions: [
      {
        q: "How does the Vault work?",
        a: "Upload important docs (IDs, Warranties). Set an Expiry Date. The app will remind you 30 days, 14 days, and 7 days before it expires.",
      },
      {
        q: "Can I rotate chores automatically?",
        a: "Yes. In Task Settings, enable 'Chore Rotation'. The app will shuffle assignees for recurring tasks every Monday.",
      },
      {
        q: "How do I share a shopping list?",
        a: "Since the app is designed for families, all lists created in the 'Family' workspace are instantly visible to all added members.",
      },
    ],
  },
];


export const HelpScreen: React.FC = () => {
  const { openSidebar } = useSidebar();
  const navigation = useNavigation<any>();
  const { showToast } = useToast();
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"features" | "faq">("features");

  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  const filteredFeatures = useMemo(() =>
    featureGuides.filter(f =>
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase())
    ), [searchQuery]
  );

  const filteredFaqs = useMemo(() =>
    faqItems.map(cat => ({
      ...cat,
      questions: cat.questions.filter(q =>
        q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.a.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(c => c.questions.length > 0), [searchQuery]
  );

  return (
    <>
      <AppLayout>
        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable onPress={() => navigation.goBack()} style={[styles.backButton, { borderRadius: radius.sm }]}>
              <ChevronLeft size={24} color={colors.foreground} />
            </Pressable>
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>Help & Support</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Learn how to use every feature</Text>
            </View>
          </View>

          {/* Hero */}
          <View style={[styles.heroCard, { backgroundColor: colors.primary, shadowColor: colors.primary, borderRadius: radius.lg }]}>
            <View style={[styles.heroIconBox, { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.full }]}>
              <Book size={32} color={colors.primaryForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, { color: colors.primaryForeground }]}>Complete User Guide</Text>
              <Text style={[styles.heroSubtitle, { color: colors.primaryForeground, opacity: 0.9 }]}>Everything you need to manage your family</Text>
            </View>
          </View>

          {/* Tutorial Button */}
          <Pressable
            style={[styles.tutorialBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }]}
            onPress={() => setShowTutorial(true)}
          >
            <View style={[styles.playIconBox, { backgroundColor: colors.success + '20', borderRadius: radius.full }]}>
              <PlayCircle size={24} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tutorialTitle, { color: colors.foreground }]}>Watch Tutorial Again</Text>
              <Text style={[styles.tutorialSub, { color: colors.mutedForeground }]}>Step-by-step walkthrough of all features</Text>
            </View>
            <ChevronRight size={20} color={colors.mutedForeground} />
          </Pressable>

          {/* Search */}
          <View style={[styles.searchContainer, { backgroundColor: colors.muted, borderRadius: radius.md }]}>
            <Search size={20} color={colors.mutedForeground} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search features or questions..."
              placeholderTextColor={colors.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Tabs */}
          <View style={[styles.tabContainer, { backgroundColor: colors.muted, borderRadius: radius.md }]}>
            <Pressable
              style={[
                styles.tab,
                { borderRadius: radius.sm },
                activeTab === 'features' && [styles.activeTab, { backgroundColor: colors.card }]
              ]}
              onPress={() => setActiveTab('features')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'features' ? [styles.activeTabText, { color: colors.primary }] : { color: colors.mutedForeground }
              ]}>
                📚 Feature Guide
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.tab,
                { borderRadius: radius.sm },
                activeTab === 'faq' && [styles.activeTab, { backgroundColor: colors.card }]
              ]}
              onPress={() => setActiveTab('faq')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'faq' ? [styles.activeTabText, { color: colors.primary }] : { color: colors.mutedForeground }
              ]}>
                ❓ FAQ
              </Text>
            </Pressable>
          </View>

          {/* Content */}
          {activeTab === 'features' && (
            <View style={styles.contentSection}>
              <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>Tap any feature to learn how to use it</Text>
              {filteredFeatures.map(item => (
                <View key={item.id} style={[styles.accordionCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }]}>
                  <Pressable
                    style={styles.accordionHeader}
                    onPress={() => setExpandedFeature(expandedFeature === item.id ? null : item.id)}
                  >
                    <View style={[styles.featureIconBox, { backgroundColor: colors.muted, borderRadius: radius.md }]}>
                      <item.icon size={24} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.featureTitle, { color: colors.foreground }]}>{item.title}</Text>
                      <Text numberOfLines={1} style={[styles.featureDesc, { color: colors.mutedForeground }]}>{item.description}</Text>
                    </View>
                    {expandedFeature === item.id ? (
                      <ChevronUp size={20} color={colors.mutedForeground} />
                    ) : (
                      <ChevronDown size={20} color={colors.mutedForeground} />
                    )}
                  </Pressable>

                  {expandedFeature === item.id && (
                    <View style={styles.accordionBody}>
                      <Text style={[styles.fullDesc, { color: colors.mutedForeground }]}>{item.description}</Text>

                      {/* How to use */}
                      <View style={styles.subSection}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                          <View style={[styles.miniIconBox, { backgroundColor: colors.muted, borderRadius: radius.xs }]}><Text>📋</Text></View>
                          <Text style={[styles.subTitle, { color: colors.foreground }]}>How to Use</Text>
                        </View>
                        {item.howToUse.map((step, idx) => (
                          <View key={idx} style={styles.stepRow}>
                            <View style={[styles.stepDot, { backgroundColor: colors.primary, borderRadius: radius.full }]} />
                            <Text style={[styles.stepText, { color: colors.mutedForeground }]}>{step}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Tips */}
                      <View style={styles.subSection}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                          <View style={[styles.miniIconBox, { backgroundColor: colors.success + '20', borderRadius: radius.xs }]}><Text>💡</Text></View>
                          <Text style={[styles.subTitle, { color: colors.foreground }]}>Pro Tips</Text>
                        </View>
                        {item.tips.map((tip, idx) => (
                          <View key={idx} style={[styles.tipBox, { backgroundColor: colors.muted, borderRadius: radius.sm }]}>
                            <Text style={[styles.tipText, { color: colors.mutedForeground }]}>{tip}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {activeTab === 'faq' && (
            <View style={styles.contentSection}>
              {filteredFaqs.map((cat, idx) => (
                <View key={idx} style={styles.faqCategory}>
                  <Text style={[styles.faqCatTitle, { color: colors.primary }]}>{cat.category}</Text>
                  {cat.questions.map((q, qImg) => (
                    <View key={qImg} style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }]}>
                      <Text style={[styles.question, { color: colors.foreground }]}>{q.q}</Text>
                      <Text style={[styles.answer, { color: colors.mutedForeground }]}>{q.a}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

        </ScrollView>
      </AppLayout>

      <GettingStartedTutorial
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
  },
  heroCard: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  heroIconBox: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  tutorialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
    gap: 16,
  },
  playIconBox: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tutorialTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  tutorialSub: {
    fontSize: 13,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 24,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontWeight: '600',
    fontSize: 14,
  },
  activeTabText: {
    fontWeight: '700',
  },
  contentSection: {
    gap: 16,
  },
  sectionHint: {
    textAlign: 'center',
    fontSize: 13,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  accordionCard: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  featureIconBox: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
  },
  accordionBody: {
    padding: 16,
    paddingTop: 0,
  },
  fullDesc: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  subSection: {
    marginBottom: 20,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  miniIconBox: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  stepDot: {
    width: 6,
    height: 6,
    marginTop: 8,
    marginRight: 12,
  },
  stepText: {
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
  tipBox: {
    padding: 12,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  faqCategory: {
    marginBottom: 24,
  },
  faqCatTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    marginLeft: 4,
  },
  faqCard: {
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  answer: {
    fontSize: 14,
    lineHeight: 22,
  },
});
