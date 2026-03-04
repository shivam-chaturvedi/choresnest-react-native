import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
} from "react-native";
import { useToast } from "../components/ui/Toast";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { theme } from "../theme";
import { useThemeColors, useThemeRadius } from "../contexts/ThemeContext";
import { AppIcon } from "../components/ui/AppIcon";
import { supabase } from "../config/supabase";
import { getHumanReadableMessage } from "../utils/SupabaseErrorHandler";
import { isStrongPassword } from "../utils/validators";
import { useAuth } from "../contexts/AuthContext";

export const ResetPasswordScreen: React.FC = () => {
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const { showToast } = useToast();
  const { logout, completePasswordRecoveryFlow } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (!password.trim()) {
      setError("Password is required.");
      return;
    }

    if (!isStrongPassword(password.trim())) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        const message = getHumanReadableMessage(error, "password_reset");
        setError(message);
        showToast({
          type: "error",
          title: "Reset Failed",
          description: message,
          duration: 4000,
        });
        return;
      }

      showToast({
        type: "success",
        title: "Password Updated",
        description: "Use your new password to sign in.",
        duration: 4000,
      });

      completePasswordRecoveryFlow();
      await logout();
    } catch (updateError: any) {
      const message = getHumanReadableMessage(updateError, "password_reset");
      setError(message);
      showToast({
        type: "error",
        title: "Reset Failed",
        description: message,
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={[styles.logoWrapper, { borderRadius: radius.card }]}>
          <AppIcon name="shield" size={28} color={colors.primaryForeground} />
        </View>
        <Text style={[styles.title, { color: colors.primaryForeground }]}>Reset Password</Text>
        <Text style={[styles.subtitle, { color: colors.primaryForeground + "D9" }]}>
          Finish the recovery flow by choosing a new password.
        </Text>
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: colors.shadow,
            borderRadius: radius.xl,
          },
        ]}
      >
        <View style={[styles.inputRow, { borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.background }]}>
          <AppIcon name="lock" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
          <TextInput
            style={[styles.textInput, { color: colors.foreground }]}
            placeholder="New password"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>
        <View style={[styles.inputRow, { borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.background, marginTop: 12 }]}>
          <AppIcon name="lock" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
          <TextInput
            style={[styles.textInput, { color: colors.foreground }]}
            placeholder="Confirm password"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.primaryButton, { backgroundColor: colors.primary, shadowColor: colors.primary, borderRadius: radius.lg }, isSubmitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
            {isSubmitting ? "Updating…" : "Update Password"}
          </Text>
        </Pressable>
      </View>
      <LoadingSpinner overlay visible={isSubmitting} />
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
  logoWrapper: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
  },
  card: {
    margin: 20,
    padding: 24,
    gap: 16,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
  },
  primaryButton: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: "#E53935",
    marginTop: -4,
  },
});
