// ============================================================
// محرك المزامنة التلقائي (Sync Engine)
// يستمع لعودة الاتصال ويزامن دورياً في الخلفية دون تدخل المستخدم
// ============================================================

import { getOfflineDb } from "@/lib/db/offline-db";
import { syncLocalOrders } from "@/lib/actions/sync";
import { closeShiftOnServer } from "@/lib/actions/shifts";

export type SyncStatusSnapshot = {
  isSyncing: boolean;
  lastSyncAt: Date | null;
  lastError: string | null;
  pendingCount: number;
};

type SyncListener = (status: SyncStatusSnapshot) => void;

const DEFAULT_INTERVAL_MS = 15_000;

class SyncEngine {
  private isSyncing = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<SyncListener>();
  private lastSyncAt: Date | null = null;
  private lastError: string | null = null;
  private started = false;

  start(intervalMs: number = DEFAULT_INTERVAL_MS) {
    if (typeof window === "undefined" || this.started) return;
    this.started = true;

    window.addEventListener("online", this.handleOnline);

    this.intervalId = setInterval(() => {
      if (navigator.onLine) void this.runSyncCycle();
    }, intervalMs);

    if (navigator.onLine) void this.runSyncCycle();
  }

  stop() {
    if (typeof window === "undefined") return;
    window.removeEventListener("online", this.handleOnline);
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.started = false;
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    void this.emitPendingCount();
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** يُستدعى فوراً بعد إنشاء فاتورة جديدة لمحاولة دفعها للسيرفر دون انتظار الدورة التالية. */
  triggerSync() {
    if (typeof window !== "undefined" && navigator.onLine) {
      void this.runSyncCycle();
    }
  }

  private handleOnline = () => {
    void this.runSyncCycle();
  };

  private async notify() {
    const pendingCount = await this.getPendingCount();
    const snapshot: SyncStatusSnapshot = {
      isSyncing: this.isSyncing,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
      pendingCount,
    };
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private async emitPendingCount() {
    await this.notify();
  }

  private async getPendingCount(): Promise<number> {
    try {
      const db = getOfflineDb();
      return await db.local_orders.where("syncStatus").anyOf(["pending", "failed"]).count();
    } catch {
      return 0;
    }
  }

  private async runSyncCycle(): Promise<void> {
    if (this.isSyncing) return;
    if (typeof window === "undefined" || !navigator.onLine) return;

    this.isSyncing = true;
    await this.notify();

    try {
      await this.syncPendingOrders();
      await this.syncPendingShiftClosures();
      this.lastSyncAt = new Date();
      this.lastError = null;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : "فشل الاتصال بالسيرفر أثناء المزامنة";
      console.error("فشل تنفيذ دورة المزامنة:", error);
    } finally {
      this.isSyncing = false;
      await this.notify();
    }
  }

  private async syncPendingOrders(): Promise<void> {
    const db = getOfflineDb();
    const pendingOrders = await db.local_orders.where("syncStatus").anyOf(["pending", "failed"]).toArray();

    if (pendingOrders.length === 0) return;

    const response = await syncLocalOrders(
      pendingOrders.map((order) => ({
        localOrderId: order.localOrderId,
        locationId: order.locationId,
        shiftId: order.shiftId,
        userId: order.userId,
        items: order.items,
        paymentMethod: order.paymentMethod,
        cashAmount: order.cashAmount,
        cardAmount: order.cardAmount,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
      })),
    );

    await db.transaction("rw", db.local_orders, async () => {
      for (const result of response.results) {
        if (result.status === "synced" || result.status === "already_synced") {
          await db.local_orders.update(result.localOrderId, {
            syncStatus: "synced",
            syncFailedReason: undefined,
          });
        } else {
          await db.local_orders.update(result.localOrderId, {
            syncStatus: "failed",
            syncFailedReason: result.error,
          });
        }
      }
    });
  }

  private async syncPendingShiftClosures(): Promise<void> {
    const db = getOfflineDb();
    const pendingClosures = await db.local_shifts
      .where("status")
      .equals("closed")
      .and((shift) => shift.syncStatus !== "synced")
      .toArray();

    for (const shift of pendingClosures) {
      try {
        const result = await closeShiftOnServer({
          shiftId: shift.shiftId,
          totalCash: shift.totalCash,
          totalCard: shift.totalCard,
          totalRefundCash: shift.totalRefundCash,
          totalRefundCard: shift.totalRefundCard,
          actualCashCounted: shift.actualCashCounted,
          endTime: shift.endTime ?? new Date().toISOString(),
        });

        if (result.success) {
          await db.local_shifts.update(shift.shiftId, { syncStatus: "synced" });
        } else {
          await db.local_shifts.update(shift.shiftId, { syncStatus: "failed" });
        }
      } catch (error) {
        console.error(`فشل مزامنة إغلاق الوردية ${shift.shiftId}:`, error);
        await db.local_shifts.update(shift.shiftId, { syncStatus: "failed" });
      }
    }
  }
}

export const syncEngine = new SyncEngine();
