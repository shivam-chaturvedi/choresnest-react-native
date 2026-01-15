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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { theme } from "../theme";
import { AppIcon } from "../components/ui/AppIcon";
import { useAuth } from "../contexts/AuthContext";

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
  const { login, loginAsGuest } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const radius = theme.radius;

  const handleSubmit = async () => {
    // In a real app, validate and use login(email, password)
    await login(formData.email, formData.password);
    onAuthenticated();
  };

  const handleGuestLogin = async () => {
    await loginAsGuest();
    onAuthenticated();
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.header, {
        backgroundColor: theme.colors.primary,
        borderBottomLeftRadius: radius.xxl,
        borderBottomRightRadius: radius.xxl
      }]}>
        <View style={styles.logoWrapper}>
          <View style={[styles.logoSquare, {
            backgroundColor: theme.colors.card,
            shadowColor: theme.colors.shadow,
            borderRadius: radius.card
          }]}>
            <View style={styles.logoContainer}>
              <AppIcon name="home" size={32} color={theme.colors.primary} />
              <View style={[styles.shieldBadge, { backgroundColor: theme.colors.card, borderRadius: radius.xs }]}>
                <AppIcon name="shield" size={16} color={theme.colors.secondary} />
              </View>
            </View>
          </View>
        </View>
        <Text style={[styles.title, { color: theme.colors.primaryForeground }]}>Family Chores</Text>
        <Text style={[styles.subtitle, { color: theme.colors.primaryForeground + 'D9' }]}>Organize Your Family Life</Text>
      </View>

      <View style={styles.formWrapper}>
        <View style={[styles.card, {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.shadow,
          borderRadius: radius.xl
        }]}>
          <View style={[styles.tabs, { backgroundColor: theme.colors.muted, borderRadius: radius.lg }]}>
            <Pressable
              onPress={() => setIsLogin(true)}
              style={[
                styles.tab,
                { borderRadius: radius.md },
                isLogin ? [styles.tabActive, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }] : styles.tabInactive,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  isLogin ? { color: theme.colors.foreground } : { color: theme.colors.mutedForeground },
                ]}
              >
                Sign In
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setIsLogin(false)}
              style={[
                styles.tab,
                { borderRadius: radius.md },
                !isLogin ? [styles.tabActive, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }] : styles.tabInactive,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  !isLogin ? { color: theme.colors.foreground } : { color: theme.colors.mutedForeground },
                ]}
              >
                Sign Up
              </Text>
            </Pressable>
          </View>

          <View style={styles.fieldStack}>
            {!isLogin && (
              <View style={[styles.inputRow, {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
                borderRadius: radius.md
              }]}>
                <AppIcon name="user" size={20} color={theme.colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: theme.colors.foreground }]}
                  placeholder="Full Name"
                  placeholderTextColor={theme.colors.mutedForeground}
                  value={formData.name}
                  onChangeText={(value) =>
                    setFormData((prev) => ({ ...prev, name: value }))
                  }
                />
              </View>
            )}

            <View style={[styles.inputRow, {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              borderRadius: radius.md
            }]}>
              <AppIcon name="mail" size={20} color={theme.colors.mutedForeground} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { color: theme.colors.foreground }]}
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

            <View style={[styles.inputRow, {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              borderRadius: radius.md
            }]}>
              <AppIcon name="lock" size={20} color={theme.colors.mutedForeground} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { color: theme.colors.foreground }]}
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
              <Text style={[styles.forgotText, { color: theme.colors.primary }]}>Forgot Password?</Text>
            </Pressable>
          )}

          <Pressable style={[styles.primaryButton, { backgroundColor: theme.colors.primary, borderRadius: radius.lg }]} onPress={handleSubmit}>
            <Text style={[styles.primaryButtonText, { color: theme.colors.primaryForeground }]}>
              {isLogin ? "Sign In" : "Create Account"}
            </Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
            <Text style={[styles.dividerText, { color: theme.colors.mutedForeground }]}>or</Text>
            <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
          </View>

          <Pressable style={[styles.googleButton, {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            shadowColor: theme.colors.shadow,
            borderRadius: radius.lg
          }]}>
            <View style={styles.googleIconWrapper}>
              <Image
                source={require('../assets/images/google.png')}
                style={{ width: 24, height: 24 }}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.googleButtonText, { color: theme.colors.foreground }]}>Continue with Google</Text>
          </Pressable>

          <Pressable style={{ marginTop: 16, alignItems: 'center' }} onPress={handleGuestLogin}>
            <Text style={{ fontSize: 14, color: theme.colors.mutedForeground }}>
              Skip for now? <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Continue as Guest</Text>
            </Text>
          </Pressable>
        </View>

        <View style={[styles.infoCard, {
          backgroundColor: theme.colors.primary + '10',
          borderColor: theme.colors.primary + '20',
          borderRadius: radius.lg
        }]}>
          <View style={[styles.infoIcon, { backgroundColor: theme.colors.primary, borderRadius: radius.sm }]}>
            <AppIcon name="shield" size={20} color={theme.colors.primaryForeground} />
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={[styles.infoTitle, { color: theme.colors.foreground }]}>One Account, Multiple Profiles</Text>
            <Text style={[styles.infoSubtitle, { color: theme.colors.mutedForeground }]}>
              Add family members after signing in. Each profile gets its own
              vault, calendar, and shared lists.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.colors.mutedForeground }]}>
          By continuing, you agree to our{" "}
          <Text style={[styles.linkText, { color: theme.colors.primary }]}>Terms of Service</Text> and{" "}
          <Text style={[styles.linkText, { color: theme.colors.primary }]} onPress={() => onPrivacy?.()}>
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
  },
  screenContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  header: {
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    // Radius moved to inline
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrapper: {
    marginBottom: theme.spacing.sm,
  },
  logoSquare: {
    width: 64,
    height: 64,
    // Radius moved
    alignItems: "center",
    justifyContent: "center",
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
    padding: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 4,
    marginBottom: theme.spacing.lg,
    fontSize: 14,
  },
  formWrapper: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  card: {
    padding: theme.spacing.lg,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 6,
  },
  tabs: {
    flexDirection: "row",
    padding: 4,
    marginBottom: theme.spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: "center",
  },
  tabActive: {
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
  fieldStack: {
    marginBottom: theme.spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
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
  eyeButton: {
    marginLeft: 6,
  },
  forgotButton: {
    alignSelf: "flex-end",
    marginBottom: theme.spacing.sm,
  },
  forgotText: {
    fontWeight: "600",
  },
  primaryButton: {
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    marginTop: theme.spacing.sm,
  },
  primaryButtonText: {
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
  },
  dividerText: {
    marginHorizontal: 8,
    fontSize: 12,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingVertical: 16,
    justifyContent: "center",
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
    fontSize: 16,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
  },
  infoIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontWeight: "700",
    marginBottom: 4,
    fontSize: 15,
  },
  infoSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.8,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  footerText: {
    textAlign: "center",
    fontSize: 12,
  },
  linkText: {
    fontWeight: "600",
  },
});
