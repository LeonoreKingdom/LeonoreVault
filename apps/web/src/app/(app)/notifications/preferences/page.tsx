'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, Bell, Check, Clock3, Mail, Package, RotateCcw, Users } from 'lucide-react';

type PreferenceKey =
  | 'dueSoon'
  | 'overdue'
  | 'returns'
  | 'itemUpdates'
  | 'householdActivity'
  | 'weeklySummary';

type Preferences = Record<PreferenceKey, boolean> & { pauseAll: boolean };

const initialPreferences: Preferences = {
  dueSoon: true,
  overdue: true,
  returns: true,
  itemUpdates: false,
  householdActivity: true,
  weeklySummary: false,
  pauseAll: false,
};

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<Preferences>(initialPreferences);
  const [saved, setSaved] = useState(false);

  const enabledCount = useMemo(
    () => Object.values(preferences).filter(Boolean).length - (preferences.pauseAll ? 1 : 0),
    [preferences],
  );

  const updatePreference = (key: PreferenceKey | 'pauseAll') => {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
    setSaved(false);
  };

  const savePreferences = () => {
    setSaved(true);
  };

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <Link
          href="/notifications"
          className="text-muted hover:text-primary inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
        >
          <ArrowLeft size={16} />
          Back to notifications
        </Link>
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <Bell size={20} />
          </div>
          <div>
            <div className="text-primary mb-1 text-sm font-semibold">
              Notifications / Preferences
            </div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Choose what reaches you
            </h1>
            <p className="text-muted mt-1 max-w-2xl">
              Keep the useful reminders and quiet the updates that can wait. These preferences are
              saved locally for now.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          <section
            className="border-border bg-surface overflow-hidden rounded-2xl border shadow-sm"
            aria-labelledby="return-reminders-heading"
          >
            <div className="border-border border-b px-5 py-5 sm:px-6">
              <h2 id="return-reminders-heading" className="font-bold">
                Return reminders
              </h2>
              <p className="text-muted mt-1 text-sm">Stay ahead of items that need to come home.</p>
            </div>
            <div className="divide-border divide-y">
              <PreferenceRow
                icon={Clock3}
                title="Due soon"
                description="Remind me one day before a return date."
                checked={preferences.dueSoon}
                disabled={preferences.pauseAll}
                onChange={() => updatePreference('dueSoon')}
              />
              <PreferenceRow
                icon={Clock3}
                title="Overdue items"
                description="Tell me when an item has passed its return date."
                checked={preferences.overdue}
                disabled={preferences.pauseAll}
                onChange={() => updatePreference('overdue')}
              />
              <PreferenceRow
                icon={RotateCcw}
                title="Returned items"
                description="Show me when someone marks an item as returned."
                checked={preferences.returns}
                disabled={preferences.pauseAll}
                onChange={() => updatePreference('returns')}
              />
            </div>
          </section>

          <section
            className="border-border bg-surface overflow-hidden rounded-2xl border shadow-sm"
            aria-labelledby="activity-updates-heading"
          >
            <div className="border-border border-b px-5 py-5 sm:px-6">
              <h2 id="activity-updates-heading" className="font-bold">
                Household activity
              </h2>
              <p className="text-muted mt-1 text-sm">
                Choose which changes you want to see in your inbox.
              </p>
            </div>
            <div className="divide-border divide-y">
              <PreferenceRow
                icon={Package}
                title="Item updates"
                description="Notify me when an item, location, or quantity changes."
                checked={preferences.itemUpdates}
                disabled={preferences.pauseAll}
                onChange={() => updatePreference('itemUpdates')}
              />
              <PreferenceRow
                icon={Users}
                title="Household activity"
                description="Show activity from other members of this household."
                checked={preferences.householdActivity}
                disabled={preferences.pauseAll}
                onChange={() => updatePreference('householdActivity')}
              />
              <PreferenceRow
                icon={Mail}
                title="Weekly summary"
                description="Receive a weekly recap of returns and reminders."
                checked={preferences.weeklySummary}
                disabled={preferences.pauseAll}
                onChange={() => updatePreference('weeklySummary')}
              />
            </div>
          </section>

          <section
            className="border-danger/20 bg-danger/[0.035] flex items-center justify-between gap-4 rounded-2xl border p-5 sm:p-6"
            aria-labelledby="pause-notifications-heading"
          >
            <div className="min-w-0">
              <h2 id="pause-notifications-heading" className="font-bold">
                Pause all notifications
              </h2>
              <p className="text-muted mt-1 text-sm">
                Temporarily hide every reminder and activity update.
              </p>
            </div>
            <Toggle
              checked={preferences.pauseAll}
              onChange={() => updatePreference('pauseAll')}
              label="Pause all notifications"
            />
          </section>

          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-end">
            {saved && (
              <p
                className="text-success flex items-center gap-1.5 text-sm font-medium"
                role="status"
              >
                <Check size={16} />
                Preferences saved locally
              </p>
            )}
            <button
              type="button"
              onClick={savePreferences}
              className="from-primary to-accent inline-flex items-center gap-2 rounded-xl bg-gradient-to-r px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90"
            >
              <Check size={16} />
              Save preferences
            </button>
          </div>
        </div>

        <aside className="space-y-6">
          <section
            className="border-border bg-surface rounded-2xl border p-5 shadow-sm"
            aria-labelledby="preference-summary-heading"
          >
            <div className="bg-primary/10 text-primary mb-4 flex h-9 w-9 items-center justify-center rounded-xl">
              <Bell size={18} />
            </div>
            <h2 id="preference-summary-heading" className="font-bold">
              Your notification rhythm
            </h2>
            <p className="text-muted mt-1 text-sm">
              {preferences.pauseAll
                ? 'Everything is paused for now.'
                : `${enabledCount} notification types are active.`}
            </p>
            <div className="bg-hover mt-5 h-2 overflow-hidden rounded-full">
              <div
                className="from-primary to-accent h-full rounded-full bg-gradient-to-r transition-all"
                style={{ width: `${preferences.pauseAll ? 0 : (enabledCount / 6) * 100}%` }}
              />
            </div>
            <p className="text-muted mt-3 text-xs">You can change these choices at any time.</p>
          </section>

          <section
            className="border-border bg-surface rounded-2xl border p-5 shadow-sm"
            aria-labelledby="local-state-heading"
          >
            <div className="bg-accent/10 text-accent mb-4 flex h-9 w-9 items-center justify-center rounded-xl">
              <Check size={18} />
            </div>
            <h2 id="local-state-heading" className="font-bold">
              Prototype settings
            </h2>
            <p className="text-muted mt-1 text-sm leading-relaxed">
              This prototype keeps changes in the current session. Account-level syncing will be
              connected later.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function PreferenceRow({
  icon: Icon,
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  icon: typeof Clock3;
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 sm:px-6">
      <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
        <Icon size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-muted mt-0.5 text-xs leading-relaxed">{description}</p>
      </div>
      <Toggle checked={checked} disabled={disabled} onChange={onChange} label={title} />
    </div>
  );
}

function Toggle({
  checked,
  disabled = false,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${
        checked ? 'bg-primary' : 'bg-muted-light/50'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
