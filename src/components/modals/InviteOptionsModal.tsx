import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  Alert,
  Dimensions,
} from "react-native";

import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";
import { useFamily } from "../../contexts/FamilyContext";
import { InviteService } from "../../services/InviteService";
import { AppIcon } from "../ui/AppIcon";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.48;
const INVITE_DOMAIN = "https://choresnest.com/invite";

interface InviteOptionsModalProps {
  open: boolean;
  onClose: () => void;
  onInviteManually: () => void;
  onCreateChildAccount: () => void;
}

export const InviteOptionsModal: React.FC<InviteOptionsModalProps> = ({
  open,
  onClose,
  onInviteManually,
  onCreateChildAccount,
}) => {
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const { profileId } = useFamily();
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleShareLink = async () => {
    if (!profileId) {
      Alert.alert("Profile missing", "Please finish setting up your family profile before inviting.");
      return;
    }

    setIsCreating(true);
    try {
      const invite = await InviteService.createInvite(profileId, profileId);
      const generatedLink = `${INVITE_DOMAIN}/${invite.id}`;
      setInviteLink(generatedLink);
      const result = await Share.share({
        title: "Chores Nest invite",
        message: `Join my family on Chores Nest: ${generatedLink}`,
      });
      if (result.action === Share.sharedAction) {
        onClose();
      }
    } catch (error) {
      console.error("Failed to create invite link:", error);
      Alert.alert("Unable to create invite", "Please try again later.");
    } finally {
      setIsCreating(false);
    }
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
            <Text style={[styles.heading, { color: colors.foreground }]}>Invite family and friends</Text>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.6 }]}> 
              <AppIcon name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>Choose how you want to bring loved ones into your family space.</Text>
          <View style={styles.optionsContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.optionCard,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                },
                pressed && styles.optionPressed,
                isCreating && styles.optionDisabled,
              ]}
              onPress={handleShareLink}
              disabled={isCreating}
            >
              <Text style={[styles.optionTitle, { color: colors.foreground }]}>Invite via link</Text>
              <Text style={[styles.optionSubtitle, { color: colors.mutedForeground }]}>Share a link instantly.</Text>
              <Text
                style={[styles.linkText, { color: colors.primary }]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {inviteLink ?? (isCreating ? "Generating link..." : "Tap to create share link")}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.optionCard,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                },
                pressed && styles.optionPressed,
              ]}
              onPress={onInviteManually}
            >
              <Text style={[styles.optionTitle, { color: colors.foreground }]}>Invite manually</Text>
              <Text style={[styles.optionSubtitle, { color: colors.mutedForeground }]}>Send a personalized email.</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.optionCard,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                },
                pressed && styles.optionPressed,
              ]}
              onPress={onCreateChildAccount}
            >
              <Text style={[styles.optionTitle, { color: colors.foreground }]}>Create child account</Text>
              <Text style={[styles.optionSubtitle, { color: colors.mutedForeground }]}>Set up a profile for someone under 13.</Text>
            </Pressable>
          </View>
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
    paddingVertical: 20,
    paddingHorizontal: 18,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  closeButton: {
    padding: 4,
    borderRadius: 999,
  },
  optionsContainer: {
    marginBottom: 8,
  },
  optionCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  optionPressed: {
    opacity: 0.7,
  },
  optionDisabled: {
    opacity: 0.6,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  optionSubtitle: {
    fontSize: 13,
    marginTop: 4,
    opacity: 0.8,
  },
  linkText: {
    marginTop: 6,
    fontSize: 12,
  },
});
