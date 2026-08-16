'use client';

import { create } from 'zustand';
import {
  mockGetSession,
  mockSignIn,
  mockSignInWithEmail,
  mockSignUp,
  mockSignOut,
  type MockAuthUser,
  type MockMembership,
} from '@/lib/mock-service';

export type AuthUser = MockAuthUser;
export type Membership = MockMembership;

interface AuthState {
  /** Current authenticated user */
  user: AuthUser | null;
  /** User's household membership */
  membership: Membership | null;
  /** Whether initial auth check is in progress */
  loading: boolean;
  /** Whether user is authenticated */
  isAuthenticated: boolean;

  /** Initialize auth state — call on app mount */
  initialize: () => Promise<void>;
  /** Sign in with the local mock provider */
  signInWithGoogle: () => Promise<void>;
  /** Sign in with local mock credentials */
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Create an account with local mock credentials */
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  /** Sign out and clear state */
  signOut: () => Promise<void>;
  /** Fetch current user profile from the local service */
  fetchProfile: () => Promise<void>;
  /** Set user directly (e.g., from callback) */
  setUser: (user: AuthUser | null) => void;
  /** Set membership directly */
  setMembership: (membership: Membership | null) => void;
}

function applySession(
  set: (state: Partial<AuthState>) => void,
  session: Awaited<ReturnType<typeof mockGetSession>>,
) {
  set({
    user: session?.user ?? null,
    membership: session?.membership ?? null,
    isAuthenticated: Boolean(session),
    loading: false,
  });
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  membership: null,
  loading: true,
  isAuthenticated: false,

  initialize: async () => {
    try {
      applySession(set, await mockGetSession());
    } catch {
      set({ user: null, membership: null, isAuthenticated: false, loading: false });
    }
  },

  signInWithGoogle: async () => {
    applySession(set, await mockSignIn());
  },

  signInWithEmail: async (email, password) => {
    applySession(set, await mockSignInWithEmail(email, password));
  },

  signUpWithEmail: async (name, email, password) => {
    applySession(set, await mockSignUp(name, email, password));
  },

  signOut: async () => {
    await mockSignOut();
    set({ user: null, membership: null, isAuthenticated: false, loading: false });
  },

  fetchProfile: async () => {
    try {
      applySession(set, await mockGetSession());
    } catch {
      // Keep the current local identity when the mock service is unavailable.
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setMembership: (membership) => set({ membership }),
}));
