import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
} from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useThemeColors, useThemeRadius, useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../components/ui/Toast";
import { PROFILE_COLORS } from "../constants/profileColors";
import { MEMBER_ICON_OPTIONS } from "../constants/memberIcons";
import { MemberIcon } from "../components/ui/MemberIcon";
import { supabase } from "../config/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";

const webInviteBase = "https://choresnest.com/invite";
const INVITE_FUNCTION_NAME = "invite-user";

type InviteStatus =
  | "loading"
  | "valid"
  | "expired"
  | "invalid"
  | "error"
  | "already_used";

const parseEdgeFunctionPayload = (
  raw?: string | null,
): Record<string, any> | null => {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getMessageForStatus = (status: InviteStatus): string => {
  switch (status) {
    case "expired":
      return "This invite has already expired. Ask your family administrator to send a fresh link.";
    case "already_used":
      return "This invite has already been used. Ask your family administrator or another member to send a new link.";
    case "invalid":
      return "This invite could not be verified. Ask your family member for help.";
    default:
      return "";
  }
};

const mapPayloadToStatus = (
  payload: Record<string, any> | null,
): { status: InviteStatus; message: string } | null => {
  if (!payload) {
    return null;
  }
  if (payload.valid === false) {
    const errorKey = payload.error;
    let status: InviteStatus = "invalid";
    if (errorKey === "expired") {
      status = "expired";
    } else if (errorKey === "already_used") {
      status = "already_used";
    }
    const message = payload.message || getMessageForStatus(status);
    return { status, message };
  }
  return null;
};

const extractFunctionErrorMessage = async (
  error: unknown,
  data?: { error?: string },
): Promise<string | null> => {
  if (data?.error) {
    return data.error;
  }

  if (!error) {
    return null;
  }

  if (error instanceof FunctionsHttpError) {
    try {
      const payload = await error.context.json();
      if (payload && typeof payload === "object") {
        if (typeof payload.error === "string") {
          return payload.error;
        }
        if (typeof payload.message === "string") {
          return payload.message;
        }
      }
    } catch (parseError) {
      console.warn("InviteOnboarding: failed to parse function error body", parseError);
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

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
  const { appearanceMode } = useTheme();
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
  const [inviteErrorModalVisible, setInviteErrorModalVisible] = useState(false);
  const [inviteErrorTitle, setInviteErrorTitle] = useState("");
  const [inviteErrorDescription, setInviteErrorDescription] = useState("");

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

    setInviteErrorModalVisible(false);

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
          const parsed =
            mapPayloadToStatus(parseEdgeFunctionPayload(error?.details ?? null));
          if (parsed) {
            setInviteStatus(parsed.status);
            setInviteMessage(parsed.message);
            return;
          }
          setInviteStatus("invalid");
          setInviteMessage(getMessageForStatus("invalid"));
          return;
        }
        const payload = data as Record<string, any>;
        const parsed = mapPayloadToStatus(payload);
        if (parsed) {
          setInviteStatus(parsed.status);
          setInviteMessage(parsed.message);
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

  useEffect(() => {
    if (inviteStatus === "expired") {
      setInviteErrorTitle("Invite expired");
      setInviteErrorDescription(
        "This invite has already expired. Ask your family administrator to send a fresh link."
      );
      setInviteErrorModalVisible(true);
    } else if (inviteStatus === "already_used") {
      setInviteErrorTitle("Invite already used");
      setInviteErrorDescription(
        "This invite has already been used. Ask your family administrator or another member to send a new link."
      );
      setInviteErrorModalVisible(true);
    } else if (inviteStatus === "invalid") {
      setInviteErrorTitle("Invalid invite");
      setInviteErrorDescription(
        inviteMessage || "This invite could not be verified. Ask your family member for help."
      );
      setInviteErrorModalVisible(true);
    }
  }, [inviteStatus, inviteMessage]);

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
        const message =
          (await extractFunctionErrorMessage(error, data)) || "Unable to accept invite.";
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
      if (signedIn) {
        try {
          const { ProfileService } = await import("../services/ProfileService");
          let checks = 0;
          let pid = await ProfileService.getActiveProfileId();
          while (!pid && checks < 20) {
            await new Promise(r => setTimeout(r, 200));
            pid = await ProfileService.getActiveProfileId();
            checks++;
          }
          const { SyncService } = await import("../services/SyncService");
          await SyncService.forceFullSync();
        } catch (error) {
          console.error("InviteOnboarding: failed to sync after login", error);
        }
        if (onComplete) {
          onComplete();
        }
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
      <Modal visible={inviteErrorModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {inviteErrorTitle}
            </Text>
            <Text
              style={[styles.modalDescription, { color: colors.mutedForeground }]}
            >
              {inviteErrorDescription}
            </Text>
            <Pressable
              onPress={() => setInviteErrorModalVisible(false)}
              style={({ pressed }) => [
                styles.modalButton,
                { borderColor: colors.primary },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[styles.modalButtonText, { color: colors.primary }]}>
                Got it
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}> 
          <Text style={[styles.title, { color: colors.foreground }]}>Join Chores Nest</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Activate the invite to join your family's workspace.
          </Text>
          <Text
            style={[
              styles.url,
              {
                color:
                  appearanceMode === "midnight"
                    ? colors.successLight
                    : colors.primary,
              },
            ]}
          >
            {webInviteUrl}
          </Text>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '80%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
