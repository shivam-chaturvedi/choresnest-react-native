import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Image,
} from "react-native";
import { theme } from "../theme";
import { AppIcon } from "../components/ui/AppIcon";

interface AuthScreenProps {
  onAuthenticated: () => void;
  onForgotPassword?: () => void;
  onPrivacy?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthenticated,
  onForgotPassword,
  onPrivacy,
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleSubmit = () => {
    onAuthenticated();
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={styles.logoWrapper}>
          <View style={styles.logoSquare}>
            <View style={styles.logoContainer}>
              <AppIcon name="home" size={32} color={theme.colors.primary} />
              <View style={styles.shieldBadge}>
                <AppIcon name="shield" size={16} color={theme.colors.secondary} />
              </View>
            </View>
          </View>
        </View>
        <Text style={styles.title}>Family Chores</Text>
        <Text style={styles.subtitle}>Organize Your Family Life</Text>
      </View>

      <View style={styles.formWrapper}>
        <View style={styles.card}>
          <View style={styles.tabs}>
            <Pressable
              onPress={() => setIsLogin(true)}
              style={[
                styles.tab,
                isLogin ? styles.tabActive : styles.tabInactive,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  isLogin ? styles.tabTextActive : styles.tabTextInactive,
                ]}
              >
                Sign In
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setIsLogin(false)}
              style={[
                styles.tab,
                !isLogin ? styles.tabActive : styles.tabInactive,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  !isLogin ? styles.tabTextActive : styles.tabTextInactive,
                ]}
              >
                Sign Up
              </Text>
            </Pressable>
          </View>

          <View style={styles.fieldStack}>
            {!isLogin && (
              <View style={styles.inputRow}>
                <AppIcon name="user" size={20} color={theme.colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Full Name"
                  placeholderTextColor={theme.colors.mutedForeground}
                  value={formData.name}
                  onChangeText={(value) =>
                    setFormData((prev) => ({ ...prev, name: value }))
                  }
                />
              </View>
            )}

            <View style={styles.inputRow}>
              <AppIcon name="mail" size={20} color={theme.colors.mutedForeground} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Email Address"
                placeholderTextColor={theme.colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(value) =>
                  setFormData((prev) => ({ ...prev, email: value }))
                }
              />
            </View>

            <View style={styles.inputRow}>
              <AppIcon name="lock" size={20} color={theme.colors.mutedForeground} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Shared Password"
                placeholderTextColor={theme.colors.mutedForeground}
                secureTextEntry={!showPassword}
                value={formData.password}
                onChangeText={(value) =>
                  setFormData((prev) => ({ ...prev, password: value }))
                }
              />
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.eyeButton}
              >
                <AppIcon name={showPassword ? "eye" : "eyeOff"} size={20} color={theme.colors.mutedForeground} />
              </Pressable>
            </View>
          </View>

          {isLogin && (
            <Pressable
              style={styles.forgotButton}
              onPress={() => onForgotPassword?.()}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>
          )}

          <Pressable style={styles.primaryButton} onPress={handleSubmit}>
            <Text style={styles.primaryButtonText}>
              {isLogin ? "Sign In" : "Create Account"}
            </Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.line} />
          </View>

          <Pressable style={styles.googleButton}>
            <View style={styles.googleIconWrapper}>
              <Image
                source={require('../assets/images/google.png')}
                style={{ width: 24, height: 24 }}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </Pressable>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <AppIcon name="shield" size={20} color={theme.colors.primaryForeground} />
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>One Account, Multiple Profiles</Text>
            <Text style={styles.infoSubtitle}>
              Add family members after signing in. Each profile gets its own
              vault, calendar, and shared lists.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By continuing, you agree to our{" "}
          <Text style={styles.linkText}>Terms of Service</Text> and{" "}
          <Text style={styles.linkText} onPress={() => onPrivacy?.()}>
            Privacy Policy
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#e6edf9",
  },
  screenContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrapper: {
    marginBottom: theme.spacing.sm,
  },
  logoSquare: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: theme.colors.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  logoContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldBadge: {
    position: "absolute",
    right: -6,
    bottom: -6,
    backgroundColor: theme.colors.card,
    borderRadius: 4,
    padding: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.primaryForeground,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: theme.spacing.lg,
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
  },
  formWrapper: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: "#dfe9f5",
    shadowColor: "#2a4e8c",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 6,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#e3ebf9",
    borderRadius: 16,
    padding: 4,
    marginBottom: theme.spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: "center",
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: theme.colors.card,
    shadowColor: "#1f3a6f",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  tabInactive: {},
  tabText: {
    fontWeight: "600",
    fontSize: 14,
  },
  tabTextActive: {
    color: theme.colors.foreground,
  },
  tabTextInactive: {
    color: theme.colors.mutedForeground,
  },
  fieldStack: {
    marginBottom: theme.spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    backgroundColor: "#edf3ff",
  },
  inputIcon: {
    marginRight: 10,
    fontSize: 18,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    color: theme.colors.foreground,
  },
  eyeButton: {
    marginLeft: 6,
  },
  eyeText: {
    fontSize: 18,
    color: theme.colors.mutedForeground,
  },
  forgotButton: {
    alignSelf: "flex-end",
    marginBottom: theme.spacing.sm,
  },
  forgotText: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: 16,
    alignItems: "center",
    marginTop: theme.spacing.sm,
  },
  primaryButtonText: {
    color: theme.colors.primaryForeground,
    fontWeight: "600",
    fontSize: 16,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: theme.spacing.md,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#dfe9f5",
  },
  dividerText: {
    marginHorizontal: 8,
    color: theme.colors.mutedForeground,
    fontSize: 12,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1", // Slate 300
    borderRadius: 16,
    paddingVertical: 16,
    justifyContent: "center",
    backgroundColor: "#fff",
    shadowColor: "#0a1a3c",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 8,
  },
  googleIconWrapper: {
    marginRight: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  googleButtonText: {
    fontWeight: "600",
    color: "#1E293B", // Slate 800
    fontSize: 16,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EFF6FF", // Light Blue 50
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#DBEAFE", // Blue 100
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#2563EB", // Blue 600
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoIconText: {
    fontSize: 22,
    color: "#fff",
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontWeight: "700",
    color: "#1E293B", // Slate 800
    marginBottom: 4,
    fontSize: 15,
  },
  infoSubtitle: {
    fontSize: 13,
    color: "#475569", // Slate 600
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  footerText: {
    textAlign: "center",
    color: theme.colors.mutedForeground,
    fontSize: 12,
  },
  linkText: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
});
