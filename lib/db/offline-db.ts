// ============================================================
// نظام ERP / POS - منتجع فالي
// المرحلة 3: قاعدة البيانات المحلية (Dexie.js / IndexedDB)
// ============================================================
// ملاحظة معمارية: هذا الملف يُستخدم فقط من مكوّنات العميل ("use client").
// لا يجوز استيراده أو استدعاء getOfflineDb() أثناء أي عملية Server-Side
// Rendering لأن IndexedDB غير متاحة في بيئة Node.js.

import Dexie, { type Table } from "dexie";

export type LocalPaymentMethod = "cash" | "card" | "split";
export type SyncStatus = "pending" | "synced" | "failed";

export interface OfflineCategory {
  id: string;
  name: string;
  locationId: string;
}

export interface OfflineProduct {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  barcode: string | null;
  categoryId: string;
  isActive: boolean;
}

export interface LocalOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface LocalOrder {
  localOrderId: string; // المفتاح الأساسي - UUID يُولَّد على الجهاز
  locationId: string;
  shiftId: string;
  userId: string;
  items: LocalOrderItem[];
  paymentMethod: LocalPaymentMethod;
  cashAmount: number;
  cardAmount: number;
  totalAmount: number;
  syncStatus: SyncStatus;
  syncFailedReason?: string;
  createdAt: string; // ISO string
}

export interface LocalShift {
  shiftId: string; // نفس معرّف الوردية الصادر من السيرفر عند فتحها
  locationId: string;
  userId: string;
  startTime: string;
  endTime?: string;
  totalCash: number; // صافي الكاش بعد خصم المرتجعات
  totalCard: number; // صافي الشبكة بعد خصم المرتجعات
  totalRefundCash: number;
  totalRefundCard: number;
  actualCashCounted: number | null;
  status: "open" | "closed";
  syncStatus: SyncStatus;
}

class OfflineDatabase extends Dexie {
  categories!: Table<OfflineCategory, string>;
  products!: Table<OfflineProduct, string>;
  local_orders!: Table<LocalOrder, string>;
  local_shifts!: Table<LocalShift, string>;

  constructor() {
    super("valley_resort_pos_db");

    this.version(1).stores({
      categories: "id, locationId",
      products: "id, categoryId, barcode, isActive",
      local_orders: "localOrderId, shiftId, locationId, syncStatus, createdAt",
      local_shifts: "shiftId, locationId, status, syncStatus",
    });
  }
}

let dbInstance: OfflineDatabase | undefined;

/**
 * يعيد نسخة وحيدة (Singleton) من قاعدة البيانات المحلية.
 * يجب استدعاؤها فقط من داخل useEffect أو معالجات أحداث العميل، وليس أثناء الـ render
 * المباشر، لضمان عدم استدعائها أثناء أي تمرير على السيرفر.
 */
export function getOfflineDb(): OfflineDatabase {
  if (typeof window === "undefined") {
    throw new Error("قاعدة البيانات المحلية (offlineDb) متاحة فقط داخل المتصفح");
  }
  if (!dbInstance) {
    dbInstance = new OfflineDatabase();
  }
  return dbInstance;
}
