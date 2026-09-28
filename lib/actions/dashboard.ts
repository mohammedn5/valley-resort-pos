"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

// يُستخدم فقط للمنتجات التي لم يُحدَّد لها حد أدنى مخصَّص (minStockLevel)
const DEFAULT_LOW_STOCK_THRESHOLD = 5;
const RECENT_PURCHASES_LIMIT = 10;

export type TopStats = {
  totalSalesToday: number;
  totalCashToday: number;
  totalCardToday: number;
  totalOrdersToday: number;
  activeShiftsCount: number;
  totalPosLocations: number;
};

export type LocationBreakdownRow = {
  locationId: string;
  locationName: string;
  cashToday: number;
  cardToday: number;
  totalToday: number;
  ordersToday: number;
  shiftStatus: "open" | "closed";
};

export type LowStockRow = {
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  quantity: number;
  threshold: number;
};

export type RecentPurchaseRow = {
  id: string;
  invoiceNumber: string | null;
  supplierName: string;
  destinationLocationName: string;
  totalCost: number;
  purchasedAt: string;
  invoiceImagePath: string;
  status: "active" | "cancelled";
};

export type DashboardData = {
  topStats: TopStats;
  locationBreakdown: LocationBreakdownRow[];
  lowStockItems: LowStockRow[];
  recentPurchases: RecentPurchaseRow[];
};

export async function getDashboardData(): Promise<DashboardData> {
  await requirePermission("reports.view");

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [posLocations, todaysOrders, openShifts, allStocks, recentPurchases] = await Promise.all([
    prisma.location.findMany({ where: { type: "pos", isActive: true }, orderBy: { name: "asc" } }),
    prisma.order.findMany({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      select: { locationId: true, cashAmount: true, cardAmount: true, totalAmount: true },
    }),
    prisma.shift.findMany({ where: { status: "open" }, select: { locationId: true } }),
    prisma.inventoryStock.findMany({
      where: { product: { isActive: true } },
      include: { product: true, location: true },
    }),
    prisma.purchase.findMany({
      include: { destinationLocation: true },
      orderBy: { createdAt: "desc" },
      take: RECENT_PURCHASES_LIMIT,
    }),
  ]);

  const openShiftLocationIds = new Set(openShifts.map((s) => s.locationId));

  const topStats: TopStats = {
    totalSalesToday: todaysOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
    totalCashToday: todaysOrders.reduce((sum, o) => sum + Number(o.cashAmount), 0),
    totalCardToday: todaysOrders.reduce((sum, o) => sum + Number(o.cardAmount), 0),
    totalOrdersToday: todaysOrders.length,
    activeShiftsCount: openShifts.length,
    totalPosLocations: posLocations.length,
  };

  const locationBreakdown: LocationBreakdownRow[] = posLocations.map((location) => {
    const locationOrders = todaysOrders.filter((o) => o.locationId === location.id);
    return {
      locationId: location.id,
      locationName: location.name,
      cashToday: locationOrders.reduce((sum, o) => sum + Number(o.cashAmount), 0),
      cardToday: locationOrders.reduce((sum, o) => sum + Number(o.cardAmount), 0),
      totalToday: locationOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
      ordersToday: locationOrders.length,
      shiftStatus: openShiftLocationIds.has(location.id) ? "open" : "closed",
    };
  });

  // كل صنف له حده الأدنى الخاص إن حُدِّد (minStockLevel)، وإلا يُستخدم الحد
  // الافتراضي العام. هذا يجعل تنبيه "المخزون الحرج" دقيقاً لكل صنف على حدة
  // بدل رقم ثابت واحد يناسب بعض الأصناف ولا يناسب غيرها.
  const lowStockItems: LowStockRow[] = allStocks
    .map((entry) => ({
      productId: entry.productId,
      productName: entry.product.name,
      locationId: entry.locationId,
      locationName: entry.location.name,
      quantity: Number(entry.quantity),
      threshold: entry.product.minStockLevel ?? DEFAULT_LOW_STOCK_THRESHOLD,
    }))
    .filter((item) => item.quantity <= item.threshold)
    .sort((a, b) => a.quantity - b.quantity);

  const recentPurchasesData: RecentPurchaseRow[] = recentPurchases.map((purchase) => ({
    id: purchase.id,
    invoiceNumber: purchase.invoiceNumber,
    supplierName: purchase.supplierName,
    destinationLocationName: purchase.destinationLocation.name,
    totalCost: Number(purchase.totalCost),
    purchasedAt: purchase.purchasedAt.toISOString(),
    invoiceImagePath: purchase.invoiceImagePath,
    status: purchase.status,
  }));

  return {
    topStats,
    locationBreakdown,
    lowStockItems,
    recentPurchases: recentPurchasesData,
  };
}
