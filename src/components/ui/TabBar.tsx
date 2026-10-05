'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { usePreferences } from '../providers/AppPreferencesProvider';
import { triggerHaptic } from '@/lib/haptics';

export const TabBar: React.FC = () => {
  const pathname = usePathname();
  const { t, theme } = usePreferences();

  const tabs = [
    {
      name: t.steam_guard,
      href: '/steam',
      icon: (isActive: boolean) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill={isActive ? 'rgba(102, 192, 244, 0.15)' : 'none'}
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      name: t.authenticator_2fa,
      href: '/totp',
      icon: (isActive: boolean) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill={isActive ? 'rgba(102, 192, 244, 0.15)' : 'none'}
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    },
    {
      name: t.settings,
      href: '/settings',
      icon: (isActive: boolean) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill={isActive ? 'rgba(102, 192, 244, 0.15)' : 'none'}
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 ${
      theme === 'amoled' ? 'bg-[#000000] border-[#1e2a38]' : 'bg-[#121c27] border-[#2a475e]'
    } border-t shadow-2xl flex justify-around items-center h-16 z-50 max-w-lg mx-auto`}>
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            onClick={() => triggerHaptic('light')}
            className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-all ${
              isActive
                ? 'text-[#66c0f4]'
                : 'text-[#8f98a0] hover:text-[#c7d5e0]'
            }`}
          >
            {isActive && (
              <div className="absolute top-0 left-1/4 right-1/4 h-[3px] bg-[#66c0f4] rounded-b-full shadow-[0_0_8px_rgba(102,192,244,0.6)]" />
            )}
            <div className={`transition-transform ${isActive ? 'scale-105' : ''}`}>
              {tab.icon(isActive)}
            </div>
            <span className={`text-[10px] font-semibold tracking-wide ${isActive ? 'text-[#66c0f4]' : ''}`}>
              {tab.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};
