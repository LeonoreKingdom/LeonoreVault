'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import {
  Settings,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  Crown,
  UserMinus,
  ChevronDown,
  Users,
  Shield,
  Eye,
  LogOut,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────

interface HouseholdDetails {
  household: {
    id: string;
    name: string;
    createdBy: string;
    inviteCode: string | null;
    inviteExpiresAt: string | null;
    createdAt: string;
  };
  members: Member[];
  memberCount: number;
}

interface Member {
  id: string;
  userId: string;
  householdId: string;
  role: 'admin' | 'member' | 'viewer';
  joinedAt: string;
  user: {
    display_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

const ROLE_LABELS: Record<string, { label: string; icon: typeof Crown; color: string }> = {
  admin: { label: 'Admin', icon: Crown, color: 'text-warning' },
  member: { label: 'Member', icon: Shield, color: 'text-primary' },
  viewer: { label: 'Viewer', icon: Eye, color: 'text-muted' },
};

// ─── Component ──────────────────────────────────────────────

export default function SettingsPage() {
  const { user, membership, signOut, fetchProfile } = useAuthStore();
  const householdId = membership?.householdId;

  const [details, setDetails] = useState<HouseholdDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Invite state
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  // Role change
  const [roleDropdown, setRoleDropdown] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState(false);

  // Remove
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!householdId) return;
    try {
      setLoading(true);
      const data = await apiGet<HouseholdDetails>(`/api/households/${householdId}`);
      setDetails(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Generate invite code
  const handleGenerateInvite = async () => {
    if (!householdId) return;
    setGeneratingInvite(true);
    try {
      await apiPost(`/api/households/${householdId}/invite`);
      await fetchDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invite');
    } finally {
      setGeneratingInvite(false);
    }
  };

  // Copy invite code
  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Change member role
  const handleChangeRole = async (targetUserId: string, newRole: string) => {
    if (!householdId) return;
    setChangingRole(true);
    try {
      await apiPatch(`/api/households/${householdId}/members/${targetUserId}`, { role: newRole });
      setRoleDropdown(null);
      await fetchDetails();
      // Refresh profile if changing own role
      if (targetUserId === user?.id) {
        await fetchProfile();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change role');
    } finally {
      setChangingRole(false);
    }
  };

  // Remove member
  const handleRemoveMember = async (targetUserId: string) => {
    if (!householdId) return;
    try {
      await apiDelete(`/api/households/${householdId}/members/${targetUserId}`);
      setRemoveConfirm(null);
      if (targetUserId === user?.id) {
        // Removed self — refresh profile to clear membership
        await fetchProfile();
        window.location.href = '/';
      } else {
        await fetchDetails();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  if (!membership) {
    return (
      <div className="border-border bg-surface flex flex-col items-center justify-center rounded-2xl border px-6 py-16 text-center">
        <Settings size={48} className="text-muted-light mb-4" />
        <h2 className="mb-2 text-xl font-bold">No Household</h2>
        <p className="text-muted max-w-md">Join or create a household to access settings.</p>
      </div>
    );
  }

  const isAdmin = membership.role === 'admin';
  const inviteCode = details?.household.inviteCode;
  const inviteExpired =
    details?.household.inviteExpiresAt && new Date(details.household.inviteExpiresAt) < new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Settings</h1>
        <p className="text-muted mt-1">Manage your household and members</p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-danger/10 text-danger rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="text-primary animate-spin" />
        </div>
      )}

      {!loading && details && (
        <div className="space-y-6">
          {/* ─── Household Info ─────────────────────────── */}
          <section className="border-border bg-surface rounded-2xl border p-6">
            <h2 className="mb-4 text-lg font-bold">Household</h2>
            <div className="space-y-3">
              <div>
                <span className="text-muted text-sm">Name</span>
                <p className="font-medium">{details.household.name}</p>
              </div>
              <div>
                <span className="text-muted text-sm">Created</span>
                <p className="font-medium">
                  {new Date(details.household.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <span className="text-muted text-sm">Members</span>
                <p className="font-medium">{details.memberCount}</p>
              </div>
            </div>
          </section>

          {/* ─── Invite Code ───────────────────────────── */}
          {isAdmin && (
            <section className="border-border bg-surface rounded-2xl border p-6">
              <h2 className="mb-4 text-lg font-bold">Invite Code</h2>
              <p className="text-muted mb-4 text-sm">
                Generate a 6-character invite code for others to join your household. Codes expire
                after 7 days.
              </p>

              {inviteCode && !inviteExpired ? (
                <div className="space-y-3">
                  <div className="bg-background flex items-center gap-3 rounded-xl p-4">
                    <span className="text-primary flex-1 font-mono text-2xl font-bold tracking-widest">
                      {inviteCode}
                    </span>
                    <button
                      onClick={() => handleCopy(inviteCode)}
                      className="text-muted hover:text-primary rounded-lg p-2 transition-colors"
                      title="Copy code"
                    >
                      {copied ? <Check size={20} className="text-success" /> : <Copy size={20} />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted text-xs">
                      Expires{' '}
                      {new Date(details.household.inviteExpiresAt!).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <button
                      onClick={handleGenerateInvite}
                      disabled={generatingInvite}
                      className="text-primary flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-80"
                    >
                      <RefreshCw size={14} className={generatingInvite ? 'animate-spin' : ''} />
                      Regenerate
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleGenerateInvite}
                  disabled={generatingInvite}
                  className="from-primary to-accent bg-linear-to-r flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {generatingInvite ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Users size={16} />
                  )}
                  {generatingInvite ? 'Generating...' : 'Generate Invite Code'}
                </button>
              )}
            </section>
          )}

          {/* ─── Members ───────────────────────────────── */}
          <section className="border-border bg-surface rounded-2xl border">
            <div className="border-border border-b px-6 py-4">
              <h2 className="text-lg font-bold">
                Members{' '}
                <span className="text-muted text-base font-normal">({details.memberCount})</span>
              </h2>
            </div>
            <div className="divide-border divide-y">
              {details.members.map((member) => {
                const roleInfo = ROLE_LABELS[member.role] || ROLE_LABELS.viewer;
                const RoleIcon = roleInfo.icon;
                const isSelf = member.userId === user?.id;
                const isOnlyAdmin =
                  member.role === 'admin' &&
                  details.members.filter((m) => m.role === 'admin').length <= 1;

                return (
                  <div key={member.id} className="flex items-center gap-4 px-6 py-4">
                    {/* Avatar */}
                    <div className="from-primary/60 to-accent/60 bg-linear-to-br flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
                      {member.user?.display_name?.[0]?.toUpperCase() ||
                        member.user?.email?.[0]?.toUpperCase() ||
                        '?'}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">
                          {member.user?.display_name || member.user?.email || 'Unknown'}
                        </p>
                        {isSelf && (
                          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-muted truncate text-sm">{member.user?.email}</p>
                    </div>

                    {/* Role Badge */}
                    <div className="relative">
                      {isAdmin && !isOnlyAdmin ? (
                        <button
                          onClick={() =>
                            setRoleDropdown(roleDropdown === member.userId ? null : member.userId)
                          }
                          className={`hover:bg-hover flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${roleInfo.color}`}
                          disabled={changingRole}
                        >
                          <RoleIcon size={14} />
                          {roleInfo.label}
                          <ChevronDown size={14} />
                        </button>
                      ) : (
                        <span
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium ${roleInfo.color}`}
                        >
                          <RoleIcon size={14} />
                          {roleInfo.label}
                        </span>
                      )}

                      {/* Role dropdown */}
                      {roleDropdown === member.userId && (
                        <div className="bg-surface border-border absolute right-0 top-full z-10 mt-1 w-32 rounded-xl border py-1 shadow-xl">
                          {['admin', 'member', 'viewer'].map((r) => (
                            <button
                              key={r}
                              onClick={() => handleChangeRole(member.userId, r)}
                              className={`hover:bg-hover w-full px-3 py-2 text-left text-sm capitalize transition-colors ${
                                member.role === r ? 'text-primary font-semibold' : ''
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Remove */}
                    {isAdmin && !isOnlyAdmin && (
                      <button
                        onClick={() => setRemoveConfirm(member.userId)}
                        className="text-muted hover:text-danger rounded-lg p-1.5 transition-colors"
                        title={isSelf ? 'Leave household' : 'Remove member'}
                      >
                        {isSelf ? <LogOut size={16} /> : <UserMinus size={16} />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ─── Danger Zone ───────────────────────────── */}
          <section className="border-danger/30 bg-surface rounded-2xl border p-6">
            <h2 className="text-danger mb-2 text-lg font-bold">Danger Zone</h2>
            <p className="text-muted mb-4 text-sm">Sign out of your account.</p>
            <button
              onClick={signOut}
              className="bg-danger/10 text-danger hover:bg-danger/20 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </section>
        </div>
      )}

      {/* Remove Confirm Modal */}
      {removeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface border-border w-full max-w-sm space-y-4 rounded-2xl border p-6 shadow-xl">
            <h2 className="text-lg font-bold">
              {removeConfirm === user?.id ? 'Leave Household?' : 'Remove Member?'}
            </h2>
            <p className="text-muted text-sm">
              {removeConfirm === user?.id
                ? 'You will lose access to this household and its data.'
                : 'This person will lose access to the household.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRemoveConfirm(null)}
                className="border-border hover:bg-hover flex-1 rounded-xl border px-4 py-2.5 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveMember(removeConfirm)}
                className="bg-danger flex-1 rounded-xl px-4 py-2.5 font-medium text-white transition-opacity hover:opacity-90"
              >
                {removeConfirm === user?.id ? 'Leave' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
