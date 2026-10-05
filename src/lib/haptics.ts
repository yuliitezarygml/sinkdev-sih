// Haptic feedback utility for mobile touch interactions
export function triggerHaptic(type: 'light' | 'medium' | 'success' | 'warning' | 'error' = 'light') {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) {
    return;
  }

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(15);
        break;
      case 'medium':
        navigator.vibrate(30);
        break;
      case 'success':
        navigator.vibrate([20, 40, 30]);
        break;
      case 'warning':
        navigator.vibrate([40, 40, 40]);
        break;
      case 'error':
        navigator.vibrate([50, 50, 80]);
        break;
    }
  } catch {
    // Ignore vibrations blocked by browser policies
  }
}
