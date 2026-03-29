import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Modal,
  ActivityIndicator,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { AppLayout } from "../components/layout";
import { useThemeColors, useThemeRadius, useTheme } from "../contexts/ThemeContext";
import { useSidebar } from "../contexts/SidebarContext";
import { AppIcon, AppIconName } from "../components/ui/AppIcon";
import { useFamily, FamilyMember } from "../contexts/FamilyContext";
import { PROFILE_COLORS } from "../constants/profileColors";
import { useAuth } from "../contexts/AuthContext";
import { MemberIcon } from "../components/ui";
import Config from "react-native-config";
import { withDeferredScreen } from "../components/layout/DeferredScreen";
import { SupabaseService } from "../services/SupabaseService";
import { useToast } from "../components/ui/Toast";
import { launchImageLibrary } from "react-native-image-picker";
import { checkPermission, requestPermission } from "../utils/permissions";
import { FEEDBACK_BUCKET, RecipeAssetFile, uploadFeedbackImage } from "../services/StorageService";

const ENABLE_RECIPE_AND_MEALS = Config.ENABLE_RECIPE_AND_MEALS !== 'false';

interface MenuItem {
  label: string;
  description?: string;
  icon: AppIconName;
  color: string;
  iconColor: string;
  route: string;
  action?: () => void;
  badge?: string;
  logo?: AppIconName;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const MoreScreenContent: React.FC = () => {
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const { appearanceMode } = useTheme();
  const isMidnight = appearanceMode === 'midnight';
  const primaryIconColor = isMidnight ? colors.foreground : colors.primary;
  const navigation = useNavigation<NavigationProp<Record<string, undefined>>>();
  const { openSidebar } = useSidebar();
  const { logout, isGuest } = useAuth();
  const { activeMember, members, setActiveMember, profileId } = useFamily();
  const { showToast } = useToast();
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);

  const debugToolsEnabled = (Config.ENABLE_DEBUG_TOOLS ?? '').trim().toLowerCase() === 'true';
  const contactEmail = Config.SUPPORT_EMAIL ?? "support@choresnest.com";
  const contactSubject = "Contact Request";
  const contactMessage = "Hi Chores Nest Team,\n\nI’d love some help with...";
  const bugSubject = "Report a Bug / Feature Request";
  const bugMessage =
    "Hi Team,\n\nI discovered an issue or feature idea:\n- Summary:\n- Steps:\n- Expected:\n- Actual:\n\nThanks!";
  const handleEmail = async (subject: string, body: string) => {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    const url = `mailto:${contactEmail}?subject=${encodedSubject}&body=${encodedBody}`;
    await Linking.openURL(url);
  };
  const feedbackOptions = ["Bug Found", "Feature Request", "General Feedback", "Account Issue", "Theme & UI", "Other"];
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState(feedbackOptions[0]);
  const [feedbackDescription, setFeedbackDescription] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [feedbackImage, setFeedbackImage] = useState<RecipeAssetFile | null>(null);
  const closeFeedbackModal = () => {
    setFeedbackModalVisible(false);
    setCategoryMenuOpen(false);
    setFeedbackImage(null);
    Keyboard.dismiss();
  };
  const ensurePhotoPermission = async (): Promise<boolean> => {
    if (await checkPermission('photo')) {
      return true;
    }

    const attemptRequest = async (): Promise<boolean> => {
      const granted = await requestPermission('photo');
      if (granted) {
        return true;
      }

      return new Promise<boolean>((resolve) => {
        Alert.alert(
          "Permission needed",
          "Please allow access to your photo library to attach an image.",
          [
            {
              text: "Try again",
              onPress: async () => {
                const again = await attemptRequest();
                resolve(again);
              },
            },
            {
              text: "Open settings",
              onPress: () => {
                Linking.openSettings();
                resolve(false);
              },
            },
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => resolve(false),
            },
          ],
          { cancelable: true }
        );
      });
    };

    return attemptRequest();
  };
  const openFeedbackForm = () => {
    setFeedbackCategory(feedbackOptions[0]);
    setFeedbackDescription("");
    setFeedbackImage(null);
    setFeedbackModalVisible(true);
  };
  const handleSelectFeedbackImage = async () => {
    if (!(await ensurePhotoPermission())) {
      return;
    }
    try {
      const { assets, errorCode, errorMessage, didCancel } = await launchImageLibrary({
        mediaType: "photo",
        selectionLimit: 1,
      });
      if (didCancel) {
        return;
      }
      if (errorCode) {
        Alert.alert("Attachment failed", errorMessage ?? "Unable to open the photo library.");
        return;
      }
      const asset = assets?.[0];
      if (!asset?.uri) {
        return;
      }
      setFeedbackImage({
        uri: asset.uri,
        name: asset.fileName,
        type: asset.type ?? "image/jpeg",
      });
    } catch (error) {
      console.warn("Feedback image picker error", error);
      Alert.alert("Attachment failed", "Unable to open the photo library right now.");
    }
  };
  const handleRemoveFeedbackImage = () => {
    setFeedbackImage(null);
  };
  const handleSubmitFeedback = async () => {
    if (!feedbackDescription.trim()) {
      Alert.alert("Missing description", "Please describe your request before submitting.");
      return;
    }
    const pid = profileId ?? "guest";
    try {
      setFeedbackSubmitting(true);
      let imageBucket: string | null = null;
      let imagePath: string | null = null;
      if (feedbackImage) {
        try {
          imagePath = await uploadFeedbackImage(pid, feedbackImage);
          imageBucket = FEEDBACK_BUCKET;
        } catch (error) {
          console.warn("Feedback attachment upload failed", error);
          Alert.alert("Attachment failed", "We couldn't upload the image. Try again or remove the attachment.");
          return;
        }
      }
      const { error } = await SupabaseService.from("feedback").insert({
        profile_id: pid,
        category: feedbackCategory,
        description: feedbackDescription.trim(),
        image_bucket: imageBucket,
        image_path: imagePath,
      });
      if (error) {
        Alert.alert("Submission failed", "Unable to save your feedback right now. Please try again.");
        return;
      }
      closeFeedbackModal();
      setFeedbackDescription("");
      showToast({
        title: "Thanks for your message!",
        description: "We’ll review it shortly.",
        type: "success",
      });
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  // Safe access to profile color
  const activeProfileColor = activeMember?.color
    ? (PROFILE_COLORS.find(c => c.value === activeMember.color)?.hex || colors.primary)
    : colors.primary;


  const sections: MenuSection[] = [
    {
      title: "FEATURES",
      items: [
        ...(ENABLE_RECIPE_AND_MEALS ? [{
          label: "Recipes & Meals",
          description: "Meal planning & recipes",
          icon: "utensils" as AppIconName,
          color: colors.primary + '25',
          iconColor: primaryIconColor,
          route: "Recipes"
        }] : []),
        {
          label: "Nutrition & Health",
          description: "Track health & diet",
          icon: "heart",
          color: colors.danger + '25',
          iconColor: colors.danger,
          route: "Nutrition"
        },
        {
          label: "Notes",
          description: "Ideas & memos",
          icon: "file",
          color: colors.warning + '25',
          iconColor: colors.warning,
          route: "Notes"
        },
        {
          label: "Expenses & Finance",
          description: "Budget & spending",
          icon: "wallet",
          color: colors.success + '25',
          iconColor: colors.success,
          route: "Expenses"
        },
        {
          label: "Tasks & Chores",
          description: "Track assignments & rotations",
          icon: "checkSquare",
          color: colors.primary + '25',
          iconColor: primaryIconColor,
          route: "Tasks"
        },
        {
          label: "Vault",
          description: "Secure Personal Storage",
          icon: "lock",
          color: colors.primary + '25',
          iconColor: primaryIconColor,
          route: "Vault"
        },
        {
          label: "Data Export",
          description: "Backup your data",
          icon: "download",
          color: colors.muted,
          iconColor: colors.foreground,
          route: "DataExport"
        },
      ],
    },

    {
      title: "SETTINGS",
      items: [
        {
          label: "Notifications",
          description: "Alerts & quiet hours",
          icon: "bell",
          color: colors.warning + '25',
          iconColor: colors.warning,
          route: "Notifications"
        },
        {
          label: "Privacy & Security",
          description: "Data protection",
          icon: "shield",
          color: colors.muted,
          iconColor: colors.foreground,
          route: "Privacy"
        },
        {
          label: "Theme",
          description: "Light / Cream mode",
          icon: "palette",
          color: colors.primary + '25',
          iconColor: primaryIconColor,
          route: "Theme"
        },
        {
          label: "Localization",
          description: "Country, currency & time zone",
          icon: "globe",
          color: colors.info + '25',
          iconColor: isMidnight ? colors.foreground : colors.info,
          route: "Settings"
        },
        {
          label: "Help Center",
          description: "FAQ & Feature Guide",
          icon: "help",
          color: colors.info + '25',
          iconColor: isMidnight ? colors.foreground : colors.info,
          route: "Help"
        },
      ],
    },
    {
      title: "CONTACT",
      items: [
        {
          label: "Contact Us",
          description: "Email our support team",
          icon: "mail",
          color: colors.primary + '15',
          iconColor: primaryIconColor,
          route: "Contact",
          action: () => handleEmail(contactSubject, contactMessage),
        },
        {
          label: "Feedback & Support",
          description: "Share feedback or issues",
          icon: "alertCircle",
          color: colors.warning + '15',
          iconColor: colors.warning,
          route: "Contact",
          action: openFeedbackForm,
          logo: "sparkles",
        },
      ],
    },
    ...(debugToolsEnabled ? [{
      title: "DEVELOPER",
      items: [
        {
          label: "Debug Tools",
          description: "Database visualization & logs",
          icon: "terminal" as AppIconName,
          color: colors.primary + '25',
          iconColor: primaryIconColor,
          route: "Debug"
        }
      ]
    }] : [])
  ];

  const handleLogout = async () => {
    try {
      Alert.alert(
        "Sign Out",
        "Are you sure you want to sign out?",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Sign Out",
            style: "destructive",
            onPress: async () => {
              try {
                await logout();
                // Navigation will automatically handle the switch to Auth stack due to AppNavigator logic
              } catch (e) {
                console.error("Logout execution error:", e);
                Alert.alert("Error", "Failed to sign out. Please try again.");
              }
            }
          }
        ]
      );
    } catch (e) {
      console.error("Logout Error:", e);
    }
  };

  const handleSwitchProfile = (member: FamilyMember) => {
    try {
      setActiveMember(member);
      setShowProfileSwitcher(false);
    } catch (e) {
      console.error("Profile Switch Error:", e);
      Alert.alert("Error", "Could not switch profile");
    }
  };

  const handleNavigate = (route: string) => {
    // Helper to handle nested navigation
    const navigateToNested = (tabName: string, stackScreenName?: string) => {
      (navigation as any).navigate(tabName, {
        screen: stackScreenName,
      });
    };

    switch (route) {
      // Home Stack
      case 'Recipes':
      case 'MealPlan':
      case 'Notes':
      case 'Expenses':
      case 'Vault':
      case 'Nutrition':
        navigateToNested('home', route);
        break;

      // More Stack (current stack)
      case 'Notifications':
      case 'Privacy':
      case 'Theme':
      case 'DataExport':
      case 'Help':
      case 'Tasks':
      case 'Debug':
        navigation.navigate(route as any);
        break;

      default:
        navigation.navigate(route as any);
    }
  };

  return (
    <>
      <AppLayout showNav={false}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable onPress={openSidebar} style={[styles.menuButton, { backgroundColor: colors.card, shadowColor: colors.foreground, borderRadius: radius.md }]}>
                <AppIcon name="menu" size={20} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
            </View>

            {/* Top Bar Profile Switcher */}
            <Pressable
              style={[styles.topProfileButton, { backgroundColor: activeProfileColor + '20', borderRadius: radius.full }]}
              onPress={() => setShowProfileSwitcher(true)}
            >
              <MemberIcon symbol={activeMember?.symbol} size={18} />
            </Pressable>
          </View>

          {/* Profile Card */}
          <Pressable
            style={[styles.profileCard, { backgroundColor: colors.card, shadowColor: colors.foreground, borderRadius: radius.card }]}
            onPress={() => setShowProfileSwitcher(true)}
          >
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { backgroundColor: activeProfileColor + '20', borderRadius: radius.lg }]}>
                <MemberIcon symbol={activeMember?.symbol} size={32} />
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.foreground }]}>{activeMember?.name || "Family Member"}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <View style={[styles.roleBadge, { backgroundColor: activeProfileColor + '20', borderRadius: radius.sm, marginRight: 8 }]}>
                  <Text style={[styles.roleText, { color: activeProfileColor }]}>
                    {activeMember?.color ? (PROFILE_COLORS.find(c => c.value === activeMember.color)?.name || "Member") : "Member"}
                  </Text>
                </View>
                <AppIcon name="chevronDown" size={14} color={colors.mutedForeground} />
              </View>
            </View>
            {/* Fixed Icon Name: refreshCw -> rotateCw */}
            <AppIcon name="rotateCw" size={20} color={colors.mutedForeground} />
          </Pressable>

          {sections.map((section) => (
            <View key={section.title} style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{section.title}</Text>
              <View style={[styles.sectionCard, { backgroundColor: colors.card, shadowColor: colors.foreground, borderRadius: radius.card }]}>
                {section.items.map((item, index) => {
                  if (item.label === "Nutrition & Health") return null;

                  return (
                    <Pressable
                      key={item.label}
                      style={[
                        styles.itemRow,
                        { borderRadius: radius.md },
                        index !== section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
                      ]}
                      onPress={() => item.action ? item.action() : handleNavigate(item.route)}
                    >
                      <View style={[styles.itemIcon, { backgroundColor: item.color, borderRadius: radius.md }]}>
                        <AppIcon name={item.icon} size={20} color={item.iconColor} />
                      </View>
                      <View style={styles.itemTextContainer}>
                        <Text style={[styles.itemLabel, { color: colors.foreground }]}>{item.label}</Text>
                        {item.description && (
                          <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>{item.description}</Text>
                        )}
                      </View>
                      {item.badge && (
                        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                          <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>{item.badge}</Text>
                        </View>
                      )}
                      {item.logo && (
                        <View style={styles.itemLogo}>
                          <AppIcon name={item.logo} size={16} color={item.iconColor} />
                        </View>
                      )}
                      <AppIcon name="chevronRight" size={20} color={colors.mutedForeground} />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          <Pressable style={[styles.logoutButton, { backgroundColor: colors.card, shadowColor: colors.foreground, borderColor: colors.border, borderRadius: radius.card }]} onPress={handleLogout}>
            <AppIcon name="logOut" size={20} color={colors.danger} />
            <Text style={[styles.logoutText, { color: colors.danger }]}>Sign Out</Text>
          </Pressable>

          <Text style={[styles.version, { color: colors.mutedForeground }]}>Chores Nest v1.0.6 · Made with ❤️ families</Text>
        </View>
      </AppLayout>

      {/* Profile Switcher Modal */}
      <Modal visible={showProfileSwitcher} animationType="fade" transparent onRequestClose={() => setShowProfileSwitcher(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowProfileSwitcher(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderRadius: radius.xl }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Switch Profile</Text>
              <Pressable onPress={() => setShowProfileSwitcher(false)}>
                <AppIcon name="x" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <FlatList
              data={members ?? []}
              keyExtractor={(member) => member.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
              renderItem={({ item: member }) => {
                const isActive = member.id === activeMember?.id;
                const memColor = PROFILE_COLORS.find(c => c.value === member.color)?.hex || colors.primary;

                return (
                  <Pressable
                    style={[
                      styles.memberOption,
                      {
                        backgroundColor: isActive ? memColor + '10' : colors.muted,
                        borderRadius: radius.lg,
                        borderColor: isActive ? memColor : 'transparent',
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => handleSwitchProfile(member)}
                  >
                    <View style={[styles.optionAvatar, { backgroundColor: memColor + '20', borderRadius: radius.full }]}>
                      <MemberIcon symbol={member.symbol} size={24} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionName, { color: colors.foreground, fontWeight: isActive ? '700' : '500' }]}>
                        {member.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                        {PROFILE_COLORS.find(c => c.value === member.color)?.name}
                      </Text>
                    </View>
                    {isActive && <AppIcon name="check" size={20} color={memColor} />}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={feedbackModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeFeedbackModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              closeFeedbackModal();
            }}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 70}
            style={styles.modalWrapper}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.card, borderRadius: radius.xl }]}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalBody}
              >
                <View>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: colors.foreground }]}>Feedback & Support</Text>
                    <Pressable
                      onPress={closeFeedbackModal}
                    >
                      <AppIcon name="x" size={24} color={colors.mutedForeground} />
                    </Pressable>
                  </View>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Category</Text>
                  <View style={{ position: "relative", marginBottom: 12 }}>
                    <Pressable
                      style={[
                        styles.feedbackDropdown,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.background,
                          borderRadius: radius.md,
                        },
                      ]}
                      onPress={() => setCategoryMenuOpen(prev => !prev)}
                    >
                      <Text style={[styles.feedbackOptionText, { color: colors.foreground }]}>{feedbackCategory}</Text>
                      <AppIcon name={categoryMenuOpen ? "chevronUp" : "chevronDown"} size={16} color={colors.mutedForeground} />
                    </Pressable>
                    {categoryMenuOpen && (
                      <View style={[styles.categoryMenu, { borderColor: colors.border, backgroundColor: colors.card }]}>
                        {feedbackOptions.map(option => (
                          <Pressable
                            key={option}
                            style={[
                              styles.categoryOption,
                              {
                                backgroundColor: option === feedbackCategory ? colors.primary + "15" : colors.background,
                              },
                            ]}
                            onPress={() => {
                              setFeedbackCategory(option);
                              setCategoryMenuOpen(false);
                            }}
                          >
                            <Text style={{ color: colors.foreground }}>{option}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Description</Text>
                  <TextInput
                    style={[
                      styles.feedbackInput,
                      {
                        borderColor: colors.border,
                        color: colors.foreground,
                        borderRadius: radius.md,
                        backgroundColor: colors.background,
                      },
                    ]}
                    placeholder="Tell us what happened or what you'd like to see"
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    value={feedbackDescription}
                    onChangeText={setFeedbackDescription}
                  />
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Attach an image</Text>
                  {feedbackImage ? (
                    <View
                      style={[
                        styles.feedbackAttachmentPreview,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.background,
                        },
                      ]}
                    >
                      <Image source={{ uri: feedbackImage.uri }} style={styles.feedbackAttachmentImage} />
                      <View style={styles.feedbackAttachmentDetails}>
                        <Text style={[styles.feedbackAttachmentName, { color: colors.foreground }]}>
                          {feedbackImage.name ?? "Selected image"}
                        </Text>
                        <View style={styles.feedbackAttachmentActions}>
                          <Pressable onPress={handleSelectFeedbackImage}>
                            <Text style={[styles.feedbackAttachmentActionText, { color: colors.primary }]}>Change</Text>
                          </Pressable>
                          <Pressable onPress={handleRemoveFeedbackImage}>
                            <Text style={[styles.feedbackAttachmentActionText, { color: colors.danger }]}>Remove</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      style={[
                        styles.feedbackAttachmentButton,
                        {
                          borderColor: colors.border,
                          borderRadius: radius.md,
                          backgroundColor: colors.background,
                        },
                      ]}
                      onPress={handleSelectFeedbackImage}
                    >
                      <Text style={[styles.feedbackAttachmentButtonText, { color: colors.foreground }]}>
                        Tap to attach a screenshot or photo (optional)
                      </Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={[
                      styles.feedbackSubmit,
                      { backgroundColor: colors.primary, borderRadius: radius.md },
                      feedbackSubmitting && { opacity: 0.6 },
                    ]}
                    onPress={handleSubmitFeedback}
                    disabled={feedbackSubmitting}
                  >
                    {feedbackSubmitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={[styles.feedbackSubmitText]}>Submit feedback</Text>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 120,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'space-between',
    marginBottom: 24,
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
    fontSize: 24,
    fontWeight: "700",
    marginLeft: 16,
  },
  topProfileButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingLeft: 4,
  },
  sectionCard: {
    padding: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  itemIcon: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  itemDesc: {
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  feedbackOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  feedbackOptionText: {
    fontSize: 14,
  },
  feedbackInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    minHeight: 100,
  },
  feedbackAttachmentButton: {
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  feedbackAttachmentButtonText: {
    fontSize: 14,
    textAlign: "center",
  },
  feedbackAttachmentPreview: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  feedbackAttachmentImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
  },
  feedbackAttachmentDetails: {
    flex: 1,
  },
  feedbackAttachmentName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  feedbackAttachmentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  feedbackAttachmentActionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  feedbackSubmit: {
    paddingVertical: 14,
    alignItems: "center",
  },
  feedbackSubmitText: {
    color: "#fff",
    fontWeight: "700",
  },
  feedbackDropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  categoryMenu: {
    position: "absolute",
    top: 54,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  categoryOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  itemLogo: {
    marginRight: 8,
    marginLeft: 4,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutText: {
    fontWeight: "700",
    fontSize: 16,
  },
  version: {
    textAlign: "center",
    opacity: 0.7,
    fontSize: 12,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20
  },
  modalWrapper: {
    width: "100%",
    alignItems: "center",
  },
  modalContent: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    padding: 24,
    maxHeight: '94%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    minHeight: 460,
  },
  modalBody: {
    paddingBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700'
  },
  memberOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 16
  },
  optionAvatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },
  optionName: {
    fontSize: 16
  }
});

export const MoreScreen = withDeferredScreen(MoreScreenContent, {
  title: "More",
  subtitle: "Loading options...",
  layoutProps: { showNav: false, showAddButton: false },
});
