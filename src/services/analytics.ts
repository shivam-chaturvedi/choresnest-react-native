import analytics from '@react-native-firebase/analytics';

type AuthMethod = 'guest' | 'google' | 'email';

const logEvent = async (event: string, params: Record<string, any> = {}) => {
  try {
    await analytics().logEvent(event, params);
  } catch (error) {
    console.log('Analytics event failed:', error);
  }
};

export const trackScreen = async (screen: string) => {
  try {
    await analytics().logScreenView({
      screen_name: screen,
      screen_class: screen,
    });
  } catch (error) {
    console.log('Screen tracking failed:', error);
  }
};

export const trackAuthMethodUsage = async (
  method: AuthMethod,
  flow: 'login' | 'signup',
) => {
  await logEvent('auth_method_used', { method, flow });
};

export const trackGuestModeEngaged = async () => {
  await logEvent('guest_mode_engaged');
};

export const trackForgotPasswordClicked = async () => {
  await logEvent('forgot_password_clicked');
};

export const setUserProperty = async (property: string, value: string) => {
  try {
    await analytics().setUserProperty(property, value);
  } catch (error) {
    console.log('User property update failed:', error);
  }
};
