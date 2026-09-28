"use client";

import { useEffect, useState } from "react";
import { syncEngine, type SyncStatusSnapshot } from "@/lib/sync/sync-engine";

const initialSnapshot: SyncStatusSnapshot = {
  isSyncing: false,
  lastSyncAt: null,
  lastError: null,
  pendingCount: 0,
};

/** يشترك في محرك المزامنة ويعيد آخر حالة معروفة (عدد الفواتير المعلقة، آخر مزامنة، إلخ). */
export function useSyncStatus(): SyncStatusSnapshot {
  const [status, setStatus] = useState<SyncStatusSnapshot>(initialSnapshot);

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe(setStatus);
    return unsubscribe;
  }, []);

  return status;
}
