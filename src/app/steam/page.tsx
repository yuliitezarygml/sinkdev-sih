'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { SteamAccountDto } from '@/lib/types';
import { getSteamAccounts } from '@/lib/tauri';
import { SteamCodeCard } from '@/components/steam/SteamCodeCard';
import { AddSteamAccountModal } from '@/components/steam/AddSteamAccountModal';
import { ImportMaFileModal } from '@/components/steam/ImportMaFileModal';
import { usePreferences } from '@/components/providers/AppPreferencesProvider';
import { triggerHaptic } from '@/lib/haptics';

export default function SteamPage() {
  const { t } = usePreferences();
  const [accounts, setAccounts] = useState<SteamAccountDto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const loadAccounts = async () => {
    try {
      const data = await getSteamAccounts();
      setAccounts(data);
    } catch (err) {
      console.error('Failed to load steam accounts:', err);
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
        acc.account_name.toLowerCase().includes(q) ||
        acc.steam_id.toLowerCase().includes(q)
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
            placeholder={t.search_steam}
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
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white mb-1">{t.no_steam_accounts}</h2>
            <p className="text-[#8f98a0] text-xs max-w-xs mx-auto">
              {t.no_steam_accounts_desc}
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                triggerHaptic('light');
                setShowImportModal(true);
              }}
              className="px-4 py-2 bg-[#2a475e] hover:bg-[#325573] text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>{t.import_mafile}</span>
            </button>
            <button
              onClick={() => {
                triggerHaptic('light');
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-[#121c27] hover:bg-[#1b2838] border border-[#2a475e] text-[#66c0f4] text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
            >
              <span>{t.manual_entry}</span>
            </button>
          </div>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="text-center py-16 text-[#8f98a0] text-xs">
          {t.no_steam_match} "{searchQuery}"
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAccounts.map(acc => (
            <SteamCodeCard key={acc.id} account={acc} onUpdated={loadAccounts} />
          ))}
        </div>
      )}

      {/* FAB & Menu */}
      <div className="fixed bottom-20 right-6 z-40 flex flex-col items-end">
        {showMenu && (
          <div className="mb-3 bg-[#1b2838] border border-[#2a475e] rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 w-48">
            <button 
              className="w-full text-left px-4 py-3 text-xs hover:bg-[#2a475e] transition-colors flex items-center space-x-2 text-white font-medium"
              onClick={() => {
                triggerHaptic('light');
                setShowImportModal(true);
                setShowMenu(false);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#66c0f4]"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
              <span>{t.import_mafile}</span>
            </button>
            <button 
              className="w-full text-left px-4 py-3 text-xs hover:bg-[#2a475e] transition-colors flex items-center space-x-2 border-t border-[#2a475e] text-white font-medium"
              onClick={() => {
                triggerHaptic('light');
                setShowAddModal(true);
                setShowMenu(false);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#66c0f4]"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span>{t.manual_entry}</span>
            </button>
          </div>
        )}
        
        <button 
          onClick={() => {
            triggerHaptic('light');
            setShowMenu(!showMenu);
          }}
          className="w-13 h-13 bg-[#1a9fff] hover:bg-[#66c0f4] text-white rounded-full flex items-center justify-center shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 border-2 border-[#121c27]"
          title="Add Steam Account"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${showMenu ? 'rotate-45' : ''}`}>
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>

      <AddSteamAccountModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={loadAccounts} />
      <ImportMaFileModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} onSuccess={loadAccounts} />
    </div>
  );
}
