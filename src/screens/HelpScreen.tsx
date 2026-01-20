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
    description: "Your central hub for managing family activities. View upcoming events, tasks, and quick actions.",
    howToUse: [
      "View today's overview with weather and date",
      "See upcoming events and tasks at a glance",
      "Use quick action buttons to add events, tasks, or items",
      "Access family member profiles from the top section",
      "Tap the bell icon to view notifications",
    ],
    tips: [
      "Check the dashboard daily for important updates",
      "Use quick actions for faster task creation",
      "Notifications show unread alerts with a badge",
    ],
  },
  {
    id: "calendar",
    icon: Calendar,
    title: "Family Calendar",
    path: "Calendar",
    description: "A shared calendar for all family events, appointments, and activities.",
    howToUse: [
      "Tap the \"+\" button to add a new event",
      "Select a date to view events for that day",
      "Events are color-coded by family member",
      "Tap an event to view details or edit",
      "Use the week/month toggle to change views",
      "Set reminders for important events",
    ],
    tips: [
      "Assign events to specific family members",
      "Set recurring events for regular activities",
      "Add locations for school or appointment events",
      "Use different categories like School, Work, Health",
    ],
  },
  {
    id: "tasks",
    icon: CheckSquare,
    title: "Tasks & Chores",
    path: "Tasks",
    description: "Manage household chores and tasks. Assign to family members, form habits.",
    howToUse: [
      "Tap \"+\" to create a new task",
      "Assign tasks to family members",
      "Set priority levels (High, Medium, Low)",
      "Add due dates and times",
      "Check off tasks when completed",
      "Filter tasks by member, category, or status",
    ],
    tips: [
      "Create recurring tasks for weekly chores",
      "Use the chore rotation system for fairness",
      "Set reminders for important deadlines",
      "Review completed tasks to track productivity",
    ],
  },
  {
    id: "lists",
    icon: ShoppingCart,
    title: "Shopping Lists",
    path: "Lists",
    description: "Create and manage shopping lists. Drag to reorder, categorize items.",
    howToUse: [
      "Tap \"+\" to add new items to the list",
      "Drag items to reorder by priority",
      "Swipe left to delete items",
      "Check items off as you shop",
      "Items are auto-categorized (Produce, Dairy, etc.)",
      "All lists sync with family members",
    ],
    tips: [
      "Add quantity and notes for each item",
      "Use quick-add for frequently bought items",
      "Clear checked items after shopping",
      "Create separate lists for different stores",
    ],
  },
  {
    id: "vault",
    icon: FolderLock,
    title: "Document Vault",
    path: "Vault",
    description: "Securely store important family documents like IDs, insurance cards, etc.",
    howToUse: [
      "Tap \"+\" to upload a new document",
      "Choose document type (ID, Insurance, Medical, etc.)",
      "Set expiry dates for renewal reminders",
      "Organize by category for easy access",
      "Search documents by name or type",
      "Download or share documents when needed",
    ],
    tips: [
      "Set expiry reminders 30 days in advance",
      "Store both front and back of ID cards",
      "Keep emergency contacts in easy access",
      "Regularly update expired documents",
    ],
  },
  {
    id: "recipes",
    icon: Utensils,
    title: "Recipes Collection",
    path: "Recipes",
    description: "Browse, save, and organize your favorite family recipes.",
    howToUse: [
      "Browse recipes by category or cuisine",
      "Tap a recipe to view full details",
      "Save favorites for quick access",
      "View ingredients and step-by-step instructions",
      "See cooking time and difficulty level",
    ],
    tips: [
      "Filter by dietary restrictions",
      "Use meal prep recipes for busy weeks",
      "Share recipe links with family members",
      "Rate recipes after trying them",
    ],
  },
  {
    id: "mealplan",
    icon: Utensils,
    title: "Meal Planning",
    path: "MealPlan",
    description: "Plan weekly meals with drag-and-drop simplicity.",
    howToUse: [
      "Drag recipes to calendar slots",
      "Plan breakfast, lunch, and dinner",
      "View the full week at a glance",
      "Tap \"Generate List\" to create shopping list",
      "Swap meals by dragging to new slots",
      "Clear slots to remove planned meals",
    ],
    tips: [
      "Plan meals on Sunday for the week ahead",
      "Consider dietary variety across days",
      "Auto-generated lists include all ingredients",
      "Adjust portions for family size",
    ],
  },
  {
    id: "expenses",
    icon: DollarSign,
    title: "Expense Tracker",
    path: "Expenses",
    description: "Track family spending, set budgets, and view insights.",
    howToUse: [
      "Tap \"+\" to add a new expense",
      "Select category (Food, Transport, Bills, etc.)",
      "Enter amount and add notes",
      "View spending charts by category",
      "Set monthly budgets per category",
      "Get alerts when approaching budget limits",
    ],
    tips: [
      "Log expenses immediately for accuracy",
      "Review monthly spending trends",
      "Set realistic budgets based on history",
      "Use insights to identify savings opportunities",
    ],
  },

  {
    id: "notifications",
    icon: Bell,
    title: "Notifications",
    path: "Notifications",
    description: "Manage notification preferences, quiet hours, and alerts.",
    howToUse: [
      "Toggle notification types on/off",
      "Set quiet hours for no disturbance",
      "Choose alert sounds and vibration",
      "Enable/disable specific categories",
      "View notification history",
      "Clear all notifications at once",
    ],
    tips: [
      "Set quiet hours during work/school",
      "Enable important reminders only",
      "Check notifications daily",
      "Customize per family member if needed",
    ],
  },
  {
    id: 'privacy',
    icon: Shield,
    title: 'Privacy & Security',
    path: 'Privacy',
    description: 'Control your data privacy, security settings, and manage connected devices.',
    howToUse: [
      'Review privacy settings',
      'Enable two-factor authentication',
      'Manage connected devices',
      'Control data sharing preferences',
      'View activity logs',
      'Download or delete your data'
    ],
    tips: [
      'Enable all security features',
      'Regularly review connected devices',
      'Use strong passwords',
      'Log out from unused devices'
    ]
  },
  {
    id: 'dataexport',
    icon: Download,
    title: 'Data Export',
    path: 'DataExport',
    description: 'Export your family data for backup or transfer.',
    howToUse: [
      'Select data types to export',
      'Choose export format (PDF, CSV)',
      'Download to your device',
      'Schedule automatic backups',
      'Transfer to new devices'
    ],
    tips: [
      'Export regularly for safety',
      'Keep backups in secure location',
      'Verify exported data integrity'
    ]
  },
  {
    id: 'themes',
    icon: ({ size, color }: { size: number, color: string }) => <View style={{ width: size, height: size, backgroundColor: color, borderRadius: size / 2 }} />, // Simple circle icon
    title: 'Themes & Layouts',
    path: 'Theme',
    description: 'Customize the look and feel of your app with colors and shapes.',
    howToUse: [
      'Go to Settings → Theme',
      'Choose between "Rounded" or "Squared" UI shapes',
      'Select a Color Palette (Sapphire, Amber, Obsidian)',
      'Toggle Light or Dark mode',
      'Your selection applies instantly across the app'
    ],
    tips: [
      'Use "Squared" mode for a more professional look',
      'Try "Amber" palette for a warm, cozy feel',
      'Dark mode is great for battery life',
      'Experiment with different combinations!'
    ]
  }
];

const faqItems = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "How do I set up my family account?",
        a: "After signing up, you'll go through a quick onboarding where you can set your family name. You can manage settings from the Settings screen.",
      },
      {
        q: "Can I use the app on multiple devices?",
        a: "Yes! Your data syncs across all devices. Just sign in with the same account on each device.",
      },
    ],
  },
  {
    category: "Calendar & Events",
    questions: [
      {
        q: "How do I add a recurring event?",
        a: "When creating an event, toggle on \"Repeat\" and select the frequency (Daily, Weekly, Monthly, or Custom). You can also set an end date.",
      },
      {
        q: "Can I assign events to specific family members?",
        a: "Yes! Each event can be assigned to one or more family members. Their color will appear on the calendar for easy identification.",
      },
      {
        q: "How do I set event reminders?",
        a: "When adding an event, scroll to the reminder section and select when you'd like to be notified (15 min, 1 hour, 1 day before, etc.).",
      },
    ],
  },
  {
    category: "Tasks & Chores",
    questions: [
      {
        q: "How does chore rotation work?",
        a: "Enable Chore Rotation in task settings. The app will automatically rotate assigned chores among family members on a weekly basis.",
      },
      {
        q: "Can I set recurring tasks?",
        a: "Yes! When creating a task, enable \"Repeat\" and choose daily, weekly, or monthly. Great for regular chores like taking out trash.",
      },
      {
        q: "How do I track completed tasks?",
        a: "Tap the checkbox next to any task to mark it complete. View history in the \"Completed\" tab to see past achievements.",
      },
    ],
  },
  {
    category: "Shopping Lists",
    questions: [
      {
        q: "How do I reorder items in my list?",
        a: "Press and hold the drag handle (three lines) on any item, then drag it to your desired position.",
      },
      {
        q: "Are shopping lists shared automatically?",
        a: "Yes! All lists sync instantly with family members. Everyone can add items and check them off in real-time.",
      },
      {
        q: "How do I add items from recipes?",
        a: "Use the Meal Plan feature and tap \"Generate Grocery List\" to automatically add all ingredients from your planned meals.",
      },
    ],
  },
  {
    category: "Meal Planning",
    questions: [
      {
        q: "How do I plan meals for the week?",
        a: "Go to Meal Plan screen, browse recipes on the left, and drag them to any day/meal slot on the calendar. Easy drag and drop!",
      },
      {
        q: "How does auto grocery list work?",
        a: "After planning your meals, tap \"Generate Grocery List\" and all ingredients from your planned recipes will be added to your shopping list.",
      },
      {
        q: "Can I save favorite meal plans?",
        a: "Yes! Create a weekly plan you love, then save it as a template. Apply saved templates to quickly plan future weeks.",
      },
    ],
  },
  {
    category: "Expenses & Budget",
    questions: [
      {
        q: "How do I set a monthly budget?",
        a: "Go to Expenses → Settings icon → Set your total monthly budget and individual category limits.",
      },
      {
        q: "How do budget alerts work?",
        a: "When you reach 80% of a category budget, you'll get a warning. At 100%, you'll see an alert. Customize thresholds in settings.",
      },
      {
        q: "Can I track expenses by family member?",
        a: "Yes! When adding an expense, assign it to a family member to track individual spending patterns.",
      },
    ],
  },
  {
    category: "Document Vault",
    questions: [
      {
        q: "Is my data secure in the Vault?",
        a: "Absolutely! All documents are encrypted and stored securely. Only you and authorized family members can access them.",
      },
      {
        q: "How do expiry reminders work?",
        a: "When you add a document with an expiry date (like a passport or insurance), you'll get reminders 30, 14, and 7 days before expiration.",
      },
      {
        q: "Can I share documents with non-family members?",
        a: "Yes! You can generate a secure, temporary link to share specific documents with doctors, schools, or other trusted parties.",
      },
    ],
  },
  {
    category: "Account & Settings",
    questions: [
      {
        q: "How do I change the app theme?",
        a: "Go to Settings → Theme. You can change Color Palette (Sapphire, Amber, etc.), Shapes (Rounded/Squared), and Mode (Light/Dark).",
      },
      {
        q: "What is the difference between Rounded and Squared?",
        a: "rounded mode gives the app soft, curved corners for a friendly look. Squared mode uses sharp corners for a crisp, modern, or professional aesthetic. This affects buttons, cards, and inputs globally.",
      },
      {
        q: "How do I change my password?",
        a: "Go to Settings → Privacy & Security → Change Password. You'll need to enter your current password first.",
      },
      {
        q: "How do I delete my account?",
        a: "Go to Settings → Privacy & Security → Delete Account. Note: This will permanently delete all your family data.",
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
