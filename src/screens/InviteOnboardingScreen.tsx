import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useThemeColors, useThemeRadius } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../components/ui/Toast";
import { PROFILE_COLORS } from "../constants/profileColors";
import { MEMBER_ICON_OPTIONS } from "../constants/memberIcons";
import { MemberIcon } from "../components/ui/MemberIcon";
import { supabase } from "../config/supabase";

const webInviteBase = "https://choresnest.com/invite";
const INVITE_FUNCTION_NAME = "invite-user";

type InviteStatus = "loading" | "valid" | "expired" | "invalid" | "error";

export interface InviteOnboardingScreenProps {
  slug: string;
  onComplete?: () => void;
}

export const InviteOnboardingScreen: React.FC<InviteOnboardingScreenProps> = ({
  slug,
  onComplete,
}) => {
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [isOffline, setIsOffline] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<InviteStatus>("loading");
  const [inviteMessage, setInviteMessage] = useState<string>("");
  const [inviteProfileId, setInviteProfileId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatar, setAvatar] = useState(MEMBER_ICON_OPTIONS[0]);
  const [selectedColor, setSelectedColor] = useState(PROFILE_COLORS[0]);

  const webInviteUrl = `${webInviteBase}/${slug}`;

  useEffect(() => {
    NetInfo.fetch().then(state => {
      setIsOffline(!state.isConnected);
    });
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOffline) {
      setInviteStatus("loading");
      return;
    }

    let isActive = true;
    const validateInvite = async () => {
      try {
        setInviteStatus("loading");
        const { data, error } = await supabase.functions.invoke(INVITE_FUNCTION_NAME, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "validate", inviteId: slug }),
        });
        if (!isActive) return;
        if (error) {
          const message = (error?.message as string) || "Unable to verify invite.";
          setInviteStatus("invalid");
          setInviteMessage(message);
          return;
        }
        const payload = data as Record<string, any>;
        if (!payload?.valid) {
          const errorKey = payload?.error;
          setInviteStatus(errorKey === "expired" ? "expired" : "invalid");
          setInviteMessage(payload?.message || errorKey || "This invite is no longer valid.");
          return;
        }
        setInviteStatus("valid");
        setInviteProfileId(payload?.profileId ?? null);
      } catch (error) {
        console.error("Invite validation failed", error);
        if (!isActive) return;
        setInviteStatus("error");
        setInviteMessage("Unable to verify invite. Please try again later.");
      }
    };

    validateInvite();
    return () => {
      isActive = false;
    };
  }, [isOffline, slug]);

  const canSubmit =
    !isOffline &&
    inviteStatus === "valid" &&
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    password === confirmPassword;

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke(INVITE_FUNCTION_NAME, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accept",
          inviteId: slug,
          name: name.trim(),
          email: email.trim(),
          password,
          avatar,
          color: selectedColor.value,
          profileId: inviteProfileId,
        }),
      });

      if (error || !data?.success) {
        const message = (error?.message as string) || data?.error || "Unable to accept invite.";
        showToast({
          type: "error",
          title: "Invite Failed",
          description: message,
        });
        return;
      }

      showToast({
        type: "success",
        title: "Welcome to Chores Nest",
        description: "Your account has been created.",
      });

      const signedIn = await login(email.trim(), password);
      if (signedIn && onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Invite acceptance error", error);
      showToast({
        type: "error",
        title: "Invite Failed",
        description: "Something went wrong while creating your account.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStatusText = () => {
    if (isOffline) {
      return "Please open your internet connection and wait while we check the invite.";
    }
    if (inviteStatus === "loading") {
      return "Checking invite…";
    }
    if (inviteStatus === "expired") {
      return inviteMessage || "Invite is expired. Ask your family member to send a new one.";
    }
    if (inviteStatus === "invalid" || inviteStatus === "error") {
      return inviteMessage;
    }
    return undefined;
  };

  const statusText = renderStatusText();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}> 
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}> 
          <Text style={[styles.title, { color: colors.foreground }]}>Join Chores Nest</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Activate the invite to join your family's workspace.</Text>
          <Text style={[styles.url, { color: colors.primary }]}>{webInviteUrl}</Text>
          {statusText && (
            <Text style={[styles.statusText, { color: colors.danger }]}>{statusText}</Text>
          )}
        </View>

        <View style={[styles.form, { borderColor: colors.border, backgroundColor: colors.card }]}> 
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Full name"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
          />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Create password"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
          />
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm password"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
          />
          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Avatar</Text>
          <View style={styles.iconRow}>
            {MEMBER_ICON_OPTIONS.map(icon => {
              const active = avatar === icon;
              return (
                <Pressable
                  key={icon}
                  onPress={() => setAvatar(icon)}
                  style={[styles.iconOption, active && { borderColor: colors.primary, borderWidth: 2 }]}
                >
                  <MemberIcon symbol={icon} size={28} color={active ? colors.primary : colors.foreground} />
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Profile color</Text>
          <View style={styles.colorRow}>
            {PROFILE_COLORS.map(colorOption => {
              const isSelected = selectedColor.value === colorOption.value;
              return (
                <Pressable
                  key={colorOption.id}
                  onPress={() => setSelectedColor(colorOption)}
                  style={[styles.colorOption, { backgroundColor: colorOption.hex, borderColor: isSelected ? colors.primary : 'transparent' }]}
                >
                  {isSelected && <Text style={styles.colorCheck}>✓</Text>}
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit || isSubmitting || inviteStatus !== "valid" || isOffline}
            style={({ pressed }) => [
              styles.submitButton,
              {
                backgroundColor: canSubmit ? colors.primary : colors.border,
              },
              pressed && canSubmit && { opacity: 0.8 },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Create account and join</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 32,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  url: {
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '500',
  },
  statusText: {
    fontSize: 14,
  },
  form: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  iconOption: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCheck: {
    color: '#fff',
    fontWeight: '700',
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
