import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Dimensions,
  Animated,
} from "react-native";
import { AppLayout } from "../components/layout/AppLayout";
import { theme } from "../theme";
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
  MessageCircle,
  Mail,
  PlayCircle,
  Plus,
  GripVertical,
  Repeat,
  Sparkles,
  Check,
  X,
  ChevronRight,
  Shield,
  Download,
} from "lucide-react-native";

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
      "Check nutritional information",
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
    id: "family",
    icon: Users,
    title: "Family Members",
    path: "Family",
    description: "Manage family profiles, roles, and permissions.",
    howToUse: [
      "Tap \"Add Member\" to create new profiles",
      "Set roles (Parent, Child, Guardian)",
      "Assign unique colors for calendar events",
      "Edit member details anytime",
      "View member-specific tasks and events",
      "Set permissions for children accounts",
    ],
    tips: [
      "Use distinct colors for easy identification",
      "Add birthdates for birthday reminders",
      "Set nicknames for personalization",
      "Link email for notifications",
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
    id: 'export',
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
  }
];

const faqItems = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "How do I set up my family account?",
        a: "After signing up, you'll go through a quick onboarding where you can add your family name and invite members. You can also do this later from Settings → Family Members.",
      },
      {
        q: "Can I use the app on multiple devices?",
        a: "Yes! Your data syncs across all devices. Just sign in with the same account on each device.",
      },
      {
        q: "How do I invite family members?",
        a: "Go to Settings → Family Members → Add Member. Enter their email and they'll receive an invitation to join your family group.",
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
        a: "Go to Settings → Theme to switch between Light and Dark modes, or set it to follow your device's system setting.",
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

const tutorialSteps = [
  {
    id: 'welcome',
    icon: Sparkles,
    title: 'Welcome to Todo Helpmate!',
    description: 'Your all-in-one family organizer. Let us show you around in just 30 seconds.',
    highlight: 'Manage your entire family life from one app',
    emoji: '👋'
  },
  {
    id: 'home',
    icon: Home,
    title: 'Home Dashboard',
    description: 'Your central hub shows today\'s events, tasks, meals, and alerts. Quick actions let you add anything with one tap.',
    highlight: 'Tap the + buttons for quick actions',
    emoji: '🏠'
  },
  {
    id: 'calendar',
    icon: Calendar,
    title: 'Family Calendar',
    description: 'All family events in one place. Color-coded by member so everyone knows who\'s doing what and when.',
    highlight: 'Events sync across all family devices',
    emoji: '📅'
  },
  {
    id: 'tasks',
    icon: CheckSquare,
    title: 'Tasks & Chores',
    description: 'Assign tasks to family members, set priorities, and track completion. Perfect for household chores!',
    highlight: 'Use recurring tasks for weekly chores',
    emoji: '✅'
  },
  {
    id: 'lists',
    icon: ShoppingCart,
    title: 'Shopping Lists',
    description: 'Create shared shopping lists. Anyone can add items, and they sync in real-time as you shop.',
    highlight: 'Drag to reorder, swipe to delete',
    emoji: '🛒'
  },
  {
    id: 'meals',
    icon: Utensils,
    title: 'Meal Planning',
    description: 'Plan weekly meals by dragging recipes to calendar slots. Auto-generate grocery lists from your plan!',
    highlight: 'Save time with auto grocery lists',
    emoji: '🍽️'
  },
  {
    id: 'vault',
    icon: FolderLock,
    title: 'Document Vault',
    description: 'Store important documents securely. Get reminders before IDs, insurance, and warranties expire.',
    highlight: 'Never miss a renewal again',
    emoji: '🔐'
  },
  {
    id: 'expenses',
    icon: DollarSign,
    title: 'Expense Tracking',
    description: 'Track family spending with beautiful charts. Set budgets and get alerts when you\'re close to limits.',
    highlight: 'Visualize spending patterns',
    emoji: '💰'
  },
  {
    id: 'family',
    icon: Users,
    title: 'Family Members',
    description: 'Add all family members with unique colors. Assign tasks and events to specific people.',
    highlight: 'Each member gets their own color',
    emoji: '👨‍👩‍👧‍👦'
  },
  {
    id: 'search',
    icon: Search,
    title: 'Global Search',
    description: 'Find anything instantly! Search across all events, tasks, recipes, and documents from the search bar.',
    highlight: 'Access search from any screen',
    emoji: '🔍'
  },
  {
    id: 'complete',
    icon: Check,
    title: 'You\'re All Set!',
    description: 'You now know the basics. Explore each feature to discover more. We\'re here to help in Settings → Help.',
    highlight: 'Start organizing your family life!',
    emoji: '🎉'
  }
];

// --- Tutorial Modal Component ---
interface TutorialModalProps {
  visible: boolean;
  onClose: () => void;
}

const TutorialModal: React.FC<TutorialModalProps> = ({ visible, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const step = tutorialSteps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === tutorialSteps.length - 1;
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  useEffect(() => {
    if (visible) setCurrentStep(0);
  }, [visible]);

  const handleNext = () => {
    if (isLast) onClose();
    else setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    if (!isFirst) setCurrentStep(prev => prev - 1);
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
          {/* Progress Bar */}
          <View style={[styles.modalProgressBg, { backgroundColor: theme.colors.border }]}>
            <View style={[styles.modalProgressBar, { width: `${progress}%`, backgroundColor: theme.colors.primary }]} />
          </View>

          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalStepText, { color: theme.colors.mutedForeground }]}>Step {currentStep + 1} of {tutorialSteps.length}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={20} color={theme.colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Content */}
          <View style={styles.modalBody}>
            <View style={styles.modalIconContainer}>
              <View style={[styles.modalEmojiBg, { backgroundColor: theme.colors.muted }]}>
                <Text style={{ fontSize: 50 }}>{step.emoji}</Text>
              </View>
              <View style={[styles.modalIconBadge, { backgroundColor: theme.colors.primary }]}>
                <step.icon size={24} color={'#fff'} />
              </View>
            </View>

            <Text style={[styles.modalTitle, { color: theme.colors.foreground }]}>{step.title}</Text>
            <Text style={[styles.modalDescription, { color: theme.colors.mutedForeground }]}>{step.description}</Text>

            <View style={[styles.highlightBadge, { backgroundColor: theme.colors.success + '20' }]}>
              <Sparkles size={16} color={theme.colors.success} />
              <Text style={[styles.highlightText, { color: theme.colors.success }]}>{step.highlight}</Text>
            </View>
          </View>

          {/* Dots */}
          <View style={styles.dotsRow}>
            {tutorialSteps.map((_, index) => (
              <Pressable
                key={index}
                onPress={() => setCurrentStep(index)}
                style={[
                  styles.dot,
                  index === currentStep ? { backgroundColor: theme.colors.primary, width: 24 } : { backgroundColor: theme.colors.muted, width: 8 },
                  index < currentStep && { backgroundColor: theme.colors.primary }
                ]}
              />
            ))}
          </View>

          {/* Actions */}
          <View style={styles.modalActions}>
            {!isFirst && (
              <Pressable style={styles.prevButton} onPress={handlePrev}>
                <ChevronLeft size={20} color={theme.colors.foreground} />
                <Text style={[styles.prevButtonText, { color: theme.colors.foreground }]}>Back</Text>
              </Pressable>
            )}
            <Pressable
              style={[
                styles.nextButton,
                isFirst && { flex: 1 },
                { backgroundColor: theme.colors.primary }
              ]}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>{isLast ? "Get Started" : "Next"}</Text>
              {isLast ? <Check size={18} color="#fff" /> : <ChevronRight size={18} color="#fff" />}
            </Pressable>
          </View>

          {!isLast && (
            <Pressable onPress={onClose} style={{ alignItems: 'center', marginTop: 12 }}>
              <Text style={[styles.skipLink, { color: theme.colors.mutedForeground }]}>Skip tutorial</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
};

// --- Main Help Screen ---
export const HelpScreen: React.FC = () => {
  const { openSidebar } = useSidebar();
  const navigation = useNavigation<any>();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"features" | "faq">("features");

  const handleNavigate = (path: string) => {
    try {
      navigation.navigate(path);
    } catch (error) {
      console.error(error);
      showToast({ title: "Navigation Error", description: "Could not open screen", type: "warning" });
    }
  };

  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);
  const [expandedFaqCategory, setExpandedFaqCategory] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

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
        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
              <ChevronLeft size={24} color={theme.colors.foreground} />
            </Pressable>
            <View>
              <Text style={[styles.title, { color: theme.colors.foreground }]}>Help & Support</Text>
              <Text style={[styles.subtitle, { color: theme.colors.mutedForeground }]}>Learn how to use every feature</Text>
            </View>
          </View>

          {/* Hero */}
          <View style={[styles.heroCard, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}>
            <View style={[styles.heroIconBox, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Book size={32} color={theme.colors.primaryForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, { color: theme.colors.primaryForeground }]}>Complete User Guide</Text>
              <Text style={[styles.heroSubtitle, { color: theme.colors.primaryForeground, opacity: 0.9 }]}>Everything you need to manage your family</Text>
            </View>
          </View>

          {/* Tutorial Button */}
          <Pressable
            style={[styles.tutorialBtn, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={() => setShowTutorial(true)}
          >
            <View style={[styles.playIconBox, { backgroundColor: theme.colors.success + '20' }]}>
              <PlayCircle size={24} color={theme.colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tutorialTitle, { color: theme.colors.foreground }]}>Watch Tutorial Again</Text>
              <Text style={[styles.tutorialSub, { color: theme.colors.mutedForeground }]}>Step-by-step walkthrough of all features</Text>
            </View>
            <ChevronRight size={20} color={theme.colors.mutedForeground} />
          </Pressable>

          {/* Search */}
          <View style={[styles.searchContainer, { backgroundColor: theme.colors.muted }]}>
            <Search size={20} color={theme.colors.mutedForeground} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.foreground }]}
              placeholder="Search features or questions..."
              placeholderTextColor={theme.colors.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Tabs */}
          <View style={[styles.tabContainer, { backgroundColor: theme.colors.muted }]}>
            <Pressable
              style={[
                styles.tab,
                activeTab === 'features' && [styles.activeTab, { backgroundColor: theme.colors.card }]
              ]}
              onPress={() => setActiveTab('features')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'features' ? [styles.activeTabText, { color: theme.colors.primary }] : { color: theme.colors.mutedForeground }
              ]}>
                📚 Feature Guide
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.tab,
                activeTab === 'faq' && [styles.activeTab, { backgroundColor: theme.colors.card }]
              ]}
              onPress={() => setActiveTab('faq')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'faq' ? [styles.activeTabText, { color: theme.colors.primary }] : { color: theme.colors.mutedForeground }
              ]}>
                ❓ FAQ
              </Text>
            </Pressable>
          </View>

          {/* Content */}
          {activeTab === 'features' && (
            <View style={styles.contentSection}>
              <Text style={[styles.sectionHint, { color: theme.colors.mutedForeground }]}>Tap any feature to learn how to use it</Text>
              {filteredFeatures.map(item => (
                <View key={item.id} style={[styles.accordionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Pressable
                    style={styles.accordionHeader}
                    onPress={() => setExpandedFeature(expandedFeature === item.id ? null : item.id)}
                  >
                    <View style={[styles.featureIconBox, { backgroundColor: theme.colors.muted }]}>
                      <item.icon size={24} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.featureTitle, { color: theme.colors.foreground }]}>{item.title}</Text>
                      <Text numberOfLines={1} style={[styles.featureDesc, { color: theme.colors.mutedForeground }]}>{item.description}</Text>
                    </View>
                    {expandedFeature === item.id ? (
                      <ChevronUp size={20} color={theme.colors.mutedForeground} />
                    ) : (
                      <ChevronDown size={20} color={theme.colors.mutedForeground} />
                    )}
                  </Pressable>

                  {expandedFeature === item.id && (
                    <View style={styles.accordionBody}>
                      <Text style={[styles.fullDesc, { color: theme.colors.mutedForeground }]}>{item.description}</Text>

                      {/* How to use */}
                      <View style={styles.subSection}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                          <View style={[styles.miniIconBox, { backgroundColor: theme.colors.muted }]}><Text>📋</Text></View>
                          <Text style={[styles.subTitle, { color: theme.colors.foreground }]}>How to Use</Text>
                        </View>
                        {item.howToUse.map((step, idx) => (
                          <View key={idx} style={styles.stepRow}>
                            <View style={[styles.stepNum, { backgroundColor: theme.colors.muted }]}><Text style={[styles.stepNumText, { color: theme.colors.primary }]}>{idx + 1}</Text></View>
                            <Text style={[styles.stepText, { color: theme.colors.foreground }]}>{step}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Tips */}
                      <View style={styles.subSection}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                          <View style={[styles.miniIconBox, { backgroundColor: theme.colors.success + '20' }]}><Text>💡</Text></View>
                          <Text style={[styles.subTitle, { color: theme.colors.foreground }]}>Pro Tips</Text>
                        </View>
                        {item.tips.map((tip, idx) => (
                          <View key={idx} style={styles.stepRow}>
                            <Text style={{ color: theme.colors.success, marginRight: 8 }}>•</Text>
                            <Text style={[styles.stepText, { color: theme.colors.foreground }]}>{tip}</Text>
                          </View>
                        ))}
                      </View>

                      <Pressable
                        style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                        onPress={() => handleNavigate(item.path)}
                      >
                        <Text style={styles.actionBtnText}>Go to {item.title}</Text>
                        <ChevronRight size={16} color="#fff" />
                      </Pressable>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {activeTab === 'faq' && (
            <View style={styles.contentSection}>
              {filteredFaqs.map((category, i) => (
                <View key={i} style={[styles.accordionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Pressable
                    style={styles.accordionHeader}
                    onPress={() => setExpandedFaqCategory(expandedFaqCategory === category.category ? null : category.category)}
                  >
                    <Text style={[styles.featureTitle, { color: theme.colors.foreground, flex: 1 }]}>{category.category}</Text>
                    {expandedFaqCategory === category.category ? (
                      <ChevronUp size={20} color={theme.colors.mutedForeground} />
                    ) : (
                      <ChevronDown size={20} color={theme.colors.mutedForeground} />
                    )}
                  </Pressable>

                  {expandedFaqCategory === category.category && (
                    <View style={styles.accordionBody}>
                      {category.questions.map((q, idx) => (
                        <View key={idx} style={styles.faqRow}>
                          <Text style={[styles.faqQuestion, { color: theme.colors.foreground }]}>Q: {q.q}</Text>
                          <Text style={[styles.faqAnswer, { color: theme.colors.mutedForeground }]}>{q.a}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </AppLayout>

      <TutorialModal visible={showTutorial} onClose={() => setShowTutorial(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 8,
    gap: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  heroIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  heroSubtitle: {
    fontSize: 13,
  },
  tutorialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  playIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tutorialTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  tutorialSub: {
    fontSize: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
    marginBottom: 24,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 15,
  },
  tabContainer: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 12,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 8,
  },
  activeTab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontWeight: "600",
    fontSize: 14,
  },
  activeTabText: {
    fontWeight: "700",
  },
  contentSection: {
    gap: 12,
  },
  sectionHint: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  accordionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  featureDesc: {
    fontSize: 13,
  },
  accordionBody: {
    padding: 16,
    paddingTop: 0,
  },
  fullDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  subSection: {
    marginBottom: 20,
  },
  miniIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 8,
  },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  faqRow: {
    marginBottom: 16,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Tutorial Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    borderRadius: 24,
    overflow: 'hidden',
    paddingBottom: 24,
  },
  modalProgressBg: {
    height: 4,
    width: '100%',
  },
  modalProgressBar: {
    height: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  modalStepText: {
    fontSize: 13,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  modalIconContainer: {
    width: 100,
    height: 100,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  modalEmojiBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  highlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  highlightText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
  },
  dotCompleted: {
    width: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
  },
  prevButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
  },
  prevButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    flex: 2,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  skipLink: {
    fontSize: 13,
    marginTop: 8,
  },
});
