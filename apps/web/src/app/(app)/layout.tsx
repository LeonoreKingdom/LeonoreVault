'use client';

import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';

/**
 * App Shell layout for all authenticated pages.
 * Renders Sidebar on desktop, BottomNav on mobile.
 * Wrapped in AuthGuard to redirect unauthenticated users.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
        </main>

        {/* Mobile Bottom Nav */}
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
