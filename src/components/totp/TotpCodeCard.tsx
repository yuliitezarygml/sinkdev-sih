'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { TotpAccountDto } from '@/lib/types';
import {
  getTotpAccountCode,
  removeTotpAccount,
  renameTotpAccount,
  copyToClipboardWithAutoClear,
} from '@/lib/tauri';
import { useCodeTimer } from '@/hooks/useCodeTimer';
import { ProgressRing } from '../ui/ProgressRing';
import { Modal } from '../ui/Modal';
import { BrandIcon } from '../ui/BrandIcon';
import { usePreferences } from '../providers/AppPreferencesProvider';
import { triggerHaptic } from '@/lib/haptics';

interface TotpCodeCardProps {
  account: TotpAccountDto;
  onUpdated?: () => void;
}

export const TotpCodeCard: React.FC<TotpCodeCardProps> = ({ account, onUpdated }) => {
  const { isPrivacyMode, t } = usePreferences();
  const [code, setCode] = useState<string>(account.current_code || '--- ---');
  const [copied, setCopied] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newIssuer, setNewIssuer] = useState(account.issuer);
  const [newLabel, setNewLabel] = useState(account.label);
  const [revealed, setRevealed] = useState(false);
  const { secondsLeft, progress } = useCodeTimer(account.period);

  const fetchCode = useCallback(async () => {
    try {
      const res = await getTotpAccountCode(account.id);
      const c = res.code;
      const formatted =
        c.length === 6
          ? `${c.slice(0, 3)} ${c.slice(3)}`
          : c.length === 8
          ? `${c.slice(0, 4)} ${c.slice(4)}`
          : c;
      setCode(formatted);
    } catch (err) {
      console.error('Failed to generate TOTP code:', err);
    }
  }, [account.id]);

  useEffect(() => {
    fetchCode();
  }, [fetchCode]);

  useEffect(() => {
    if (secondsLeft === account.period || secondsLeft === 0) {
      fetchCode();
    }
  }, [secondsLeft, account.period, fetchCode]);

  const handleCopy = async () => {
    try {
      await copyToClipboardWithAutoClear(code.replace(/\s/g, ''), 30);
      triggerHaptic('success');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleRevealToggle = () => {
    if (!revealed) {
      triggerHaptic('light');
      setRevealed(true);
      setTimeout(() => setRevealed(false), 5000);
    }
  };

  const handleDelete = async () => {
    if (confirm(`${t.cancel} / Remove "${account.issuer} (${account.label})"?`)) {
      try {
        await removeTotpAccount(account.id);
        triggerHaptic('warning');
        onUpdated?.();
      } catch (err) {
        alert(`Failed to remove account: ${err}`);
      }
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await renameTotpAccount(account.id, newIssuer.trim(), newLabel.trim());
      triggerHaptic('light');
      setShowRenameModal(false);
      onUpdated?.();
    } catch (err) {
      alert(`Failed to rename account: ${err}`);
    }
  };

  const isMasked = isPrivacyMode && !revealed;
  const displayCode = isMasked
    ? account.digits === 8
      ? '•••• ••••'
      : '••• •••'
    : code;

  return (
    <>
      <div className="bg-[#1b2838] rounded-2xl p-4 shadow-xl border border-[#2a475e] transition-all hover:border-[#66c0f4]/50 flex flex-col space-y-3.5">
        {/* Account Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <BrandIcon issuer={account.issuer} label={account.label} size={42} />
            <div className="truncate">
              <h3 className="text-white font-bold text-sm truncate">
                {account.issuer || '2FA Account'}
              </h3>
              <p className="text-[11px] text-[#8f98a0] truncate font-mono">
                {account.label}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            <button
              onClick={() => {
                setNewIssuer(account.issuer);
                setNewLabel(account.label);
                setShowRenameModal(true);
              }}
              className="text-[#8f98a0] hover:text-[#66c0f4] p-1.5 rounded-lg hover:bg-[#121c27] transition-colors"
              title="Rename account"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="text-[#8f98a0] hover:text-rose-400 p-1.5 rounded-lg hover:bg-[#121c27] transition-colors"
              title="Remove account"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Code Display */}
        <div className="flex items-center justify-between bg-[#121c27] rounded-xl p-3.5 border border-[#2a475e] shadow-inner">
          <div className="flex flex-col space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#8f98a0] tracking-wider">
              {t.one_time_password}
            </span>
            <div className="flex items-center space-x-3">
              <span
                onClick={handleRevealToggle}
                className={`font-mono text-2xl sm:text-3xl font-extrabold tracking-widest text-white drop-shadow cursor-pointer select-none ${
                  isMasked ? 'text-[#8f98a0]' : ''
                }`}
                title={isMasked ? 'Click to reveal' : ''}
              >
                {displayCode}
              </span>
              <button
                onClick={handleCopy}
                className={`px-2.5 py-1.5 text-xs rounded-lg font-medium flex items-center space-x-1.5 transition-all shadow-sm ${
                  copied
                    ? 'bg-[#5c7e10] text-white'
                    : 'bg-[#2a475e] hover:bg-[#3b5c77] text-[#c7d5e0] hover:text-white'
                }`}
                title="Copy code"
              >
                {copied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{t.copied}</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>{t.copy}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <ProgressRing progress={progress} text={secondsLeft} size={46} strokeWidth={3.5} />
        </div>
      </div>

      {/* Rename Modal */}
      <Modal isOpen={showRenameModal} onClose={() => setShowRenameModal(false)} title="Rename 2FA Account">
        <form onSubmit={handleRename} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#c7d5e0]">Issuer / Service Name</label>
            <input
              type="text"
              value={newIssuer}
              onChange={e => setNewIssuer(e.target.value)}
              className="w-full bg-[#121c27] border border-[#2a475e] rounded-xl px-3.5 py-2 text-white text-xs outline-none focus:border-[#66c0f4]"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#c7d5e0]">Account Label / Email</label>
            <input
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              className="w-full bg-[#121c27] border border-[#2a475e] rounded-xl px-3.5 py-2 text-white text-xs outline-none focus:border-[#66c0f4]"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowRenameModal(false)}
              className="px-4 py-2 bg-[#121c27] border border-[#2a475e] text-[#8f98a0] text-xs font-semibold rounded-xl"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1a9fff] hover:bg-[#66c0f4] text-white text-xs font-semibold rounded-xl shadow-sm"
            >
              {t.save}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};
