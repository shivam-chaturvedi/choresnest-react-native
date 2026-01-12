import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { theme } from "../theme";

type NavProp = StackNavigationProp<Record<string, object | undefined>>;

import { AppIcon } from "../components/ui/AppIcon";

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [email, setEmail] = useState("");

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
          <AppIcon name="arrowLeft" size={20} color={theme.colors.primaryForeground} />
          <Text style={[styles.backText, { color: theme.colors.primaryForeground }]}>Back to Sign In</Text>
        </Pressable>
        <View style={styles.logoWrapper}>
          <View style={[styles.logoCircle, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={styles.logoIcon}>🏠</Text>
            <Text style={styles.logoBadge}>🔐</Text>
          </View>
        </View>
        <Text style={[styles.title, { color: theme.colors.primaryForeground }]}>Reset Password</Text>
        <Text style={[styles.subtitle, { color: theme.colors.primaryForeground + 'D9' }]}>We'll send you a reset link</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}>
        <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '10' }]}>
          <Text style={styles.icon}>✉️</Text>
        </View>
        <Text style={[styles.heading, { color: theme.colors.foreground }]}>Forgot your password?</Text>
        <Text style={[styles.description, { color: theme.colors.mutedForeground }]}>
          Don't worry! Enter your email and we will send you a link to reset your password.
        </Text>

        <View style={[styles.inputRow, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
          <Text style={styles.inputIcon}>✉️</Text>
          <TextInput
            style={[styles.textInput, { color: theme.colors.foreground }]}
            placeholder="Enter your email address"
            placeholderTextColor={theme.colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <Pressable style={[styles.primaryButton, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}>
          <Text style={[styles.primaryButtonText, { color: theme.colors.primaryForeground }]}>Send Reset Link</Text>
        </Pressable>
      </View>

      <View style={[styles.infoCard, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary + '20' }]}>
        <View style={[styles.infoIcon, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.infoIconText, { color: theme.colors.primaryForeground }]}>🛡️</Text>
        </View>
        <View style={styles.infoTextContainer}>
          <Text style={[styles.infoTitle, { color: theme.colors.foreground }]}>Secure Reset Process</Text>
          <Text style={[styles.infoSubtitle, { color: theme.colors.mutedForeground }]}>
            The reset link expires in 24 hours. If you don't see the email, check your spam
            folder or request another link.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: theme.spacing.lg,
  },
  header: {
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: "center",
  },
  backRow: {
    position: "absolute",
    left: theme.spacing.lg,
    top: theme.spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 10,
  },
  backText: {
    fontWeight: "600",
    fontSize: 16,
  },
  logoWrapper: {
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  logoIcon: {
    fontSize: 30,
  },
  logoBadge: {
    position: "absolute",
    right: 8,
    bottom: 6,
    fontSize: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
  },
  card: {
    marginHorizontal: theme.spacing.lg,
    marginTop: -40,
    borderRadius: 24,
    padding: theme.spacing.lg,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
    alignItems: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  icon: {
    fontSize: 28,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: theme.spacing.sm,
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    width: "100%",
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: 10,
    fontSize: 18,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  primaryButton: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  primaryButtonText: {
    fontWeight: "600",
    fontSize: 16,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 16,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderWidth: 1,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  infoIconText: {
    fontSize: 22,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontWeight: "600",
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.8,
  },
});
