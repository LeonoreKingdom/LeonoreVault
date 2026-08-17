'use client';

import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, Package } from 'lucide-react';

type SignUpForm = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type SignInForm = {
  email: string;
  password: string;
};

const initialSignUpForm: SignUpForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const initialSignInForm: SignInForm = {
  email: '',
  password: '',
};

const authInputClass =
  'border-border bg-surface focus:border-primary focus:ring-primary/20 w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors focus:ring-2';

export default function LoginPage() {
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    isAuthenticated,
    loading,
    initialize,
  } = useAuthStore();
  const router = useRouter();
  const [showSignup, setShowSignup] = useState(false);
  const [signInForm, setSignInForm] = useState(initialSignInForm);
  const [signInError, setSignInError] = useState('');
  const [signInSubmitted, setSignInSubmitted] = useState(false);
  const [signUpForm, setSignUpForm] = useState(initialSignUpForm);
  const [signUpError, setSignUpError] = useState('');
  const [signUpSubmitted, setSignUpSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace('/');
    }
  }, [loading, isAuthenticated, router]);

  function updateSignUpField(field: keyof SignUpForm, value: string) {
    setSignUpForm((current) => ({ ...current, [field]: value }));
    setSignUpError('');
    setSignUpSubmitted(false);
  }

  function updateSignInField(field: keyof SignInForm, value: string) {
    setSignInForm((current) => ({ ...current, [field]: value }));
    setSignInError('');
    setSignInSubmitted(false);
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!signInForm.email.includes('@')) {
      setSignInError('Enter a valid email address.');
      return;
    }
    if (signInForm.password.length < 8) {
      setSignInError('Your password must be at least 8 characters.');
      return;
    }

    setSignInError('');
    setSubmitting(true);
    try {
      await signInWithEmail(signInForm.email, signInForm.password);
      setSignInSubmitted(true);
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (signUpForm.password.length < 8) {
      setSignUpError('Use at least 8 characters for your password.');
      return;
    }
    if (signUpForm.password !== signUpForm.confirmPassword) {
      setSignUpError('Passwords do not match.');
      return;
    }

    setSignUpError('');
    setSubmitting(true);
    try {
      await signUpWithEmail(signUpForm.name, signUpForm.email, signUpForm.password);
      setSignUpSubmitted(true);
    } catch (error) {
      setSignUpError(error instanceof Error ? error.message : 'Unable to create account');
    } finally {
      setSubmitting(false);
    }
  }

  function switchAuthMode(nextMode: 'signin' | 'signup') {
    setShowSignup(nextMode === 'signup');
    setSignInForm(initialSignInForm);
    setSignInError('');
    setSignInSubmitted(false);
    setSignUpForm(initialSignUpForm);
    setSignUpError('');
    setSignUpSubmitted(false);
  }

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
              {showSignup ? 'Create your ' : 'Welcome to '}
              <span className="from-primary to-accent bg-gradient-to-r bg-clip-text text-transparent">
                LeonoreVault
              </span>
            </h2>
            <p className="text-muted mt-2">
              {showSignup
                ? 'Set up your household inventory space in a minute.'
                : 'Sign in to manage your household inventory'}
            </p>
          </div>

          {!showSignup && (
            <>
              {signInSubmitted ? (
                <div className="bg-success/10 text-success flex items-start gap-3 rounded-2xl px-4 py-3.5 text-sm">
                  <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Sign-in successful.</p>
                    <p className="mt-0.5 opacity-80">
                      Your local session is ready. Redirecting to your inventory…
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <label htmlFor="signin-email" className="mb-1.5 block text-sm font-semibold">
                      Email address
                    </label>
                    <input
                      id="signin-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={signInForm.email}
                      onChange={(event) => updateSignInField('email', event.target.value)}
                      placeholder="you@example.com"
                      className={authInputClass}
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <label htmlFor="signin-password" className="block text-sm font-semibold">
                        Password
                      </label>
                      <button
                        type="button"
                        className="text-primary text-xs font-semibold hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <input
                      id="signin-password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="current-password"
                      value={signInForm.password}
                      onChange={(event) => updateSignInField('password', event.target.value)}
                      placeholder="Enter your password"
                      className={authInputClass}
                    />
                  </div>
                  {signInError && (
                    <p role="alert" className="text-danger text-sm">
                      {signInError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="from-primary to-accent w-full rounded-xl bg-gradient-to-r px-5 py-3.5 font-semibold text-white shadow-md transition-opacity hover:opacity-90"
                  >
                    {submitting ? 'Signing in…' : 'Sign in'}
                  </button>
                </form>
              )}

              <div className="text-muted-light flex items-center gap-3 text-xs">
                <span className="bg-border h-px flex-1" />
                <span>or</span>
                <span className="bg-border h-px flex-1" />
              </div>
            </>
          )}

          {/* Google Sign In */}
          <button
            type="button"
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

          {showSignup && (
            <>
              {signUpSubmitted ? (
                <div className="bg-success/10 text-success flex items-start gap-3 rounded-2xl px-4 py-3.5 text-sm">
                  <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Your account is ready.</p>
                    <p className="mt-0.5 opacity-80">
                      Your local account is ready. Redirecting to your inventory…
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <label htmlFor="signup-name" className="mb-1.5 block text-sm font-semibold">
                      Your name
                    </label>
                    <input
                      id="signup-name"
                      type="text"
                      required
                      autoComplete="name"
                      value={signUpForm.name}
                      onChange={(event) => updateSignUpField('name', event.target.value)}
                      placeholder="e.g. Leonore"
                      className={authInputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="signup-email" className="mb-1.5 block text-sm font-semibold">
                      Email address
                    </label>
                    <input
                      id="signup-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={signUpForm.email}
                      onChange={(event) => updateSignUpField('email', event.target.value)}
                      placeholder="you@example.com"
                      className={authInputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="signup-password" className="mb-1.5 block text-sm font-semibold">
                      Password
                    </label>
                    <input
                      id="signup-password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={signUpForm.password}
                      onChange={(event) => updateSignUpField('password', event.target.value)}
                      placeholder="At least 8 characters"
                      className={authInputClass}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="signup-confirm-password"
                      className="mb-1.5 block text-sm font-semibold"
                    >
                      Confirm password
                    </label>
                    <input
                      id="signup-confirm-password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={signUpForm.confirmPassword}
                      onChange={(event) => updateSignUpField('confirmPassword', event.target.value)}
                      placeholder="Repeat your password"
                      className={authInputClass}
                    />
                  </div>
                  {signUpError && (
                    <p role="alert" className="text-danger text-sm">
                      {signUpError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="from-primary to-accent w-full rounded-xl bg-gradient-to-r px-5 py-3.5 font-semibold text-white shadow-md transition-opacity hover:opacity-90"
                  >
                    {submitting ? 'Creating account…' : 'Create account'}
                  </button>
                </form>
              )}
            </>
          )}

          <div className="text-center text-sm">
            <span className="text-muted">
              {showSignup ? 'Already have an account?' : 'New to LeonoreVault?'}
            </span>{' '}
            <button
              type="button"
              onClick={() => switchAuthMode(showSignup ? 'signin' : 'signup')}
              className="text-primary font-semibold hover:underline"
            >
              {showSignup ? 'Sign in' : 'Create an account'}
            </button>
          </div>

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
