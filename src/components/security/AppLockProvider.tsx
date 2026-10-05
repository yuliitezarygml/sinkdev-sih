'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getSecurityStatus, unlockVault, unlockVaultBiometric, lockVault, isTauri } from '@/lib/tauri';
import { triggerHaptic } from '@/lib/haptics';

interface SecurityContextType {
  isLocked: boolean;
  isPinSet: boolean;
  refreshSecurity: () => Promise<void>;
  lockNow: () => Promise<void>;
}

const SecurityContext = createContext<SecurityContextType>({
  isLocked: false,
  isPinSet: false,
  refreshSecurity: async () => {},
  lockNow: async () => {},
});

export const useSecurity = () => useContext(SecurityContext);

export const AppLockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [isPinSet, setIsPinSet] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const autoLockTimerRef = useRef<NodeJS.Timeout | null>(null);

  const refreshSecurity = useCallback(async () => {
    try {
      const status = await getSecurityStatus();
      setIsPinSet(status.is_pin_set);
      setIsLocked(status.is_locked);
      setBiometricEnabled(status.biometric_enabled);
    } catch (err) {
      console.error('Failed to load security status:', err);
    }
  }, []);

  const lockNow = useCallback(async () => {
    try {
      await lockVault();
      setIsLocked(true);
      setPinInput('');
      setErrorMsg('');
    } catch (err) {
      console.error('Failed to lock vault:', err);
    }
  }, []);

  // Initial check
  useEffect(() => {
    refreshSecurity();
  }, [refreshSecurity]);

  // Background lock listener
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        const status = await getSecurityStatus();
        if (status.is_pin_set && status.lock_on_background) {
          lockNow();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [lockNow]);

  // Inactivity auto-lock listener
  const resetInactivityTimer = useCallback(async () => {
    if (autoLockTimerRef.current) {
      clearTimeout(autoLockTimerRef.current);
    }

    const status = await getSecurityStatus();
    if (status.is_pin_set && status.auto_lock_timeout_secs > 0 && !isLocked) {
      autoLockTimerRef.current = setTimeout(() => {
        lockNow();
      }, status.auto_lock_timeout_secs * 1000);
    }
  }, [isLocked, lockNow]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => {
      resetInactivityTimer();
    };

    events.forEach(e => window.addEventListener(e, handleActivity));
    resetInactivityTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
    };
  }, [resetInactivityTimer]);

  // PIN keypad handling
  const handleKeypadPress = (val: string) => {
    triggerHaptic('light');
    if (pinInput.length < 8) {
      const next = pinInput + val;
      setPinInput(next);
      setErrorMsg('');
    }
  };

  const handleBackspace = () => {
    triggerHaptic('medium');
    setPinInput(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleBiometricUnlock = async () => {
    try {
      triggerHaptic('light');
      if (isTauri()) {
        const { authenticate } = await import('@tauri-apps/plugin-biometric');
        await authenticate('Unlock SinkDev Authenticator');
        triggerHaptic('success');
        await unlockVaultBiometric();
        setIsLocked(false);
        setPinInput('');
        setErrorMsg('');
      } else {
        triggerHaptic('success');
        await unlockVaultBiometric();
        setIsLocked(false);
        setPinInput('');
        setErrorMsg('');
      }
    } catch (err: unknown) {
      console.warn('Biometric authentication failed or was cancelled:', err);
    }
  };

  const handleUnlockSubmit = async (pinToTry?: string) => {
    const pin = pinToTry || pinInput;
    if (!pin) return;
    setIsVerifying(true);
    setErrorMsg('');
    try {
      const success = await unlockVault(pin);
      if (success) {
        triggerHaptic('success');
        setIsLocked(false);
        setPinInput('');
        setErrorMsg('');
      } else {
        triggerHaptic('error');
        setErrorMsg('Incorrect PIN. Please try again.');
        setPinInput('');
      }
    } catch (err) {
      triggerHaptic('error');
      setErrorMsg(String(err));
      setPinInput('');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <SecurityContext.Provider value={{ isLocked, isPinSet, refreshSecurity, lockNow }}>
      {children}

      {/* Lock Screen Overlay */}
      {isLocked && (
        <div className="fixed inset-0 z-50 bg-[#171a21] flex flex-col items-center justify-between p-6 select-none animate-in fade-in duration-200">
          {/* Top Logo & Message */}
          <div className="pt-12 flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-[#1b2838] border border-[#2a475e] flex items-center justify-center text-[#66c0f4] shadow-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">SinkDev Authenticator</h2>
              <p className="text-xs text-[#8f98a0] mt-1 font-mono">ENCRYPTED VAULT LOCKED</p>
            </div>
            <p className="text-xs text-[#c7d5e0] max-w-xs pt-2">
              Enter your master PIN to access Steam Guard and 2FA authentication codes.
            </p>

            {/* PIN Dots Display */}
            <div className="flex items-center space-x-3 pt-4">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full border transition-all ${
                    pinInput.length > i
                      ? 'bg-[#66c0f4] border-[#66c0f4] scale-110 shadow-[0_0_8px_rgba(102,192,244,0.8)]'
                      : 'bg-[#121c27] border-[#2a475e]'
                  }`}
                />
              ))}
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 font-medium pt-2 animate-bounce">
                {errorMsg}
              </p>
            )}
          </div>

          {/* Keypad */}
          <div className="w-full max-w-xs pb-8 space-y-3">
            {biometricEnabled && (
              <button
                onClick={handleBiometricUnlock}
                className="w-full py-2.5 px-4 rounded-2xl bg-[#1b2838] border border-[#2a475e] hover:border-[#1a9fff] text-[#66c0f4] text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 11c0 3-1 6-4 8"/>
                  <path d="M16 11c0 5-2 9-6 11"/>
                  <path d="M8 11c0-2.5 1.8-4.5 4-4.5s4 2 4 4.5"/>
                  <path d="M4 11c0-4.4 3.6-8 8-8s8 3.6 8 8"/>
                </svg>
                <span>Unlock with Fingerprint</span>
              </button>
            )}

            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  onClick={() => handleKeypadPress(num)}
                  disabled={isVerifying}
                  className="h-14 rounded-2xl bg-[#1b2838] border border-[#2a475e] hover:bg-[#2a475e] active:scale-95 text-white text-xl font-bold font-mono transition-all shadow-md flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={handleBackspace}
                className="h-14 rounded-2xl bg-[#121c27] border border-[#2a475e] hover:bg-[#1b2838] active:scale-95 text-[#8f98a0] hover:text-white transition-all shadow-md flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
                  <line x1="18" y1="9" x2="12" y2="15"/>
                  <line x1="12" y1="9" x2="18" y2="15"/>
                </svg>
              </button>
              <button
                onClick={() => handleKeypadPress('0')}
                disabled={isVerifying}
                className="h-14 rounded-2xl bg-[#1b2838] border border-[#2a475e] hover:bg-[#2a475e] active:scale-95 text-white text-xl font-bold font-mono transition-all shadow-md flex items-center justify-center"
              >
                0
              </button>
              <button
                onClick={() => handleUnlockSubmit()}
                disabled={pinInput.length < 4 || isVerifying}
                className={`h-14 rounded-2xl border active:scale-95 font-bold transition-all shadow-md flex items-center justify-center ${
                  pinInput.length >= 4
                    ? 'bg-[#5c7e10] hover:bg-[#6c9513] border-[#5c7e10] text-white shadow-[0_0_12px_rgba(92,126,16,0.5)]'
                    : 'bg-[#121c27] border-[#2a475e] text-[#8f98a0] opacity-50 cursor-not-allowed'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </SecurityContext.Provider>
  );
};
