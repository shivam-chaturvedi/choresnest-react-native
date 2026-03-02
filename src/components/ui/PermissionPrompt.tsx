import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { PermissionType } from '../../types/Permissions';

interface PermissionPromptOptions {
  type: PermissionType;
  message?: string;
  onCancel?: () => void;
  onOpenSettings?: () => void;
  onDontShowAgain?: () => void;
}

let promptHandler: ((options: PermissionPromptOptions) => void) | null = null;
let pendingPrompt: PermissionPromptOptions | null = null;

export const registerPermissionPrompt = (handler: (options: PermissionPromptOptions) => void) => {
  promptHandler = handler;
  if (pendingPrompt) {
    handler(pendingPrompt);
    pendingPrompt = null;
  }
  return () => {
    if (promptHandler === handler) {
      promptHandler = null;
    }
  };
};

export const showPermissionPrompt = (options: PermissionPromptOptions) => {
  if (promptHandler) {
    promptHandler(options);
  } else {
    pendingPrompt = options;
  }
};

export const PermissionPromptRenderer: React.FC = () => {
  const [options, setOptions] = useState<PermissionPromptOptions | null>(null);

  useEffect(() => {
    const unregister = registerPermissionPrompt(setOptions);
    return () => unregister();
  }, []);

  const handleCancel = () => {
    options?.onCancel?.();
    setOptions(null);
  };

  const handleOpenSettings = () => {
    options?.onOpenSettings?.();
    setOptions(null);
  };

  const handleDontShowAgain = () => {
    options?.onDontShowAgain?.();
    setOptions(null);
  };

  if (!options) {
    return null;
  }

  return (
    <Modal transparent visible animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Permission Required</Text>
          <Text style={styles.message}>
            {options.message ?? 'This feature requires permission to continue. Please update your settings.'}
          </Text>
          <View style={styles.actionsRow}>
            <Pressable style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.settingsButton]} onPress={handleOpenSettings}>
              <Text style={[styles.buttonText, styles.settingsText]}>Open Settings</Text>
            </Pressable>
          </View>
          <Pressable style={styles.dontShowButton} onPress={handleDontShowAgain}>
            <Text style={styles.dontShowText}>Don't show again</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#444',
    marginBottom: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  cancelButton: {
    marginRight: 10,
  },
  settingsButton: {
    backgroundColor: '#0b71eb',
    borderColor: '#0b71eb',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingsText: {
    color: '#fff',
  },
  dontShowButton: {
    marginTop: 14,
    alignItems: 'center',
  },
  dontShowText: {
    fontSize: 13,
    color: '#0b71eb',
    fontWeight: '600',
  },
});
