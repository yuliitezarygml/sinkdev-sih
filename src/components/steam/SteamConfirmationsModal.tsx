'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Confirmation, SteamAccountDto } from '@/lib/types';
import {
  getSteamConfirmations,
  respondSteamConfirmation,
  updateSteamSession,
  getSteamConfirmationDetails,
} from '@/lib/tauri';
import { triggerHaptic } from '@/lib/haptics';
import { Modal } from '../ui/Modal';

interface SteamConfirmationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: SteamAccountDto | null;
}

export const SteamConfirmationsModal: React.FC<SteamConfirmationsModalProps> = ({
  isOpen,
  onClose,
  account,
}) => {
  const [confirmations, setConfirmations] = useState<Confirmation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [showSessionConfig, setShowSessionConfig] = useState(false);
  const [sessionInput, setSessionInput] = useState('');
  const [steamLoginInput, setSteamLoginInput] = useState('');
  const [saveSessionSuccess, setSaveSessionSuccess] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, string>>({});
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    setError(null);
    try {
      const list = await getSteamConfirmations(account.id);
      setConfirmations(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    if (isOpen && account) {
      setSessionInput('');
      setSteamLoginInput('');
      fetchList();
    } else {
      setConfirmations([]);
      setError(null);
      setShowSessionConfig(false);
    }
  }, [isOpen, account, fetchList]);

  const handleToggleDetails = async (confId: string) => {
    if (expandedDetails[confId]) {
      setExpandedDetails(prev => {
        const next = { ...prev };
        delete next[confId];
        return next;
      });
      return;
    }
    if (!account) return;
    triggerHaptic('light');
    setLoadingDetails(confId);
    try {
      const html = await getSteamConfirmationDetails(account.id, confId);
      setExpandedDetails(prev => ({ ...prev, [confId]: html }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Could not load trade details: ${msg}`);
    } finally {
      setLoadingDetails(null);
    }
  };

  const handleAction = async (conf: Confirmation, accept: boolean) => {
    if (!account) return;
    triggerHaptic(accept ? 'success' : 'warning');
    setActionInProgress(conf.id);
    try {
      await respondSteamConfirmation(account.id, conf.id, conf.nonce, accept);
      // Remove from list on success
      setConfirmations(prev => prev.filter(c => c.id !== conf.id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Action failed: ${msg}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleAcceptAll = async () => {
    if (!account || confirmations.length === 0) return;
    if (!confirm(`Are you sure you want to accept all ${confirmations.length} confirmations?`)) return;

    for (const conf of [...confirmations]) {
      setActionInProgress(conf.id);
      try {
        await respondSteamConfirmation(account.id, conf.id, conf.nonce, true);
        setConfirmations(prev => prev.filter(c => c.id !== conf.id));
      } catch (err: unknown) {
        console.error('Failed to accept:', err);
      }
    }
    setActionInProgress(null);
  };

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    try {
      await updateSteamSession(account.id, sessionInput.trim(), steamLoginInput.trim());
      setSaveSessionSuccess(true);
      setTimeout(() => {
        setSaveSessionSuccess(false);
        setShowSessionConfig(false);
        fetchList();
      }, 800);
    } catch (err: unknown) {
      alert(`Failed to save session: ${err}`);
    }
  };

  if (!account) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Confirmations: ${account.account_name}`}
    >
      <div className="flex flex-col max-h-[75vh]">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-steam-surface">
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchList}
              disabled={loading}
              className="px-3 py-1.5 bg-steam-surface hover:bg-steam-card text-xs font-medium rounded text-steam-text flex items-center space-x-1 transition-colors disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={loading ? 'animate-spin' : ''}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>Refresh</span>
            </button>

            {confirmations.length > 0 && (
              <button
                onClick={handleAcceptAll}
                disabled={loading || actionInProgress !== null}
                className="px-3 py-1.5 bg-steam-green hover:bg-emerald-600 text-xs font-semibold rounded text-white transition-colors"
              >
                Accept All ({confirmations.length})
              </button>
            )}
          </div>

          <button
            onClick={() => setShowSessionConfig(!showSessionConfig)}
            className="text-xs text-steam-muted hover:text-steam-accent underline flex items-center space-x-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span>{showSessionConfig ? 'Hide Session' : 'Session'}</span>
          </button>
        </div>

        {/* Session Config Drawer */}
        {showSessionConfig && (
          <form onSubmit={handleSaveSession} className="mb-4 p-3 bg-steam-surface rounded border border-steam-accent/30 space-y-3">
            <h4 className="text-xs font-semibold text-steam-accent uppercase tracking-wider">
              Steam Login Session
            </h4>
            <p className="text-[11px] text-steam-muted leading-relaxed">
              To fetch and approve trade or market confirmations, Steam requires active login cookies.
            </p>
            <div>
              <label className="block text-[11px] text-steam-muted mb-1">steamLoginSecure cookie:</label>
              <input
                type="text"
                value={steamLoginInput}
                onChange={e => setSteamLoginInput(e.target.value)}
                placeholder="76561198...%7C%7Cey..."
                className="w-full bg-steam-bg border border-steam-card rounded px-2.5 py-1.5 text-xs text-steam-text font-mono focus:outline-none focus:border-steam-accent"
              />
            </div>
            <div>
              <label className="block text-[11px] text-steam-muted mb-1">Session ID (optional):</label>
              <input
                type="text"
                value={sessionInput}
                onChange={e => setSessionInput(e.target.value)}
                placeholder="e.g. 524e930bc1298..."
                className="w-full bg-steam-bg border border-steam-card rounded px-2.5 py-1.5 text-xs text-steam-text font-mono focus:outline-none focus:border-steam-accent"
              />
            </div>
            <button
              type="submit"
              className="w-full py-1.5 bg-steam-accent hover:bg-blue-500 text-xs font-medium rounded text-white transition-colors"
            >
              {saveSessionSuccess ? 'Saved!' : 'Save & Refresh Session'}
            </button>
          </form>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-3 p-3 bg-steam-red/20 border border-steam-red/40 rounded text-xs text-red-200">
            <p className="font-semibold mb-1">Error fetching confirmations:</p>
            <p className="text-[11px] break-words">{error}</p>
            {!showSessionConfig && (
              <button
                onClick={() => setShowSessionConfig(true)}
                className="mt-2 text-[11px] text-steam-accent underline block"
              >
                Configure steamLoginSecure session
              </button>
            )}
          </div>
        )}

        {/* Confirmations List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading && confirmations.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-steam-muted text-xs space-y-2">
              <svg className="animate-spin h-6 w-6 text-steam-accent" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Checking Steam for confirmations...</span>
            </div>
          ) : confirmations.length === 0 ? (
            <div className="py-12 text-center text-steam-muted text-xs">
              <svg className="w-10 h-10 mx-auto mb-2 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-medium text-steam-text">No pending confirmations</p>
              <p className="text-[11px] text-steam-muted mt-1">Trades and market listings requiring approval will appear here.</p>
            </div>
          ) : (
            confirmations.map(conf => (
              <div
                key={conf.id}
                className="p-3.5 bg-steam-surface rounded-lg border border-steam-card hover:border-steam-accent/40 transition-all flex flex-col space-y-2.5"
              >
                <div className="flex items-start space-x-3">
                  {conf.icon ? (
                    <img
                      src={conf.icon}
                      alt="Icon"
                      className="w-12 h-12 rounded object-cover border border-steam-card shrink-0 bg-black/20"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-steam-card flex items-center justify-center shrink-0 text-steam-accent">
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                      </svg>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-steam-text truncate">
                        {conf.headline}
                      </h4>
                      <span className="text-[10px] text-steam-muted shrink-0 ml-2">
                        {conf.time_str}
                      </span>
                    </div>

                    {conf.summary && conf.summary.length > 0 && (
                      <div className="mt-1 text-[11px] text-steam-muted space-y-0.5">
                        {conf.summary.map((line, idx) => (
                          <p key={idx} className="truncate">{line}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expandable Details Preview */}
                {expandedDetails[conf.id] && (
                  <div className="p-3 bg-[#121c27] rounded-xl border border-[#2a475e] text-xs text-[#c7d5e0] space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-[#2a475e]/60">
                      <span className="font-bold text-[#66c0f4] flex items-center gap-1">
                        🔍 Trade Details & Items
                      </span>
                      <button
                        onClick={() => handleToggleDetails(conf.id)}
                        className="text-[10px] text-[#8f98a0] hover:text-white"
                      >
                        Hide
                      </button>
                    </div>
                    <div
                      className="overflow-x-auto max-h-48 text-[11px] leading-relaxed [&_img]:inline [&_img]:max-w-[48px] [&_img]:rounded [&_img]:m-1 [&_.tradeoffer_items_banner]:font-semibold [&_.tradeoffer_items_banner]:my-1"
                      dangerouslySetInnerHTML={{ __html: expandedDetails[conf.id] }}
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-steam-card/60">
                  <button
                    onClick={() => handleToggleDetails(conf.id)}
                    disabled={loadingDetails === conf.id}
                    className="px-2.5 py-1 bg-[#121c27] hover:bg-[#1b2838] border border-[#2a475e] text-[#66c0f4] text-xs font-semibold rounded-lg transition-colors mr-auto flex items-center gap-1"
                  >
                    <span>{loadingDetails === conf.id ? 'Loading...' : expandedDetails[conf.id] ? 'Hide' : 'Inspect Items'}</span>
                  </button>
                  <button
                    onClick={() => handleAction(conf, false)}
                    disabled={actionInProgress === conf.id}
                    className="px-3 py-1 bg-steam-red/80 hover:bg-steam-red text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
                  >
                    {actionInProgress === conf.id ? 'Processing...' : 'Cancel'}
                  </button>
                  <button
                    onClick={() => handleAction(conf, true)}
                    disabled={actionInProgress === conf.id}
                    className="px-3.5 py-1 bg-steam-green hover:bg-emerald-600 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
                  >
                    {actionInProgress === conf.id ? 'Processing...' : 'Accept'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
