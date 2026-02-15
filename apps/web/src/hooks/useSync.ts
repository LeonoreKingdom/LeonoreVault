'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { db, type DbSyncQueueItem } from '@/lib/db';
import { apiPost } from '@/lib/api';
import { useToastStore } from '@/components/Toast';

// ─── Types ──────────────────────────────────────────────────

interface SyncResult {
  entityId: string;
  type: string;
  status: 'applied' | 'conflict' | 'error';
  serverVersion?: Record<string, unknown>;
  message?: string;
}

interface SyncResponse {
  applied: SyncResult[];
  conflicts: SyncResult[];
}

interface UseSyncReturn {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncAt: number | null;
  syncNow: () => Promise<void>;
}

// ─── Hook ───────────────────────────────────────────────────

export function useSync(): UseSyncReturn {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const syncingRef = useRef(false);
  const addToast = useToastStore((s) => s.addToast);

  // ── Track online/offline ────────────────────────────────
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── Count pending items ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const count = await db.syncQueue.count();
        if (!cancelled) setPendingCount(count);
      } catch {
        // Dexie unavailable
      }
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // ── Sync logic ──────────────────────────────────────────
  const syncNow = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const pending = await db.syncQueue.toArray();
      if (pending.length === 0) {
        setIsSyncing(false);
        syncingRef.current = false;
        return;
      }

      // Group by householdId
      const byHousehold = new Map<string, DbSyncQueueItem[]>();
      for (const item of pending) {
        const existing = byHousehold.get(item.householdId) ?? [];
        existing.push(item);
        byHousehold.set(item.householdId, existing);
      }

      let totalConflicts = 0;
      const processedIds: number[] = [];

      for (const [householdId, items] of byHousehold) {
        const mutations = items.map((item) => ({
          type: item.type,
          table: item.table,
          entityId: item.entityId,
          payload: item.payload,
          updatedAt: item.createdAt,
        }));

        try {
          const result = await apiPost<SyncResponse>('/api/sync', {
            householdId,
            mutations,
          });

          // Mark applied mutations for removal
          for (const applied of result.applied) {
            const match = items.find((i) => i.entityId === applied.entityId);
            if (match?.id != null) processedIds.push(match.id);
          }

          // Handle conflicts
          for (const conflict of result.conflicts) {
            totalConflicts++;
            const match = items.find((i) => i.entityId === conflict.entityId);
            if (match?.id != null) processedIds.push(match.id); // Remove from queue regardless

            // Update local Dexie with server version if available
            if (conflict.serverVersion && conflict.status === 'conflict') {
              try {
                await db.items.put(conflict.serverVersion as never);
              } catch {
                // Non-fatal
              }
            }
          }
        } catch {
          // Network error — keep items in queue for retry
        }
      }

      // Remove processed items from queue
      if (processedIds.length > 0) {
        await db.syncQueue.bulkDelete(processedIds);
      }

      setPendingCount(await db.syncQueue.count());
      setLastSyncAt(Date.now());

      if (totalConflicts > 0) {
        addToast(
          'info',
          `${totalConflicts} sync conflict${totalConflicts > 1 ? 's' : ''}: server had newer changes`,
        );
      }

      if (processedIds.length > 0 && totalConflicts === 0) {
        addToast('success', 'All changes synced successfully');
      }
    } catch {
      // Queue read failure
    } finally {
      setIsSyncing(false);
      syncingRef.current = false;
    }
  }, [addToast]);

  // ── Auto-sync when coming online or when pending items exist
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncNow();
    }
  }, [isOnline, pendingCount, syncNow]);

  return { isOnline, pendingCount, isSyncing, lastSyncAt, syncNow };
}
