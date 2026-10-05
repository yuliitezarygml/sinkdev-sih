import type { Metadata } from 'next';
import './globals.css';
import { TabBar } from '@/components/ui/TabBar';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppLockProvider } from '@/components/security/AppLockProvider';
import { AppPreferencesProvider } from '@/components/providers/AppPreferencesProvider';

export const metadata: Metadata = {
  title: 'SinkDev Auth - Steam & 2FA',
  description: 'Tauri Authenticator App for Steam Guard and 2FA',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#171a21] text-[#c7d5e0] flex flex-col h-screen overflow-hidden antialiased">
        <AppPreferencesProvider>
          <AppLockProvider>
            {/* Top Header */}
            <AppHeader />

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto pb-24 p-4 max-w-lg w-full mx-auto">
              {children}
            </main>

            {/* Bottom Nav */}
            <TabBar />
          </AppLockProvider>
        </AppPreferencesProvider>
      </body>
    </html>
  );
}
