import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
  Dimensions,
} from "react-native";

import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";
import { AppIcon } from "../ui/AppIcon";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.5;

interface ManualInviteModalProps {
  open: boolean;
  onClose: () => void;
}

export const ManualInviteModal: React.FC<ManualInviteModalProps> = ({ open, onClose }) => {
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setError("");
    }
  }, [open]);

  const handleSend = () => {
    if (!name.trim() || !email.trim()) {
      setError("Please provide both name and email.");
      return;
    }

    Alert.alert(
      "Invite sent",
      `${name.trim()} will receive an invite at ${email.trim()}.`,
    );
    onClose();
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              shadowColor: colors.shadow,
              borderRadius: radius.xl,
            },
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.headerRow}>
            <Text style={[styles.heading, { color: colors.foreground }]}>Invite manually</Text>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.6 }]}> 
              <AppIcon name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>Enter the name and email address you want to send the invite to.</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Full name"
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.input,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                color: colors.foreground,
              },
            ]}
          />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[
              styles.input,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                color: colors.foreground,
                marginTop: 10,
              },
            ]}
          />
          {error ? <Text style={{ color: colors.danger, marginTop: 6 }}>{error}</Text> : null}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: colors.primary,
                borderRadius: radius.md,
              },
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleSend}
          >
            <Text style={[styles.buttonText, { color: colors.background }]}>Send invite</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    maxHeight: MODAL_HEIGHT,
    padding: 18,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  closeButton: {
    padding: 4,
    borderRadius: 999,
  },
  input: {
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    borderRadius: 12,
  },
  button: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
