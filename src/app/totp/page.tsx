'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { TotpAccountDto } from '@/lib/types';
import { getTotpAccounts } from '@/lib/tauri';
import { TotpCodeCard } from '@/components/totp/TotpCodeCard';
import { AddTotpAccountModal } from '@/components/totp/AddTotpAccountModal';
import { usePreferences } from '@/components/providers/AppPreferencesProvider';
import { triggerHaptic } from '@/lib/haptics';

export default function TotpPage() {
  const { t } = usePreferences();
  const [accounts, setAccounts] = useState<TotpAccountDto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const loadAccounts = async () => {
    try {
      const data = await getTotpAccounts();
      setAccounts(data);
    } catch (err) {
      console.error('Failed to load TOTP accounts:', err);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return accounts;
    const q = searchQuery.toLowerCase();
    return accounts.filter(
      acc =>
        acc.issuer.toLowerCase().includes(q) ||
        acc.label.toLowerCase().includes(q)
    );
  }, [accounts, searchQuery]);

  return (
    <div className="relative min-h-full pb-16 space-y-4">
      {/* Search Bar */}
      {accounts.length > 0 && (
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t.search_2fa}
            className="w-full bg-[#1b2838] border border-[#2a475e] rounded-xl px-4 py-2.5 pl-10 text-xs text-white placeholder-[#8f98a0] focus:border-[#66c0f4] outline-none shadow-sm"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3.5 top-3 text-[#8f98a0]"
          >
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-[#8f98a0] hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-24 text-center space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-[#1b2838] border border-[#2a475e] flex items-center justify-center text-[#66c0f4] shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white mb-1">{t.no_2fa_accounts}</h2>
            <p className="text-[#8f98a0] text-xs max-w-xs mx-auto">
              {t.no_2fa_accounts_desc}
            </p>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              setShowAddModal(true);
            }}
            className="px-5 py-2.5 bg-[#2a475e] hover:bg-[#325573] text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[#66c0f4]">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
            <span>{t.scan_qr_or_add}</span>
          </button>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="text-center py-16 text-[#8f98a0] text-xs">
          {t.no_2fa_match} "{searchQuery}"
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAccounts.map(acc => (
            <TotpCodeCard key={acc.id} account={acc} onUpdated={loadAccounts} />
          ))}
        </div>
      )}

      {/* FAB */}
      <div className="fixed bottom-20 right-6 z-40">
        <button 
          onClick={() => {
            triggerHaptic('light');
            setShowAddModal(true);
          }}
          className="w-13 h-13 bg-[#1a9fff] hover:bg-[#66c0f4] text-white rounded-full flex items-center justify-center shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 border-2 border-[#121c27]"
          title="Add 2FA Account"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>

      <AddTotpAccountModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={loadAccounts} />
    </div>
  );
}
