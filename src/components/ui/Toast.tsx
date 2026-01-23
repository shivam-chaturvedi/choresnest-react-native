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
import { StyleSheet, Text, View } from "react-native";

import { registerToastHandler, ToastRequest, ToastType } from "../../services/ToastService";
import { theme } from "../../theme";

interface ActiveToast extends ToastRequest {
  id: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  showToast: (options: ToastRequest) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const DEFAULT_DURATION = 4000;

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (options: ToastRequest) => {
      const id = options.id ?? `${Date.now()}-${Math.random()}`;
      const type = options.type ?? "default";
      const duration = options.duration ?? DEFAULT_DURATION;
      const toast: ActiveToast = { ...options, id, type, duration };

      setToasts((prev) => [...prev, toast]);
      const timer = timers.current.get(id);
      if (timer) {
        clearTimeout(timer);
      }

      timers.current.set(
        id,
        setTimeout(() => {
          removeToast(id);
        }, duration)
      );
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
      <View style={styles.portal} pointerEvents="box-none">
        {toasts.map((toast) => (
          <View
            key={toast.id}
            style={[
              styles.toast,
              toast.type === "warning"
                ? styles.toastWarning
                : toast.type === "success"
                ? styles.toastSuccess
                : styles.toastDefault,
            ]}
          >
            <Text style={styles.title}>{toast.title}</Text>
            {toast.description ? <Text style={styles.description}>{toast.description}</Text> : null}
          </View>
        ))}
      </View>
    </ToastContext.Provider>
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
    bottom: 24,
    right: 0,
    left: 0,
    alignItems: "center",
    pointerEvents: "none",
    paddingHorizontal: theme.spacing.md,
  },
  toast: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  toastDefault: {
    backgroundColor: "rgba(12, 17, 43, 0.95)",
  },
  toastWarning: {
    backgroundColor: "#c76b18",
  },
  toastSuccess: {
    backgroundColor: theme.colors.success,
  },
  title: {
    color: "#fff",
    fontWeight: "600",
    marginBottom: 4,
  },
  description: {
    color: "#fff",
    fontSize: 13,
    lineHeight: 18,
  },
});
