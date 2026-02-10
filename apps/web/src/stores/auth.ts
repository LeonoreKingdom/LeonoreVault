'use client';

import { create } from 'zustand';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface Membership {
  id: string;
  userId: string;
  householdId: string;
  role: 'admin' | 'member' | 'viewer';
  joinedAt: string;
}

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
  /** Sign in with Google OAuth */
  signInWithGoogle: () => Promise<void>;
  /** Sign out and clear state */
  signOut: () => Promise<void>;
  /** Fetch current user profile from API */
  fetchProfile: () => Promise<void>;
  /** Set user directly (e.g., from callback) */
  setUser: (user: AuthUser | null) => void;
  /** Set membership directly */
  setMembership: (membership: Membership | null) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  membership: null,
  loading: true,
  isAuthenticated: false,

  initialize: async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Fetch profile from our API
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (response.ok) {
          const { data } = await response.json();
          set({
            user: data.user,
            membership: data.membership,
            isAuthenticated: true,
            loading: false,
          });
          return;
        }
      }

      set({ user: null, membership: null, isAuthenticated: false, loading: false });
    } catch {
      set({ user: null, membership: null, isAuthenticated: false, loading: false });
    }
  },

  signInWithGoogle: async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
  },

  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ user: null, membership: null, isAuthenticated: false });
  },

  fetchProfile: async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return;

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        const { data } = await response.json();
        set({
          user: data.user,
          membership: data.membership,
          isAuthenticated: true,
        });
      }
    } catch {
      // Silently fail — user stays with current state
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setMembership: (membership) => set({ membership }),
}));
