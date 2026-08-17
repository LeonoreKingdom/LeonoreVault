'use client';

import { create } from 'zustand';
import { apiFetch, apiGet } from '@/lib/api';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Membership {
  id: string;
  userId: string;
  householdId: string;
  role: 'admin' | 'member' | 'viewer';
  joinedAt: string;
}

interface CurrentUserResponse {
  user: AuthUser;
  membership: Membership | null;
}

interface AuthState {
  user: AuthUser | null;
  membership: Membership | null;
  loading: boolean;
  isAuthenticated: boolean;
  initialize: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  setMembership: (membership: Membership | null) => void;
}

async function loadCurrentUser(): Promise<CurrentUserResponse> {
  return apiGet<CurrentUserResponse>('/api/auth/me');
}

async function applyCurrentUser(
  set: (state: Partial<AuthState>) => void,
): Promise<void> {
  const current = await loadCurrentUser();
  set({
    user: current.user,
    membership: current.membership,
    isAuthenticated: true,
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
      await applyCurrentUser(set);
    } catch {
      set({ user: null, membership: null, isAuthenticated: false, loading: false });
    }
  },

  signInWithGoogle: async () => {
    const callbackURL = `${window.location.origin}/auth/callback`;
    const result = await apiFetch<{ url?: string; redirect?: boolean }>(
      '/api/auth/sign-in/social',
      {
        method: 'POST',
        body: { provider: 'google', callbackURL },
      },
    );
    if (!result.url) throw new Error('Google sign-in URL was not returned');
    window.location.assign(result.url);
  },

  signInWithEmail: async (email, password) => {
    await apiFetch('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email, password, rememberMe: true },
    });
    await applyCurrentUser(set);
  },

  signUpWithEmail: async (name, email, password) => {
    await apiFetch('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name, email, password, callbackURL: window.location.origin },
    });
    await applyCurrentUser(set);
  },

  signOut: async () => {
    await apiFetch('/api/auth/sign-out', { method: 'POST' });
    set({ user: null, membership: null, isAuthenticated: false, loading: false });
  },

  fetchProfile: async () => {
    try {
      await applyCurrentUser(set);
    } catch {
      set({ user: null, membership: null, isAuthenticated: false, loading: false });
    }
  },

  setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),
  setMembership: (membership) => set({ membership }),
}));
