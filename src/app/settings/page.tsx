'use client';

import React, { useEffect, useState } from 'react';
import {
  getSecurityStatus,
  setupPin,
  changePin,
  removePin,
  updateSecuritySettings,
  checkSystemTime,
  exportEncryptedVault,
  importEncryptedVault,
} from '@/lib/tauri';
import { SecurityStatus, TimeDriftResult, BackupRestoreSummary } from '@/lib/types';
import { useSecurity } from '@/components/security/AppLockProvider';
import { usePreferences } from '@/components/providers/AppPreferencesProvider';
import { Modal } from '@/components/ui/Modal';
import { triggerHaptic } from '@/lib/haptics';

export default function SettingsPage() {
  const { refreshSecurity, lockNow } = useSecurity();
  const { language, setLanguage, theme, setTheme, isPrivacyMode, togglePrivacyMode, t } = usePreferences();
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [timeResult, setTimeResult] = useState<TimeDriftResult | null>(null);
  const [checkingTime, setCheckingTime] = useState(false);

  // PIN modals
  const [showSetupPinModal, setShowSetupPinModal] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [showRemovePinModal, setShowRemovePinModal] = useState(false);

  // Backup & Restore states
  const [showExportModal, setShowExportModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [backupPass, setBackupPass] = useState('');
  const [backupPassConfirm, setBackupPassConfirm] = useState('');
  const [restorePass, setRestorePass] = useState('');
  const [restoreData, setRestoreData] = useState('');
  const [restoreMerge, setRestoreMerge] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');
  const [restoreMsg, setRestoreMsg] = useState('');
  const [restoreSummary, setRestoreSummary] = useState<BackupRestoreSummary | null>(null);

  // Form states
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadStatus = async () => {
    try {
      const s = await getSecurityStatus();
      setStatus(s);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleTimeCheck = async () => {
    triggerHaptic('light');
    setCheckingTime(true);
    try {
      const res = await checkSystemTime();
      setTimeResult(res);
      triggerHaptic(res.is_drift_detected ? 'warning' : 'success');
    } catch (err) {
      console.error('Time check failed:', err);
    } finally {
      setCheckingTime(false);
    }
  };

  const handleUpdateTimeout = async (secs: number) => {
    if (!status) return;
    triggerHaptic('light');
    try {
      await updateSecuritySettings({
        autoLockTimeoutSecs: secs,
        lockOnBackground: status.lock_on_background,
        biometricEnabled: status.biometric_enabled,
        clipboardClearSecs: status.clipboard_clear_secs,
      });
      await loadStatus();
      await refreshSecurity();
    } catch (err) {
      alert(`Error updating settings: ${err}`);
    }
  };

  const handleToggleBackgroundLock = async () => {
    if (!status) return;
    triggerHaptic('medium');
    try {
      await updateSecuritySettings({
        autoLockTimeoutSecs: status.auto_lock_timeout_secs,
        lockOnBackground: !status.lock_on_background,
        biometricEnabled: status.biometric_enabled,
        clipboardClearSecs: status.clipboard_clear_secs,
      });
      await loadStatus();
      await refreshSecurity();
    } catch (err) {
      alert(`Error updating settings: ${err}`);
    }
  };

  const handleUpdateClipboardClear = async (secs: number) => {
    if (!status) return;
    triggerHaptic('light');
    try {
      await updateSecuritySettings({
        autoLockTimeoutSecs: status.auto_lock_timeout_secs,
        lockOnBackground: status.lock_on_background,
        biometricEnabled: status.biometric_enabled,
        clipboardClearSecs: secs,
      });
      await loadStatus();
      await refreshSecurity();
    } catch (err) {
      alert(`Error updating settings: ${err}`);
    }
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length < 4) {
      setErrorMsg('PIN must be at least 4 digits');
      return;
    }
    if (pinInput !== pinConfirm) {
      setErrorMsg('PINs do not match');
      return;
    }
    try {
      await setupPin(pinInput);
      triggerHaptic('success');
      setPinInput('');
      setPinConfirm('');
      setErrorMsg('');
      setShowSetupPinModal(false);
      await loadStatus();
      await refreshSecurity();
    } catch (err) {
      setErrorMsg(String(err));
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length < 4) {
      setErrorMsg('New PIN must be at least 4 digits');
      return;
    }
    if (pinInput !== pinConfirm) {
      setErrorMsg('New PINs do not match');
      return;
    }
    try {
      await changePin(oldPin, pinInput);
      triggerHaptic('success');
      setOldPin('');
      setPinInput('');
      setPinConfirm('');
      setErrorMsg('');
      setShowChangePinModal(false);
      await loadStatus();
      await refreshSecurity();
    } catch (err) {
      setErrorMsg(String(err));
    }
  };

  const handleRemovePin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await removePin(oldPin);
      triggerHaptic('warning');
      setOldPin('');
      setErrorMsg('');
      setShowRemovePinModal(false);
      await loadStatus();
      await refreshSecurity();
    } catch (err) {
      setErrorMsg(String(err));
    }
  };

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (backupPass.length < 6) {
      setBackupMsg('Passphrase must be at least 6 characters');
      return;
    }
    if (backupPass !== backupPassConfirm) {
      setBackupMsg('Passphrases do not match');
      return;
    }

    setBackupLoading(true);
    setBackupMsg('');
    try {
      const payload = await exportEncryptedVault(backupPass);
      triggerHaptic('success');
      // Create download blob
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `sinkdev-vault-backup-${dateStr}.sinkvault`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupMsg('✓ Backup file generated and downloaded successfully!');
      setTimeout(() => {
        setShowExportModal(false);
        setBackupPass('');
        setBackupPassConfirm('');
        setBackupMsg('');
      }, 1500);
    } catch (err) {
      triggerHaptic('error');
      setBackupMsg(String(err));
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setRestoreData(reader.result as string);
      triggerHaptic('light');
    };
    reader.readAsText(file);
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreData.trim()) {
      setRestoreMsg('Please select or paste backup file');
      return;
    }
    if (!restorePass) {
      setRestoreMsg('Please enter backup password');
      return;
    }

    setBackupLoading(true);
    setRestoreMsg('');
    try {
      const summary = await importEncryptedVault(restorePass, restoreData.trim(), restoreMerge);
      triggerHaptic('success');
      setRestoreSummary(summary);
      setRestoreMsg(`✓ ${t.restore_success} (${summary.steam_restored} Steam, ${summary.totp_restored} 2FA)`);
      await loadStatus();
      await refreshSecurity();
      setTimeout(() => {
        setShowRestoreModal(false);
        setRestoreData('');
        setRestorePass('');
        setRestoreMsg('');
        setRestoreSummary(null);
      }, 2000);
    } catch (err) {
      triggerHaptic('error');
      setRestoreMsg(String(err));
    } finally {
      setBackupLoading(false);
    }
  };


  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-wide">{t.settings_title}</h2>
        <p className="text-xs text-[#8f98a0]">
          {t.settings_subtitle}
        </p>
      </div>

      {/* Security Status Card */}
      <div className="bg-[#1b2838] border border-[#2a475e] rounded-2xl p-4 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-inner ${
              status?.is_pin_set ? 'bg-[#5c7e10]/20 text-[#a4d007] border border-[#5c7e10]' : 'bg-[#b7352d]/20 text-rose-400 border border-rose-800'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {status?.is_pin_set ? t.master_pin_active : t.vault_unprotected}
              </h3>
              <p className="text-[11px] text-[#8f98a0]">
                {status?.is_pin_set ? t.master_pin_active_desc : t.vault_unprotected_desc}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1 border-t border-[#2a475e]/60">
          {!status?.is_pin_set ? (
            <button
              onClick={() => {
                triggerHaptic('light');
                setErrorMsg('');
                setShowSetupPinModal(true);
              }}
              className="px-4 py-2 bg-[#5c7e10] hover:bg-[#6c9513] text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
            >
              {t.set_master_pin}
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setErrorMsg('');
                  setShowChangePinModal(true);
                }}
                className="px-3.5 py-2 bg-[#2a475e] hover:bg-[#3b5c77] text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
              >
                {t.change_pin}
              </button>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setErrorMsg('');
                  setShowRemovePinModal(true);
                }}
                className="px-3.5 py-2 bg-[#121c27] hover:bg-[#1b2838] border border-[#2a475e] text-rose-400 text-xs font-semibold rounded-xl transition-all"
              >
                {t.remove_pin}
              </button>
              <button
                onClick={() => {
                  triggerHaptic('warning');
                  lockNow();
                }}
                className="px-3.5 py-2 bg-[#121c27] hover:bg-[#1b2838] border border-[#2a475e] text-[#66c0f4] text-xs font-semibold rounded-xl transition-all ml-auto flex items-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span>{t.lock_vault}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Language & Theme Card */}
      <div className="bg-[#1b2838] border border-[#2a475e] rounded-2xl p-4 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white">Appearance & Language</h3>

        {/* Language Selection */}
        <div className="space-y-1.5">
          <label className="text-xs text-[#c7d5e0] font-medium block">
            {t.language}:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setLanguage('ru')}
              className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                language === 'ru'
                  ? 'bg-[#1a9fff] border-[#1a9fff] text-white shadow-sm'
                  : 'bg-[#121c27] border-[#2a475e] text-[#8f98a0] hover:text-white'
              }`}
            >
              🇷🇺 Русский
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                language === 'en'
                  ? 'bg-[#1a9fff] border-[#1a9fff] text-white shadow-sm'
                  : 'bg-[#121c27] border-[#2a475e] text-[#8f98a0] hover:text-white'
              }`}
            >
              🇺🇸 English
            </button>
          </div>
        </div>

        {/* Theme Selection */}
        <div className="space-y-1.5 pt-2 border-t border-[#2a475e]/60">
          <label className="text-xs text-[#c7d5e0] font-medium block">
            {t.theme}:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTheme('steam')}
              className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                theme === 'steam'
                  ? 'bg-[#1a9fff] border-[#1a9fff] text-white shadow-sm'
                  : 'bg-[#121c27] border-[#2a475e] text-[#8f98a0] hover:text-white'
              }`}
            >
              🎮 {t.steam_dark}
            </button>
            <button
              onClick={() => setTheme('amoled')}
              className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                theme === 'amoled'
                  ? 'bg-[#1a9fff] border-[#1a9fff] text-white shadow-sm'
                  : 'bg-[#121c27] border-[#2a475e] text-[#8f98a0] hover:text-white'
              }`}
            >
              ⬛ {t.amoled_black}
            </button>
          </div>
        </div>

        {/* Privacy Mode toggle in settings */}
        <div className="flex items-center justify-between pt-2 border-t border-[#2a475e]/60">
          <div>
            <p className="text-xs text-white font-medium">{t.privacy_mode_title}</p>
            <p className="text-[11px] text-[#8f98a0]">
              {t.privacy_mode_desc}
            </p>
          </div>
          <button
            onClick={togglePrivacyMode}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              isPrivacyMode ? 'bg-[#1a9fff]' : 'bg-[#121c27] border border-[#2a475e]'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                isPrivacyMode ? 'right-1' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Auto-Lock & Background Lock Settings */}
      {status?.is_pin_set && (
        <div className="bg-[#1b2838] border border-[#2a475e] rounded-2xl p-4 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>{t.lock_behavior}</span>
          </h3>

          {/* Auto-Lock Inactivity */}
          <div className="space-y-1.5">
            <label className="text-xs text-[#c7d5e0] font-medium block">
              {t.auto_lock_inactivity}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '30s', secs: 30 },
                { label: '1 min', secs: 60 },
                { label: '5 min', secs: 300 },
                { label: 'Off', secs: 0 },
              ].map(opt => (
                <button
                  key={opt.secs}
                  onClick={() => handleUpdateTimeout(opt.secs)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                    status.auto_lock_timeout_secs === opt.secs
                      ? 'bg-[#1a9fff] border-[#1a9fff] text-white shadow-sm'
                      : 'bg-[#121c27] border-[#2a475e] text-[#8f98a0] hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lock on background toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-[#2a475e]/60">
            <div>
              <p className="text-xs text-white font-medium">{t.lock_on_background}</p>
              <p className="text-[11px] text-[#8f98a0]">
                {t.lock_on_background_desc}
              </p>
            </div>
            <button
              onClick={handleToggleBackgroundLock}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                status.lock_on_background ? 'bg-[#5c7e10]' : 'bg-[#121c27] border border-[#2a475e]'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  status.lock_on_background ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Clipboard Security */}
      <div className="bg-[#1b2838] border border-[#2a475e] rounded-2xl p-4 shadow-xl space-y-3">
        <div>
          <h3 className="text-sm font-bold text-white">{t.clipboard_protection}</h3>
          <p className="text-[11px] text-[#8f98a0]">
            {t.clipboard_protection_desc}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { label: '15s', secs: 15 },
            { label: '30s', secs: 30 },
            { label: '60s', secs: 60 },
            { label: 'Off', secs: 0 },
          ].map(opt => (
            <button
              key={opt.secs}
              onClick={() => handleUpdateClipboardClear(opt.secs)}
              className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                status?.clipboard_clear_secs === opt.secs
                  ? 'bg-[#1a9fff] border-[#1a9fff] text-white shadow-sm'
                  : 'bg-[#121c27] border-[#2a475e] text-[#8f98a0] hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clock Synchronization Check */}
      <div className="bg-[#1b2838] border border-[#2a475e] rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">{t.clock_verification}</h3>
            <p className="text-[11px] text-[#8f98a0]">
              {t.clock_desc}
            </p>
          </div>
          <button
            onClick={handleTimeCheck}
            disabled={checkingTime}
            className="px-3 py-1.5 bg-[#2a475e] hover:bg-[#325573] text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
          >
            {checkingTime ? (
              <span>{t.checking}</span>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>{t.check_time}</span>
              </>
            )}
          </button>
        </div>

        {timeResult && (
          <div className={`p-3 rounded-xl border text-xs ${
            timeResult.is_drift_detected
              ? 'bg-rose-950/40 border-rose-800 text-rose-300'
              : 'bg-[#121c27] border-emerald-900 text-emerald-400'
          }`}>
            {timeResult.is_drift_detected ? (
              <div className="space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <span>⚠️ {t.clock_drift} ({timeResult.drift_seconds}s drift)</span>
                </p>
                <p className="text-[11px] text-[#8f98a0]">
                  {t.clock_drift_hint}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
                <span>{t.clock_synced}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Backup & Restore Card */}
      <div className="bg-[#1b2838] border border-[#2a475e] rounded-2xl p-4 shadow-xl space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#66c0f4" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{t.backup_restore_title}</span>
          </h3>
          <p className="text-[11px] text-[#8f98a0] mt-1">
            {t.backup_restore_desc}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#2a475e]/60">
          <button
            onClick={() => {
              triggerHaptic('light');
              setBackupMsg('');
              setShowExportModal(true);
            }}
            className="py-2.5 px-3 bg-[#121c27] hover:bg-[#1b2838] border border-[#2a475e] text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>{t.export_backup_btn}</span>
          </button>
          <button
            onClick={() => {
              triggerHaptic('light');
              setRestoreMsg('');
              setRestoreData('');
              setShowRestoreModal(true);
            }}
            className="py-2.5 px-3 bg-[#2a475e] hover:bg-[#3b5c77] text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{t.restore_backup_btn}</span>
          </button>
        </div>
      </div>

      {/* App & Vault Info */}
      <div className="bg-[#121c27] border border-[#2a475e] rounded-2xl p-4 text-xs space-y-2 text-[#8f98a0]">
        <div className="flex justify-between">
          <span>{t.app_version}</span>
          <span className="text-white font-mono">0.1.0-alpha (Android MVP)</span>
        </div>
        <div className="flex justify-between">
          <span>{t.steam_accounts_count}</span>
          <span className="text-white font-mono">{status?.total_steam ?? 0}</span>
        </div>
        <div className="flex justify-between">
          <span>{t.totp_accounts_count}</span>
          <span className="text-white font-mono">{status?.total_totp ?? 0}</span>
        </div>
        <div className="flex justify-between">
          <span>{t.screen_protection}</span>
          <span className="text-[#a4d007] font-semibold">FLAG_SECURE Enabled</span>
        </div>
        <div className="flex justify-between">
          <span>{t.secret_storage}</span>
          <span className="text-[#66c0f4] font-semibold">Rust Safe DTO Memory</span>
        </div>
      </div>

      {/* Setup PIN Modal */}
      <Modal isOpen={showSetupPinModal} onClose={() => setShowSetupPinModal(false)} title={t.set_master_pin}>
        <form onSubmit={handleSavePin} className="space-y-4">
          <p className="text-xs text-[#8f98a0]">
            Create a 4-8 digit numeric PIN to protect your authenticator from unauthorized access.
          </p>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#c7d5e0]">Enter PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pinInput}
              onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 1234"
              className="w-full bg-[#121c27] border border-[#2a475e] rounded-xl px-3.5 py-2.5 text-white font-mono text-center tracking-widest text-lg focus:border-[#66c0f4] outline-none"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#c7d5e0]">Confirm PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pinConfirm}
              onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 1234"
              className="w-full bg-[#121c27] border border-[#2a475e] rounded-xl px-3.5 py-2.5 text-white font-mono text-center tracking-widest text-lg focus:border-[#66c0f4] outline-none"
              required
            />
          </div>

          {errorMsg && <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowSetupPinModal(false)}
              className="px-4 py-2 bg-[#121c27] border border-[#2a475e] text-[#8f98a0] text-xs font-semibold rounded-xl"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#5c7e10] hover:bg-[#6c9513] text-white text-xs font-semibold rounded-xl shadow-sm"
            >
              {t.save} PIN
            </button>
          </div>
        </form>
      </Modal>

      {/* Change PIN Modal */}
      <Modal isOpen={showChangePinModal} onClose={() => setShowChangePinModal(false)} title={t.change_pin}>
        <form onSubmit={handleChangePin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#c7d5e0]">Current PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={oldPin}
              onChange={e => setOldPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Current PIN"
              className="w-full bg-[#121c27] border border-[#2a475e] rounded-xl px-3.5 py-2 text-white font-mono text-center tracking-widest outline-none focus:border-[#66c0f4]"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#c7d5e0]">New PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pinInput}
              onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="New PIN"
              className="w-full bg-[#121c27] border border-[#2a475e] rounded-xl px-3.5 py-2 text-white font-mono text-center tracking-widest outline-none focus:border-[#66c0f4]"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#c7d5e0]">Confirm New PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pinConfirm}
              onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ''))}
              placeholder="Confirm New PIN"
              className="w-full bg-[#121c27] border border-[#2a475e] rounded-xl px-3.5 py-2 text-white font-mono text-center tracking-widest outline-none focus:border-[#66c0f4]"
              required
            />
          </div>

          {errorMsg && <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowChangePinModal(false)}
              className="px-4 py-2 bg-[#121c27] border border-[#2a475e] text-[#8f98a0] text-xs font-semibold rounded-xl"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#5c7e10] hover:bg-[#6c9513] text-white text-xs font-semibold rounded-xl shadow-sm"
            >
              {t.save} PIN
            </button>
          </div>
        </form>
      </Modal>

      {/* Remove PIN Modal */}
      <Modal isOpen={showRemovePinModal} onClose={() => setShowRemovePinModal(false)} title={t.remove_pin}>
        <form onSubmit={handleRemovePin} className="space-y-4">
          <p className="text-xs text-rose-300">
            Removing the master PIN will leave your vault unprotected. Anyone with access to your device can view your codes.
          </p>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#c7d5e0]">Enter Current PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={oldPin}
              onChange={e => setOldPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Current PIN"
              className="w-full bg-[#121c27] border border-[#2a475e] rounded-xl px-3.5 py-2 text-white font-mono text-center tracking-widest outline-none focus:border-[#66c0f4]"
              required
            />
          </div>

          {errorMsg && <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowRemovePinModal(false)}
              className="px-4 py-2 bg-[#121c27] border border-[#2a475e] text-[#8f98a0] text-xs font-semibold rounded-xl"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-sm"
            >
              Remove Protection
            </button>
          </div>
        </form>
      </Modal>

      {/* Export Backup Modal */}
      <Modal isOpen={showExportModal} onClose={() => setShowExportModal(false)} title={t.export_backup_title}>
        <form onSubmit={handleExport} className="space-y-4">
          <p className="text-xs text-[#8f98a0]">
            {t.enter_backup_password}
          </p>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#c7d5e0]">Passphrase</label>
            <input
              type="password"
              value={backupPass}
              onChange={e => setBackupPass(e.target.value)}
              placeholder={t.backup_pass_placeholder}
              className="w-full bg-[#121c27] border border-[#2a475e] rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-[#66c0f4] outline-none"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#c7d5e0]">Confirm Passphrase</label>
            <input
              type="password"
              value={backupPassConfirm}
              onChange={e => setBackupPassConfirm(e.target.value)}
              placeholder="Confirm passphrase"
              className="w-full bg-[#121c27] border border-[#2a475e] rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-[#66c0f4] outline-none"
              required
            />
          </div>

          {backupMsg && (
            <div className={`p-2.5 rounded-xl border text-xs ${
              backupMsg.startsWith('✓') ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-rose-950/40 border-rose-800 text-rose-300'
            }`}>
              {backupMsg}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowExportModal(false)}
              className="px-4 py-2 bg-[#121c27] border border-[#2a475e] text-[#8f98a0] text-xs font-semibold rounded-xl"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={backupLoading}
              className="px-5 py-2 bg-[#5c7e10] hover:bg-[#6c9513] disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm"
            >
              {backupLoading ? 'Encrypting...' : t.download_backup}
            </button>
          </div>
        </form>
      </Modal>

      {/* Restore Backup Modal */}
      <Modal isOpen={showRestoreModal} onClose={() => setShowRestoreModal(false)} title={t.restore_backup_title}>
        <form onSubmit={handleRestore} className="space-y-4">
          <p className="text-xs text-[#8f98a0]">
            {t.select_backup_file}
          </p>

          <div
            className="border-2 border-dashed border-[#2a475e] hover:border-[#1a9fff] rounded-xl p-4 text-center bg-[#171a21]/60 cursor-pointer"
            onClick={() => document.getElementById('restore-file-input')?.click()}
          >
            <input
              type="file"
              id="restore-file-input"
              className="hidden"
              accept=".sinkvault,.json"
              onChange={e => e.target.files?.[0] && handleRestoreFile(e.target.files[0])}
            />
            <p className="text-xs font-semibold text-white">
              {restoreData ? `✓ File loaded (${restoreData.length} bytes)` : 'Click to select .sinkvault file'}
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#c7d5e0]">Or Paste Ciphertext</label>
            <textarea
              rows={3}
              value={restoreData}
              onChange={e => setRestoreData(e.target.value)}
              placeholder='{"version": 1, "ciphertext": "..."}'
              className="w-full bg-[#121c27] border border-[#2a475e] rounded-xl p-2.5 text-xs text-white font-mono focus:border-[#66c0f4] outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#c7d5e0]">{t.enter_restore_password}</label>
            <input
              type="password"
              value={restorePass}
              onChange={e => setRestorePass(e.target.value)}
              placeholder="Backup password"
              className="w-full bg-[#121c27] border border-[#2a475e] rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-[#66c0f4] outline-none"
              required
            />
          </div>

          {/* Merge vs Replace Switch */}
          <div className="flex items-center justify-between pt-1">
            <label className="text-xs text-[#c7d5e0]">
              {restoreMerge ? t.restore_mode_merge : t.restore_mode_replace}
            </label>
            <button
              type="button"
              onClick={() => setRestoreMerge(!restoreMerge)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                restoreMerge ? 'bg-[#5c7e10]' : 'bg-rose-700'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  restoreMerge ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          {restoreMsg && (
            <div className={`p-2.5 rounded-xl border text-xs ${
              restoreMsg.startsWith('✓') ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-rose-950/40 border-rose-800 text-rose-300'
            }`}>
              {restoreMsg}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowRestoreModal(false)}
              className="px-4 py-2 bg-[#121c27] border border-[#2a475e] text-[#8f98a0] text-xs font-semibold rounded-xl"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={backupLoading}
              className="px-5 py-2 bg-[#1a9fff] hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm"
            >
              {backupLoading ? 'Decrypting...' : t.restore_backup_btn}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
