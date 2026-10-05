'use client';

import React from 'react';
import { usePreferences } from '@/components/providers/AppPreferencesProvider';

export const AppHeader: React.FC = () => {
  const { isPrivacyMode, togglePrivacyMode, theme, t } = usePreferences();

  return (
    <header className={`${
      theme === 'amoled' ? 'bg-[#000000] border-[#1e2a38]' : 'bg-[#121c27] border-[#2a475e]'
    } border-b h-14 px-4 flex items-center justify-between shrink-0 shadow-md z-20`}>
      <div className="flex items-center space-x-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#1b2838] border border-[#2a475e] flex items-center justify-center text-[#66c0f4] shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-wide text-white flex items-center gap-1.5">
            <span>SinkDev Auth</span>
          </h1>
          <p className="text-[10px] text-[#8f98a0] font-mono leading-none">STEAM & 2FA</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Privacy Mode Toggle */}
        <button
          onClick={togglePrivacyMode}
          aria-label="Toggle Privacy Mode"
          className={`p-2 rounded-xl border transition-all ${
            isPrivacyMode
              ? 'bg-[#1a9fff]/20 border-[#1a9fff] text-[#66c0f4] shadow-sm'
              : 'bg-[#1b2838] border-[#2a475e] text-[#8f98a0] hover:text-white'
          }`}
          title={isPrivacyMode ? t.privacy_show : t.privacy_hide}
        >
          {isPrivacyMode ? (
            // Eye off icon
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          ) : (
            // Eye icon
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          )}
        </button>

        {/* Status Badge */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-[#1b2838] border border-[#2a475e]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[10px] font-mono font-medium text-[#66c0f4]">{t.active}</span>
        </div>
      </div>
    </header>
  );
};
