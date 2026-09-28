"use client";

import { useEffect, useMemo, useState } from "react";
import { getOfflineDb, type LocalOrder } from "@/lib/db/offline-db";
import { syncEngine } from "@/lib/sync/sync-engine";
import { useCartStore, selectCartTotalAmount } from "@/lib/store/cart-store";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { useSyncStatus } from "@/lib/hooks/use-sync-status";

import { TopBar } from "./components/top-bar";
import { CategoryTabs } from "./components/category-tabs";
import { ProductGrid, type PosProduct } from "./components/product-grid";
import { CartSidebar } from "./components/cart-sidebar";
import { PaymentModal, type PaymentResult } from "./components/payment-modal";
import { ReceiptPrint, type ReceiptData } from "./components/receipt-print";
import { ShiftCloseModal } from "./components/shift-close-modal";

export type PosCategory = {
  id: string;
  name: string;
  products: PosProduct[];
};

type ActiveShiftInfo = {
  id: string;
  locationId: string;
  userId: string;
  userName: string;
  startTime: string;
};

export function PosTerminal({
  location,
  shift,
  menu,
}: {
  location: { id: string; name: string };
  shift: ActiveShiftInfo;
  menu: PosCategory[];
}) {
  const isOnline = useOnlineStatus();
  const syncStatus = useSyncStatus();

  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clear);
  const addItem = useCartStore((state) => state.addItem);
  const totalAmount = useCartStore(selectCartTotalAmount);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isShiftCloseModalOpen, setIsShiftCloseModalOpen] = useState(false);
  const [receiptToPrint, setReceiptToPrint] = useState<ReceiptData | null>(null);

  // بدء محرك المزامنة عند دخول شاشة الكاشير، وإيقافه عند مغادرتها
  useEffect(() => {
    syncEngine.start();
    return () => syncEngine.stop();
  }, []);

  // تخزين قائمة المنتجات والتصنيفات محلياً لتسريع العرض (Cache)
  useEffect(() => {
    async function hydrateOfflineCache() {
      const db = getOfflineDb();
      await db.transaction("rw", db.categories, db.products, async () => {
        await db.categories.bulkPut(menu.map((c) => ({ id: c.id, name: c.name, locationId: location.id })));
        await db.products.bulkPut(
          menu.flatMap((c) =>
            c.products.map((p) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              imageUrl: p.imageUrl,
              barcode: p.barcode,
              categoryId: p.categoryId,
              isActive: true,
            })),
          ),
        );
      });
    }
    void hydrateOfflineCache();
  }, [menu, location.id]);

  // طباعة الإيصال فور توفر بيانات فاتورة جديدة، ثم إخلاء منطقة الطباعة بعد الانتهاء
  useEffect(() => {
    if (!receiptToPrint) return;

    function handleAfterPrint() {
      setReceiptToPrint(null);
    }

    window.addEventListener("afterprint", handleAfterPrint);
    const timer = setTimeout(() => window.print(), 50);

    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
      clearTimeout(timer);
    };
  }, [receiptToPrint]);

  const visibleProducts = useMemo(() => {
    const allProducts = menu.flatMap((category) => category.products);
    if (selectedCategoryId === "all") return allProducts;
    return allProducts.filter((product) => product.categoryId === selectedCategoryId);
  }, [menu, selectedCategoryId]);

  // الرصيد الأصلي (وقت تحميل الشاشة) لكل صنف - أساس التحقق البصري من التوفر.
  // ملاحظة معمارية: هذا رصيد "استشاري" وليس ضمانة صارمة بنسبة 100% أثناء
  // العمل أوفلاين، لأن جهازين قد يبيعان آخر قطعة من نفس الصنف في نفس اللحظة
  // دون اتصال بينهما - وهذا تنازل متعمّد يفرضه مبدأ Offline-First نفسه (لا
  // يمكن التحقق من رصيد حي من السيرفر أثناء انقطاع الاتصال). لوحة التحكم
  // تكشف أي رصيد سالب ناتج عن هذا السيناريو النادر لمراجعته لاحقاً.
  const stockByProductId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const category of menu) {
      for (const product of category.products) {
        map[product.id] = product.stockQuantity;
      }
    }
    return map;
  }, [menu]);

  const cartQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of items) {
      map[item.productId] = item.quantity;
    }
    return map;
  }, [items]);

  function handleSelectProduct(product: PosProduct) {
    const inCart = cartQuantities[product.id] ?? 0;
    if (inCart >= product.stockQuantity) return; // الزر مُعطَّل أصلاً، هذا تحقق دفاعي إضافي
    addItem({ id: product.id, name: product.name, price: product.price });
  }

  async function handlePaymentConfirm(payment: PaymentResult) {
    const now = new Date();
    const localOrderId = crypto.randomUUID();

    const order: LocalOrder = {
      localOrderId,
      locationId: location.id,
      shiftId: shift.id,
      userId: shift.userId,
      items: items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.unitPrice * item.quantity,
      })),
      paymentMethod: payment.paymentMethod,
      cashAmount: payment.cashAmount,
      cardAmount: payment.cardAmount,
      totalAmount,
      syncStatus: "pending",
      createdAt: now.toISOString(),
    };

    // 1) الحفظ المحلي أولاً - لا ينتظر أي استجابة من الشبكة
    const db = getOfflineDb();
    await db.local_orders.put(order);

    // 2) تجهيز الإيصال للطباعة وتفريغ السلة فوراً لخدمة الزبون التالي
    setReceiptToPrint({
      displayNumber: localOrderId.slice(0, 8).toUpperCase(),
      locationName: location.name,
      cashierName: shift.userName,
      items: order.items,
      paymentMethod: order.paymentMethod,
      cashAmount: order.cashAmount,
      cardAmount: order.cardAmount,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
    });

    clearCart();
    setIsPaymentModalOpen(false);

    // 3) محاولة مزامنة فورية إن كان الجهاز متصلاً (لا تمنع أي شيء إن فشلت)
    syncEngine.triggerSync();
  }

  return (
    <>
      <div className="flex h-screen flex-col print:hidden" dir="rtl">
        <TopBar
          locationName={location.name}
          cashierName={shift.userName}
          isOnline={isOnline}
          pendingCount={syncStatus.pendingCount}
          onCloseShift={() => setIsShiftCloseModalOpen(true)}
        />

        <CategoryTabs
          categories={menu.map((c) => ({ id: c.id, name: c.name }))}
          selectedCategoryId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
        />

        <div className="flex flex-1 overflow-hidden">
          <ProductGrid products={visibleProducts} cartQuantities={cartQuantities} onSelect={handleSelectProduct} />
          <CartSidebar stockByProductId={stockByProductId} onCheckout={() => setIsPaymentModalOpen(true)} />
        </div>

        {isPaymentModalOpen && (
          <PaymentModal
            totalAmount={totalAmount}
            onConfirm={handlePaymentConfirm}
            onClose={() => setIsPaymentModalOpen(false)}
          />
        )}
      </div>

      {/*
        مهم جداً: ShiftCloseModal (ومكوّن ZReportPrint داخله) يجب أن يكون شقيقاً
        للحاوية أعلاه وليس متداخلاً بداخلها. الحاوية أعلاه تحمل الصنف
        print:hidden أي display:none عند الطباعة، و CSS يُخفي كل العناصر
        الفرعية بغض النظر عن أصنافها الخاصة إذا كان أحد آبائها display:none.
        لهذا كانت نافذة طباعة تقرير الإغلاق تظهر بيضاء تماماً رغم أن
        ZReportPrint نفسه يحمل print:block بشكل صحيح.
      */}
      {isShiftCloseModalOpen && (
        <ShiftCloseModal
          shiftId={shift.id}
          locationId={location.id}
          userId={shift.userId}
          locationName={location.name}
          cashierName={shift.userName}
          shiftStartTime={shift.startTime}
          onClose={() => setIsShiftCloseModalOpen(false)}
        />
      )}

      <ReceiptPrint data={receiptToPrint} />
    </>
  );
}
