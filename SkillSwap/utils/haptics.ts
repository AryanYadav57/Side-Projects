import { Vibration, Platform } from 'react-native';

/**
 * Light haptic - for general button taps
 */
export const hapticLight = () => {
  if (Platform.OS === 'android') {
    Vibration.vibrate(30);
  }
};

/**
 * Medium haptic - for selections, toggles
 */
export const hapticMedium = () => {
  if (Platform.OS === 'android') {
    Vibration.vibrate(60);
  }
};

/**
 * Heavy haptic - for success, sending messages, form submit
 */
export const hapticSuccess = () => {
  if (Platform.OS === 'android') {
    Vibration.vibrate([0, 40, 60, 40]);
  }
};

/**
 * Error haptic - for errors or warnings
 */
export const hapticError = () => {
  if (Platform.OS === 'android') {
    Vibration.vibrate([0, 80, 100, 80]);
  }
};
