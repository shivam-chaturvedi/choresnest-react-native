import { NativeModules } from "react-native";

type BiometricLifecycleNativeModule = {
  shouldShowBiometric: () => boolean;
  markBiometricShown: () => void;
};

const nativeModule = NativeModules as {
  BiometricLifecycle?: BiometricLifecycleNativeModule;
};

export const shouldShowBiometricOnStartup = (): boolean => {
  return nativeModule.BiometricLifecycle?.shouldShowBiometric?.() ?? false;
};

export const markBiometricPromptShown = (): void => {
  nativeModule.BiometricLifecycle?.markBiometricShown?.();
};
