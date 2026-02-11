'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { createClient } from '@/lib/supabase';
import { Home as HomeIcon, Plus, UserPlus, ArrowRight, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Mode = 'choose' | 'create' | 'join';

export default function HouseholdSetupPage() {
  const [mode, setMode] = useState<Mode>('choose');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { fetchProfile } = useAuthStore();

  async function getToken() {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token;
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/households`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create');
      await fetchProfile();
      router.replace('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) {
      setError('Invite code is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/households/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ invite_code: inviteCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to join');
      await fetchProfile();
      router.replace('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="from-primary to-accent mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white">
            <HomeIcon size={28} strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold">Set Up Your Household</h1>
          <p className="text-muted mt-1">Create a new household or join an existing one</p>
        </div>

        {/* Choose Mode */}
        {mode === 'choose' && (
          <div className="space-y-3">
            <button
              onClick={() => setMode('create')}
              className="border-border bg-surface hover:border-primary/40 group flex w-full items-center justify-between rounded-2xl border p-5 transition-all hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 text-primary flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110">
                  <Plus size={22} />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Create Household</p>
                  <p className="text-muted text-sm">Start a new inventory space</p>
                </div>
              </div>
              <ArrowRight
                size={18}
                className="text-muted group-hover:text-primary transition-all group-hover:translate-x-1"
              />
            </button>

            <button
              onClick={() => setMode('join')}
              className="border-border bg-surface hover:border-accent/40 group flex w-full items-center justify-between rounded-2xl border p-5 transition-all hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="bg-accent/10 text-accent flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110">
                  <UserPlus size={22} />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Join with Invite Code</p>
                  <p className="text-muted text-sm">Enter a 6-character code</p>
                </div>
              </div>
              <ArrowRight
                size={18}
                className="text-muted group-hover:text-accent transition-all group-hover:translate-x-1"
              />
            </button>
          </div>
        )}

        {/* Create Form */}
        {mode === 'create' && (
          <div className="border-border bg-surface space-y-4 rounded-2xl border p-6">
            <div>
              <label htmlFor="household-name" className="mb-1.5 block text-sm font-medium">
                Household Name
              </label>
              <input
                id="household-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Casa Leonore"
                maxLength={100}
                className="border-border bg-background text-foreground placeholder:text-muted-light focus:ring-primary/40 focus:border-primary w-full rounded-xl border px-4 py-2.5 transition-all focus:outline-none focus:ring-2"
                autoFocus
              />
            </div>

            {error && <p className="text-danger text-sm">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setMode('choose');
                  setError('');
                }}
                className="border-border hover:bg-hover flex-1 rounded-xl border px-4 py-2.5 font-medium transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="from-primary to-accent flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2.5 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        )}

        {/* Join Form */}
        {mode === 'join' && (
          <div className="border-border bg-surface space-y-4 rounded-2xl border p-6">
            <div>
              <label htmlFor="invite-code" className="mb-1.5 block text-sm font-medium">
                Invite Code
              </label>
              <input
                id="invite-code"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g. XK9M2P"
                maxLength={6}
                className="border-border bg-background text-foreground placeholder:text-muted-light focus:ring-primary/40 focus:border-primary w-full rounded-xl border px-4 py-2.5 text-center font-mono text-2xl uppercase tracking-[0.3em] transition-all placeholder:text-base placeholder:tracking-normal focus:outline-none focus:ring-2"
                autoFocus
              />
            </div>

            {error && <p className="text-danger text-sm">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setMode('choose');
                  setError('');
                }}
                className="border-border hover:bg-hover flex-1 rounded-xl border px-4 py-2.5 font-medium transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleJoin}
                disabled={loading || inviteCode.length !== 6}
                className="from-primary to-accent flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2.5 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Joining...' : 'Join'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
