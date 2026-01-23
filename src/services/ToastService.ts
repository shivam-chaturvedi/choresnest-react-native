export type ToastType = "default" | "warning" | "success";

export interface ToastRequest {
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
}

let toastHandler: ((options: ToastRequest) => void) | null = null;

export const registerToastHandler = (handler: ((options: ToastRequest) => void) | null) => {
  toastHandler = handler;
};

export const toastService = {
  showToast: (options: ToastRequest) => {
    if (toastHandler) {
      toastHandler(options);
    } else {
      console.warn('Toast handler not registered, skipping:', options.title);
    }
  },
};
