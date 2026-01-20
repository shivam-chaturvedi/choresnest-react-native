import React, { useState, useEffect } from "react";
import { Modal, View, Text, StyleSheet, Pressable } from "react-native";
import { theme } from "../../theme";
import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";
import {
  Sparkles, Home, Calendar, CheckSquare, ShoppingCart,
  Utensils, FolderLock, DollarSign, Users, Search, Check,
  X, ChevronLeft, ChevronRight
} from "lucide-react-native";

export interface GettingStartedTutorialProps {
  open?: boolean;
  visible?: boolean;
  onClose: () => void;
}

const tutorialSteps = [
  {
    id: 'welcome',
    icon: Sparkles,
    title: 'Welcome to Family Chores!',
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

export const GettingStartedTutorial: React.FC<GettingStartedTutorialProps> = ({ visible, open, onClose }) => {
  // Support both 'visible' (old prop name from HelpScreen.tsx extraction) and 'open' (current prop name)
  const isVisible = visible || open;

  const [currentStep, setCurrentStep] = useState(0);
  const colors = useThemeColors();
  const radius = useThemeRadius();

  const step = tutorialSteps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === tutorialSteps.length - 1;
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  useEffect(() => {
    if (isVisible) setCurrentStep(0);
  }, [isVisible]);

  const handleNext = () => {
    if (isLast) onClose();
    else setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    if (!isFirst) setCurrentStep(prev => prev - 1);
  };

  if (!isVisible) return null;

  return (
    <Modal transparent visible={isVisible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card, borderRadius: radius.xl }]}>
          {/* Progress Bar */}
          <View style={[styles.modalProgressBg, { backgroundColor: colors.border }]}>
            <View style={[styles.modalProgressBar, { width: `${progress}%`, backgroundColor: colors.primary }]} />
          </View>

          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalStepText, { color: colors.mutedForeground }]}>Step {currentStep + 1} of {tutorialSteps.length}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Content */}
          <View style={styles.modalBody}>
            <View style={styles.modalIconContainer}>
              <View style={[styles.modalEmojiBg, { backgroundColor: colors.muted, borderRadius: radius.lg }]}>
                <Text style={{ fontSize: 50 }}>{step.emoji}</Text>
              </View>
              <View style={[styles.modalIconBadge, { backgroundColor: colors.primary, borderRadius: radius.md }]}>
                <step.icon size={24} color={'#fff'} />
              </View>
            </View>

            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{step.title}</Text>
            <Text style={[styles.modalDescription, { color: colors.mutedForeground }]}>{step.description}</Text>

            <View style={[styles.highlightBadge, { backgroundColor: colors.success + '20', borderRadius: radius.md }]}>
              <Sparkles size={16} color={colors.success} />
              <Text style={[styles.highlightText, { color: colors.success }]}>{step.highlight}</Text>
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
                  { borderRadius: radius.xs },
                  index === currentStep ? { backgroundColor: colors.primary, width: 24 } : { backgroundColor: colors.muted, width: 8 },
                  index < currentStep && { backgroundColor: colors.primary }
                ]}
              />
            ))}
          </View>

          {/* Actions */}
          <View style={styles.modalActions}>
            {!isFirst && (
              <Pressable style={[styles.prevButton, { borderRadius: radius.lg }]} onPress={handlePrev}>
                <ChevronLeft size={20} color={colors.foreground} />
                <Text style={[styles.prevButtonText, { color: colors.foreground }]}>Back</Text>
              </Pressable>
            )}
            <Pressable
              style={[
                styles.nextButton,
                isFirst && { flex: 1 },
                { backgroundColor: colors.primary, borderRadius: radius.lg }
              ]}
              onPress={handleNext}
            >
              <Text style={[styles.nextButtonText, { color: colors.primaryForeground }]}>{isLast ? "Get Started" : "Next"}</Text>
              {isLast ? <Check size={18} color={colors.primaryForeground} /> : <ChevronRight size={18} color={colors.primaryForeground} />}
            </Pressable>
          </View>

          {!isLast && (
            <Pressable onPress={onClose} style={{ alignItems: 'center', marginTop: 12 }}>
              <Text style={[styles.skipLink, { color: colors.mutedForeground }]}>Skip tutorial</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    paddingBottom: 20,
  },
  modalProgressBg: {
    height: 4,
    backgroundColor: '#E2E8F0',
    width: '100%',
  },
  modalProgressBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 8,
  },
  modalStepText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  modalIconContainer: {
    position: 'relative',
    marginBottom: 20,
    marginTop: 10,
  },
  modalEmojiBg: {
    width: 80,
    height: 80,
    backgroundColor: '#F1F5F9',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalIconBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    width: 36,
    height: 36,
    backgroundColor: '#3B82F6',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  highlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  highlightText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 24,
  },
  dot: {
    height: 6,
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  prevButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'transparent', // Visual balance
    flex: 1,
  },
  prevButtonText: {
    fontWeight: '600',
    marginLeft: 4,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#3B82F6',
    flex: 2,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    gap: 6,
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  skipLink: {
    fontSize: 13,
    fontWeight: '500',
    padding: 8,
  }
});
