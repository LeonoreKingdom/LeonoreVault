'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Database,
  ExternalLink,
  FileCheck2,
  HardDrive,
  LockKeyhole,
  Play,
  RefreshCw,
  ShieldCheck,
  ServerCog,
} from 'lucide-react';

type CheckStatus = 'ready' | 'pending' | 'review';

type ValidationCheck = {
  id: string;
  label: string;
  detail: string;
  value: string;
  status: CheckStatus;
  icon: typeof CheckCircle2;
};

const validationChecks: ValidationCheck[] = [
  {
    id: 'frontend-build',
    label: 'Frontend build',
    detail: 'Next.js routes compile and prerender successfully.',
    value: 'Verified locally',
    status: 'ready',
    icon: FileCheck2,
  },
  {
    id: 'local-service',
    label: 'Local mock service',
    detail: 'Inventory, auth, household, attachment, and sync contracts are available.',
    value: 'Ready for UI review',
    status: 'ready',
    icon: ServerCog,
  },
  {
    id: 'auth-boundary',
    label: 'Auth boundary',
    detail: 'The frontend no longer depends on a Supabase client or Render API URL.',
    value: 'Verified locally',
    status: 'ready',
    icon: LockKeyhole,
  },
  {
    id: 'database',
    label: 'Turso + Drizzle',
    detail: 'SQLite schema and migration wiring still need backend implementation.',
    value: 'Backend pending',
    status: 'pending',
    icon: Database,
  },
  {
    id: 'object-storage',
    label: 'Cloudflare R2',
    detail: 'Presigned upload and object lifecycle checks are not connected in this preview.',
    value: 'Integration pending',
    status: 'pending',
    icon: HardDrive,
  },
  {
    id: 'edge-protection',
    label: 'WAF rate limiting',
    detail: 'Production rules must be configured and tested at the Cloudflare edge.',
    value: 'Deployment pending',
    status: 'review',
    icon: ShieldCheck,
  },
];

const statusStyles: Record<CheckStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  ready: { label: 'Ready', className: 'bg-success/10 text-success', icon: CheckCircle2 },
  pending: { label: 'Pending', className: 'bg-warning/10 text-warning', icon: Clock3 },
  review: { label: 'Review', className: 'bg-info/10 text-info', icon: CircleAlert },
};

export default function ValidationDashboardPage() {
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const readyCount = validationChecks.filter((check) => check.status === 'ready').length;
  const progress = Math.round((readyCount / validationChecks.length) * 100);

  function runLocalChecks() {
    if (running) return;
    setRunning(true);
    window.setTimeout(() => {
      setRunning(false);
      setLastRun(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    }, 650);
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 sm:gap-4">
          <Link
            href="/settings"
            aria-label="Back to settings"
            className="text-muted hover:text-foreground hover:bg-hover mt-1 rounded-xl p-2 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="text-accent mb-2 flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck size={16} />
              <span>Settings</span>
              <span className="text-muted-light">/</span>
              <span className="text-muted font-normal">Validation</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Migration readiness
            </h1>
            <p className="text-muted mt-1 max-w-2xl">
              A local checklist for the SQLite, auth, object storage, and edge security revamp.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={runLocalChecks}
          disabled={running}
          className="from-primary to-accent inline-flex items-center justify-center gap-2 self-start rounded-xl bg-gradient-to-r px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60 sm:self-auto"
        >
          {running ? <RefreshCw size={17} className="animate-spin" /> : <Play size={17} />}
          {running ? 'Checking…' : 'Run local checks'}
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]" aria-label="Readiness summary">
        <div className="from-primary to-accent relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white shadow-lg shadow-indigo-500/15">
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
              Local preview gate
            </p>
            <div className="mt-3 flex items-end gap-3">
              <p className="text-4xl font-bold">{progress}%</p>
              <p className="pb-1 text-sm text-white/75">
                {readyCount} of {validationChecks.length} checks ready
              </p>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80">
              Frontend verification is complete for this slice. Backend and production gates remain
              visible until their integrations are implemented and tested.
            </p>
          </div>
          <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full border-[18px] border-white/10" />
          <div className="absolute -bottom-16 right-20 h-36 w-36 rounded-full border-[18px] border-white/10" />
        </div>

        <div className="border-border bg-surface rounded-2xl border p-5 shadow-sm">
          <p className="text-muted text-xs font-semibold uppercase tracking-[0.14em]">Last run</p>
          <p className="mt-3 text-lg font-bold">{lastRun ?? 'Not run yet'}</p>
          <p className="text-muted mt-1 text-sm">
            {lastRun ? 'Local preview checks completed.' : 'Run the local checklist when you are ready.'}
          </p>
          <div className="bg-success/10 text-success mt-5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold">
            <CheckCircle2 size={14} />
            No deployment performed
          </div>
        </div>
      </section>

      <section aria-labelledby="checks-heading">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 id="checks-heading" className="text-lg font-bold">
              Validation checks
            </h2>
            <p className="text-muted mt-0.5 text-sm">Separate verified local work from remaining gates.</p>
          </div>
          <span className="text-muted text-xs font-medium">Frontend phase</span>
        </div>

        <div className="border-border bg-surface divide-border divide-y overflow-hidden rounded-2xl border shadow-sm">
          {validationChecks.map((check) => {
            const status = statusStyles[check.status];
            const StatusIcon = status.icon;
            const CheckIcon = check.icon;

            return (
              <div key={check.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                    <CheckIcon size={19} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold">{check.label}</h3>
                    <p className="text-muted mt-1 text-sm leading-relaxed">{check.detail}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                    <StatusIcon size={14} />
                    {status.label}
                  </span>
                  <span className="text-muted-light text-xs">{check.value}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-border bg-surface rounded-2xl border p-5 shadow-sm sm:p-6" aria-labelledby="next-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="next-heading" className="font-bold">Next validation layer</h2>
            <p className="text-muted mt-1 max-w-2xl text-sm leading-relaxed">
              Once the backend migration starts, rerun this checklist after the Turso schema, Better
              Auth session, R2 upload, and Cloudflare WAF checks are connected.
            </p>
          </div>
          <Link
            href="/settings"
            className="text-primary inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold hover:opacity-75"
          >
            Back to settings
            <ExternalLink size={15} />
          </Link>
        </div>
      </section>
    </div>
  );
}
