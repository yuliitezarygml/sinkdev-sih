'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { SteamAccountDto } from '@/lib/types';
import {
  getSteamAccountCode,
  removeSteamAccount,
  renameSteamAccount,
  copyToClipboardWithAutoClear,
} from '@/lib/tauri';
import { useCodeTimer } from '@/hooks/useCodeTimer';
import { ProgressRing } from '../ui/ProgressRing';
import { SteamConfirmationsModal } from './SteamConfirmationsModal';
import { Modal } from '../ui/Modal';
import { usePreferences } from '../providers/AppPreferencesProvider';
import { triggerHaptic } from '@/lib/haptics';

interface SteamCodeCardProps {
  account: SteamAccountDto;
  onUpdated?: () => void;
}

export const SteamCodeCard: React.FC<SteamCodeCardProps> = ({ account, onUpdated }) => {
  const { isPrivacyMode, t } = usePreferences();
  const [code, setCode] = useState<string>(account.current_code || '-----');
  const [copied, setCopied] = useState(false);
  const [showConfirmations, setShowConfirmations] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newName, setNewName] = useState(account.account_name);
  const [revealed, setRevealed] = useState(false);
  const { secondsLeft, progress } = useCodeTimer(30);

  const fetchCode = useCallback(async () => {
    try {
      const res = await getSteamAccountCode(account.id, 0);
      setCode(res.code);
    } catch (err) {
      console.error('Failed to generate Steam code:', err);
    }
  }, [account.id]);

  useEffect(() => {
    fetchCode();
  }, [fetchCode]);

  useEffect(() => {
    if (secondsLeft === 30 || secondsLeft === 0) {
      fetchCode();
    }
  }, [secondsLeft, fetchCode]);

  const handleCopy = async () => {
    try {
      await copyToClipboardWithAutoClear(code, 30);
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
    if (confirm(`${t.remove_steam_confirm} "${account.account_name}"?`)) {
      try {
        await removeSteamAccount(account.id);
        triggerHaptic('warning');
        onUpdated?.();
      } catch (err) {
        alert(`Failed to remove account: ${err}`);
      }
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await renameSteamAccount(account.id, newName.trim());
      triggerHaptic('light');
      setShowRenameModal(false);
      onUpdated?.();
    } catch (err) {
      alert(`Failed to rename account: ${err}`);
    }
  };

  const isMasked = isPrivacyMode && !revealed;
  const displayCode = isMasked ? '•••••' : code;

  return (
    <>
      <div className="bg-[#1b2838] rounded-2xl p-4 shadow-xl border border-[#2a475e] transition-all hover:border-[#66c0f4]/50 flex flex-col space-y-3.5">
        {/* Account Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#121c27] border border-[#2a475e] flex items-center justify-center text-[#66c0f4] shadow-inner font-bold text-sm">
                {account.account_name.charAt(0).toUpperCase()}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#1b2838]"></span>
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <h3 className="text-white font-bold text-sm truncate">
                  {account.account_name}
                </h3>
                <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[#2a475e] text-[#66c0f4]">
                  Steam Guard
                </span>
                {account.session_status === 'active' ? (
                  <span title="Steam Session Status" className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#5c7e10]/30 border border-[#5c7e10] text-[#a4d007]">
                    ● {t.session_active}
                  </span>
                ) : account.session_status === 'expiring' ? (
                  <span title="Steam Session Status" className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-600 text-amber-300">
                    ▲ {t.session_expiring}
                  </span>
                ) : (
                  <span title="Steam Session Status" className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#121c27] border border-[#2a475e] text-[#8f98a0]">
                    ○ {t.session_none}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#8f98a0] font-mono truncate">
                ID: {account.steam_id || 'N/A'}
              </p>
            </div>
          </div>

          {/* Action buttons (Rename & Delete) */}
          <div className="flex items-center space-x-1 shrink-0">
            <button
              onClick={() => {
                setNewName(account.account_name);
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

        {/* Code & Timer Display */}
        <div className="flex items-center justify-between bg-[#121c27] rounded-xl p-3.5 border border-[#2a475e] shadow-inner">
          <div className="flex flex-col space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#8f98a0] tracking-wider">
              {t.login_code}
            </span>
            <div className="flex items-center space-x-3">
              <span
                onClick={handleRevealToggle}
                className={`font-mono text-3xl font-extrabold tracking-widest text-[#66c0f4] drop-shadow cursor-pointer select-none ${
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

        {/* Action Button: Confirmations */}
        <div className="pt-0.5">
          <button
            onClick={() => setShowConfirmations(true)}
            className="w-full py-2.5 bg-[#2a475e] hover:bg-[#325573] border border-[#2a475e] hover:border-[#66c0f4]/50 rounded-xl text-xs font-semibold text-white flex items-center justify-center space-x-2 transition-all shadow-sm active:scale-[0.99]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#66c0f4]">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
            </svg>
            <span>{t.trade_confirmations}</span>
            <span className={`px-2 py-0.5 text-white text-[10px] rounded-full font-bold ml-1 ${
              account.has_session ? 'bg-[#5c7e10]' : 'bg-[#121c27] text-[#8f98a0] border border-[#2a475e]'
            }`}>
              {account.has_session ? t.ready : t.session_setup}
            </span>
          </button>
        </div>
      </div>

      {/* Rename Modal */}
      <Modal isOpen={showRenameModal} onClose={() => setShowRenameModal(false)} title="Rename Steam Account">
        <form onSubmit={handleRename} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#c7d5e0]">Account Name / Label</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
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

      <SteamConfirmationsModal
        isOpen={showConfirmations}
        onClose={() => setShowConfirmations(false)}
        account={account}
      />
    </>
  );
};
