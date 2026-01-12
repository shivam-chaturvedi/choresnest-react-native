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
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useThemeColors, useThemeRadius } from '../contexts/ThemeContext';

type NavProp = NativeStackNavigationProp<Record<string, object | undefined>>;

import { AppIcon } from "../components/ui/AppIcon";

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [email, setEmail] = useState("");
  const colors = useThemeColors();
  const radius = useThemeRadius();

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[
        styles.header,
        {
          backgroundColor: colors.primary,
          borderBottomLeftRadius: radius.card,
          borderBottomRightRadius: radius.card
        }
      ]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
          <AppIcon name="arrowLeft" size={20} color={colors.primaryForeground} />
          <Text style={[styles.backText, { color: colors.primaryForeground }]}>Back to Sign In</Text>
        </Pressable>
        <View style={styles.logoWrapper}>
          <View style={[styles.logoCircle, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }]}>
            <Text style={styles.logoIcon}>🏠</Text>
            <Text style={styles.logoBadge}>🔐</Text>
          </View>
        </View>
        <Text style={[styles.title, { color: colors.primaryForeground }]}>Reset Password</Text>
        <Text style={[styles.subtitle, { color: colors.primaryForeground + 'D9' }]}>We'll send you a reset link</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow, borderRadius: radius.card }]}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '10', borderRadius: radius.card }]}>
          <Text style={styles.icon}>✉️</Text>
        </View>
        <Text style={[styles.heading, { color: colors.foreground }]}>Forgot your password?</Text>
        <Text style={[styles.description, { color: colors.mutedForeground }]}>
          Don't worry! Enter your email and we will send you a link to reset your password.
        </Text>

        <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md }]}>
          <Text style={styles.inputIcon}>✉️</Text>
          <TextInput
            style={[styles.textInput, { color: colors.foreground }]}
            placeholder="Enter your email address"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary, shadowColor: colors.primary, borderRadius: radius.lg }]}>
          <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Send Reset Link</Text>
        </Pressable>
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '20', borderRadius: radius.lg }]}>
        <View style={[styles.infoIcon, { backgroundColor: colors.primary, borderRadius: radius.md }]}>
          <Text style={[styles.infoIconText, { color: colors.primaryForeground }]}>🛡️</Text>
        </View>
        <View style={styles.infoTextContainer}>
          <Text style={[styles.infoTitle, { color: colors.foreground }]}>Secure Reset Process</Text>
          <Text style={[styles.infoSubtitle, { color: colors.mutedForeground }]}>
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
    paddingBottom: 24,
  },
  header: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  backRow: {
    position: "absolute",
    left: 24,
    top: 32,
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
    marginBottom: 16,
    marginTop: 24,
  },
  logoCircle: {
    width: 72,
    height: 72,
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
    marginHorizontal: 24,
    marginTop: 20,
    padding: 24,
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
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  icon: {
    fontSize: 28,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 16,
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
    paddingVertical: 14,
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
    marginHorizontal: 24,
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
  },
  infoIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
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
