'use client';

import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Package } from 'lucide-react';

export default function LoginPage() {
  const { signInWithGoogle, isAuthenticated, loading, initialize } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace('/');
    }
  }, [loading, isAuthenticated, router]);

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Branding (desktop only) */}
      <div className="from-primary via-accent to-primary/80 relative hidden flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-br px-12 text-white lg:flex">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-20 top-20 h-64 w-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-20 h-48 w-48 rounded-full bg-white blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-md text-center">
          <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 shadow-lg backdrop-blur-sm">
            <Package size={40} strokeWidth={1.5} />
          </div>
          <h1 className="mb-4 text-4xl font-bold leading-tight">
            Everything in its place,
            <br />
            always within reach.
          </h1>
          <p className="text-lg leading-relaxed text-white/80">
            LeonoreVault helps your household organize, track, and find belongings effortlessly.
          </p>
        </div>

        {/* Feature pills */}
        <div className="relative z-10 mt-12 flex flex-wrap justify-center gap-3">
          {['Smart Search', 'QR Labels', 'Activity Log', 'Invite Family'].map((feat) => (
            <span
              key={feat}
              className="rounded-full border border-white/20 bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur-sm"
            >
              {feat}
            </span>
          ))}
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="bg-background flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile Logo */}
          <div className="text-center lg:hidden">
            <div className="from-primary to-accent mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg">
              <Package size={32} strokeWidth={1.5} />
            </div>
          </div>

          {/* Heading */}
          <div className="text-center">
            <h2 className="text-2xl font-bold">
              Welcome to{' '}
              <span className="from-primary to-accent bg-gradient-to-r bg-clip-text text-transparent">
                LeonoreVault
              </span>
            </h2>
            <p className="text-muted mt-2">Sign in to manage your household inventory</p>
          </div>

          {/* Google Sign In */}
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            id="google-sign-in-button"
            className="border-border bg-surface hover:bg-hover group flex w-full items-center justify-center gap-3 rounded-xl border px-5 py-3.5 font-medium transition-all duration-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {/* Google Logo SVG */}
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span className="transition-transform group-hover:translate-x-0.5">
              {loading ? 'Loading...' : 'Continue with Google'}
            </span>
          </button>

          {/* Terms */}
          <p className="text-muted-light text-center text-xs leading-relaxed">
            By signing in, you agree to our{' '}
            <a href="#" className="hover:text-foreground underline transition-colors">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="hover:text-foreground underline transition-colors">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
