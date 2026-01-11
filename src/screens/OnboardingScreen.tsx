import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import { theme } from "../theme";

const { width } = Dimensions.get("window");

const onboardingSlides = [
  {
    icon: "📅",
    title: "Shared Family Calendar",
    description:
      "Keep everyone in sync with color-coded events, symbols, and reminders that the whole family can see.",
  },
  {
    icon: "✅",
    title: "Tasks, Chores & Shopping",
    description:
      "Assign tasks, track chores with rewards, and create shared shopping lists that update in real-time.",
  },
  {
    icon: "🍽️",
    title: "Meals, Health & Nutrition",
    description:
      "Plan meals, scan food for nutrition info, and track your family's health with smart suggestions.",
  },
  {
    icon: "📁",
    title: "Everything in One Place",
    description:
      "Store documents, track expenses, warranties, and bills. Your family's digital vault.",
  },
];

interface OnboardingScreenProps {
  onSkip: () => void;
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onSkip,
  onComplete,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = onboardingSlides[currentSlide];

  const handleNext = () => {
    if (currentSlide < onboardingSlides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  return (
    <View style={styles.screenContainer}>
      <View style={styles.skipRow}>
        <Pressable onPress={onSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.illustrationCard}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>{slide.icon}</Text>
          </View>
          <View style={styles.accentSpot} />
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.description}>{slide.description}</Text>
        </View>

        <View style={styles.dotRow}>
          {onboardingSlides.map((_, index) => (
            <Pressable
              key={index}
              onPress={() => setCurrentSlide(index)}
              style={[
                styles.dot,
                index === currentSlide ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {currentSlide === onboardingSlides.length - 1 ? "Get Started →" : "Next →"}
          </Text>
        </Pressable>
        <Text style={styles.progressText}>
          {currentSlide + 1} of {onboardingSlides.length}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "#e6edf9",
    paddingTop: theme.spacing.lg,
  },
  skipRow: {
    alignItems: "flex-end",
    paddingHorizontal: theme.spacing.lg,
  },
  skipButton: {
    backgroundColor: "#E2E8F0", // Light gray
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  skipText: {
    color: theme.colors.foreground,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  illustrationCard: {
    width: width * 0.55,
    height: width * 0.55,
    borderRadius: 28,
    backgroundColor: theme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.xl,
    shadowColor: "#0b1f3c",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 6,
    position: "relative",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 18,
    backgroundColor: theme.colors.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  iconText: {
    fontSize: 36,
  },
  accentSpot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#c2d8f1",
    position: "absolute",
    top: 24,
    right: width * 0.15,
    shadowColor: "#0b1f3c",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  textBlock: {
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: theme.colors.foreground,
    textAlign: "center",
    marginBottom: theme.spacing.xs,
  },
  description: {
    fontSize: 16,
    color: theme.colors.mutedForeground,
    textAlign: "center",
    lineHeight: 22,
  },
  dotRow: {
    flexDirection: "row",
    marginTop: theme.spacing.md,
  },
  dot: {
    height: 10,
    borderRadius: 5,
    marginHorizontal: 6,
  },
  dotActive: {
    width: 36,
    backgroundColor: theme.colors.primary,
  },
  dotInactive: {
    width: 10,
    backgroundColor: theme.colors.border,
  },
  footer: {
    padding: theme.spacing.lg,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    width: "85%",
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#0b1f3c",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 5,
  },
  buttonText: {
    color: theme.colors.primaryForeground,
    fontWeight: "600",
    fontSize: 16,
  },
  progressText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedForeground,
  },
});
