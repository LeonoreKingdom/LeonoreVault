'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

/**
 * OAuth callback page.
 * Supabase redirects here after Google sign-in.
 * Handles the code exchange and redirects to the dashboard.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { fetchProfile } = useAuthStore();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const handleCallback = async () => {
      try {
        const supabase = createClient();

        // Supabase SSR client automatically handles the code exchange
        // from the URL hash/query parameters
        const { error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error.message);
          router.replace('/login?error=auth_failed');
          return;
        }

        // Fetch user profile from our API
        await fetchProfile();

        // Redirect to dashboard
        router.replace('/');
      } catch (err) {
        console.error('Auth callback failed:', err);
        router.replace('/login?error=auth_failed');
      }
    };

    handleCallback();
  }, [router, fetchProfile]);

  return (
    <div className="bg-background flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="border-3 border-primary h-10 w-10 animate-spin rounded-full border-t-transparent" />
        <div>
          <p className="text-lg font-semibold">Signing you in...</p>
          <p className="text-muted mt-1 text-sm">Please wait while we set up your account.</p>
        </div>
      </div>
    </div>
  );
}
