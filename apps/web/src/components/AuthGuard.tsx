'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';

/**
 * Auth guard component — redirects unauthenticated users to /login.
 * Wraps protected page content and shows a loading state during auth check.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, initialize } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="bg-background flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="border-3 border-primary h-8 w-8 animate-spin rounded-full border-t-transparent" />
          <p className="text-muted animate-pulse text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
