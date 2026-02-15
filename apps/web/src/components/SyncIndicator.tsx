'use client';

import { useSync } from '@/hooks/useSync';

/**
 * SyncIndicator — shows sync status as a small pill/badge.
 * Displays: "All synced" / "N pending" / "Syncing..." / "Offline"
 */
export default function SyncIndicator() {
  const { isOnline, pendingCount, isSyncing, syncNow } = useSync();

  // Determine state + styling
  let label: string;
  let dotColor: string;
  let bgColor: string;
  let textColor: string;

  if (!isOnline) {
    label = 'Offline';
    dotColor = 'bg-amber-500';
    bgColor = 'bg-amber-500/10 dark:bg-amber-500/20';
    textColor = 'text-amber-700 dark:text-amber-400';
  } else if (isSyncing) {
    label = 'Syncing...';
    dotColor = 'bg-blue-500 animate-pulse';
    bgColor = 'bg-blue-500/10 dark:bg-blue-500/20';
    textColor = 'text-blue-700 dark:text-blue-400';
  } else if (pendingCount > 0) {
    label = `${pendingCount} pending`;
    dotColor = 'bg-orange-500';
    bgColor = 'bg-orange-500/10 dark:bg-orange-500/20';
    textColor = 'text-orange-700 dark:text-orange-400';
  } else {
    label = 'All synced';
    dotColor = 'bg-emerald-500';
    bgColor = 'bg-emerald-500/10 dark:bg-emerald-500/20';
    textColor = 'text-emerald-700 dark:text-emerald-400';
  }

  const canSync = isOnline && pendingCount > 0 && !isSyncing;

  return (
    <button
      type="button"
      onClick={canSync ? syncNow : undefined}
      disabled={!canSync}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ${bgColor} ${textColor} ${canSync ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} `}
      title={canSync ? 'Click to sync now' : undefined}
    >
      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      {label}
    </button>
  );
}
