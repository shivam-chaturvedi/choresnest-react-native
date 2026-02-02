import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, Text, View, Animated, Easing } from "react-native";

import { registerToastHandler, ToastRequest, ToastType } from "../../services/ToastService";
import { NotificationCenter } from "../../services/NotificationCenter";
import { theme } from "../../theme";
import { AppIcon } from "./AppIcon";

export interface ActiveToast extends ToastRequest {
  id: string;
  type: ToastType;
  duration: number;
  anim: Animated.Value;
}

interface ToastContextValue {
  showToast: (options: ToastRequest) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const DEFAULT_DURATION = 4000;
const ENABLE_TOAST_OVERLAY = true;

const getToastConfig = (type: ToastType) => {
  switch (type) {
    case 'success':
      return {
        icon: 'check',
        color: theme.colors.success,
        bg: theme.colors.success + '15',
        border: theme.colors.success + '30',
      };
    case 'warning':
      return {
        icon: 'alert',
        color: theme.colors.warning,
        bg: theme.colors.warning + '15',
        border: theme.colors.warning + '30',
      };
    case 'error':
      return {
        icon: 'alertCircle',
        color: theme.colors.danger,
        bg: theme.colors.danger + '15',
        border: theme.colors.danger + '30',
      };
    default:
      return {
        icon: 'info',
        color: theme.colors.primary,
        bg: theme.colors.card,
        border: theme.colors.border,
      };
  }
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => {
      const toast = prev.find(t => t.id === id);
      if (toast) {
        Animated.timing(toast.anim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }).start(() => {
          setToasts((current) => current.filter((t) => t.id !== id));
        });
        // We keep it in the array until animation finishes, but for simplicity of state vs visual sync 
        // in this recursive update pattern, we might want to just let the animation run effectively 
        // by handling "exiting" state. 
        // However, a simpler approach for this list:
        // Trigger exit animation, then actually remove from state.
        // For now, let's just remove it for instant react responsiveness found in typical toast implementations 
        // or defer removal.
        // BETTER APPROACH: Just filter it out immediately to update state? 
        // No, we want animation. 
        // Correct way: The item is removed from the "active" list but maybe we need a component that handles its own entry/exit.
      }
      return prev.filter((t) => t.id !== id);
    });

    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  // To support exit animations properly in a simple array, we'd need a separate component for each Toast item
  // that handles its own lifecycle. Let's do that below (ToastItem).

  const showToast = useCallback(
    (options: ToastRequest) => {
      const id = options.id ?? `${Date.now()}-${Math.random()}`;
      const type = options.type ?? "default";
      const duration = options.duration ?? DEFAULT_DURATION;

      // Check if toast with same title already exists to prevent duplicates
      setToasts(prev => {
        const exists = prev.find(t => t.title === options.title);
        if (exists) return prev;

        return [...prev, {
          ...options,
          id,
          type,
          duration,
          anim: new Animated.Value(0) // Start validation at 0 (hidden/scaled down)
        }];
      });

      // Timer cleanup
      const timer = timers.current.get(id);
      if (timer) clearTimeout(timer);

      timers.current.set(
        id,
        setTimeout(() => {
          removeToast(id);
        }, duration)
      );

      // Also send to OS notification center if needed (optional)
      // NotificationCenter.addNotification(...) 
    },
    [removeToast]
  );

  useEffect(() => {
    registerToastHandler(showToast);
    return () => {
      registerToastHandler(null);
      timers.current.forEach((timer) => clearTimeout(timer));
      timers.current.clear();
    };
  }, [showToast]);

  const value = useMemo(
    () => ({
      showToast,
      hideToast: removeToast,
    }),
    [removeToast, showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {ENABLE_TOAST_OVERLAY && (
        <View style={styles.portal} pointerEvents="box-none">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
          ))}
        </View>
      )}
    </ToastContext.Provider>
  );
};

export const ToastItem = ({ toast, onDismiss }: { toast: ActiveToast, onDismiss: () => void }) => {
  useEffect(() => {
    Animated.spring(toast.anim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 8
    }).start();
  }, []);

  const config = getToastConfig(toast.type);

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        {
          opacity: toast.anim,
          transform: [
            { translateY: toast.anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) },
            { scale: toast.anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }
          ]
        }
      ]}
    >
      <View style={[styles.toastContainer, {
        backgroundColor: theme.colors.card,
        borderColor: config.border,
        borderLeftWidth: 4,
        borderLeftColor: config.color
      }]}>
        <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
          <AppIcon name={config.icon as any} size={24} color={config.color} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.colors.foreground }]}>{toast.title}</Text>
          {toast.description ? (
            <Text style={[styles.description, { color: theme.colors.mutedForeground }]}>{toast.description}</Text>
          ) : null}
        </View>
        <View style={styles.dismissContainer} onTouchEnd={onDismiss}>
          <AppIcon name="x" size={16} color={theme.colors.mutedForeground} />
        </View>
      </View>
    </Animated.View>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

const styles = StyleSheet.create({
  portal: {
    position: "absolute",
    top: 50, // Top positioning is usually better for mobile toasts/notifications
    right: 0,
    left: 0,
    alignItems: "center",
    zIndex: 9999,
    elevation: 9999,
  },
  toastWrapper: {
    width: '90%',
    maxWidth: 400,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'white',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  dismissContainer: {
    padding: 8,
    marginLeft: 4,
  }
});
