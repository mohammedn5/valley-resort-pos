"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, requirePermission } from "@/lib/auth";
import { recordStockMovement } from "@/lib/stock-movement";

// ================================================================
// البحث عن فاتورة للاسترجاع
// ================================================================

export type RefundableOrderItem = {
  orderItemId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  alreadyRefundedQuantity: number;
  refundableQuantity: number;
};

export type RefundableOrder = {
  orderId: string;
  displayNumber: string;
  locationId: string;
  locationName: string;
  shiftId: string;
  paymentMethod: "cash" | "card" | "split";
  totalAmount: number;
  cashAmount: number;
  cardAmount: number;
  createdAt: string;
  items: RefundableOrderItem[];
};

/**
 * يبحث عن فاتورة مُزامَنة (Order) برقمها المعروض للزبون (أول 8 خانات من
 * localOrderId، وهو نفس الرقم المطبوع على الإيصال الحراري)، أو بمعرّفها الكامل.
 * لا يمكن استرجاع فاتورة لم تُزامَن بعد مع السيرفر.
 */
export async function searchOrderForRefund(query: string): Promise<RefundableOrder | null> {
  await requirePermission("pos.refund");

  const trimmed = query.trim();
  if (!trimmed) return null;

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { localOrderId: { contains: trimmed, mode: "insensitive" } },
        { id: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    include: {
      location: true,
      items: { include: { product: true, refundItems: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!order) return null;

  return {
    orderId: order.id,
    displayNumber: order.localOrderId.slice(0, 8).toUpperCase(),
    locationId: order.locationId,
    locationName: order.location.name,
    shiftId: order.shiftId,
    paymentMethod: order.paymentMethod,
    totalAmount: Number(order.totalAmount),
    cashAmount: Number(order.cashAmount),
    cardAmount: Number(order.cardAmount),
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => {
      const alreadyRefundedQuantity = item.refundItems.reduce(
        (sum, refundItem) => sum + Number(refundItem.quantity),
        0,
      );
      const quantity = Number(item.quantity);

      return {
        orderItemId: item.id,
        productId: item.productId,
        productName: item.product.name,
        quantity,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
        alreadyRefundedQuantity,
        refundableQuantity: Math.max(0, quantity - alreadyRefundedQuantity),
      };
    }),
  };
}

// ================================================================
// تنفيذ الاسترجاع
// ================================================================

export type CreateRefundInput = {
  orderId: string;
  items: { orderItemId: string; quantity: number }[];
  cashAmount: number;
  cardAmount: number;
  reason: string;
};

export type CreateRefundResult = { success: true; refundId: string } | { success: false; error: string };

export async function createRefund(input: CreateRefundInput): Promise<CreateRefundResult> {
  await requirePermission("pos.refund");

  if (input.items.length === 0) {
    return { success: false, error: "يجب اختيار صنف واحد على الأقل للاسترجاع" };
  }

  const refundAmount = input.cashAmount + input.cardAmount;
  if (refundAmount <= 0) {
    return { success: false, error: "مبلغ الاسترجاع يجب أن يكون أكبر من صفر" };
  }

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { items: { include: { refundItems: true, product: true } } },
  });

  if (!order) return { success: false, error: "الفاتورة غير موجودة" };

  // التحقق من أن كل كمية مطلوب استرجاعها لا تتجاوز الكمية القابلة للاسترجاع فعلياً
  for (const requestedItem of input.items) {
    const orderItem = order.items.find((oi) => oi.id === requestedItem.orderItemId);
    if (!orderItem) {
      return { success: false, error: "أحد الأصناف المطلوب استرجاعها غير موجود في هذه الفاتورة" };
    }

    const alreadyRefunded = orderItem.refundItems.reduce((sum, r) => sum + Number(r.quantity), 0);
    const refundable = Number(orderItem.quantity) - alreadyRefunded;

    if (requestedItem.quantity <= 0 || requestedItem.quantity > refundable) {
      return {
        success: false,
        error: `الكمية المطلوب استرجاعها من "${orderItem.product.name}" أكبر من الكمية القابلة للاسترجاع (${refundable})`,
      };
    }
  }

  try {
    const currentUserId = await getCurrentUserId();

    const refundId = await prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          orderId: order.id,
          locationId: order.locationId,
          shiftId: order.shiftId,
          refundAmount,
          cashAmount: input.cashAmount,
          cardAmount: input.cardAmount,
          reason: input.reason.trim() || null,
          createdById: currentUserId,
        },
      });

      for (const requestedItem of input.items) {
        const orderItem = order.items.find((oi) => oi.id === requestedItem.orderItemId)!;
        const unitPrice = Number(orderItem.unitPrice);

        await tx.refundItem.create({
          data: {
            refundId: refund.id,
            orderItemId: orderItem.id,
            productId: orderItem.productId,
            quantity: requestedItem.quantity,
            subtotal: unitPrice * requestedItem.quantity,
          },
        });

        // إعادة الكمية المرتجعة لمخزون نفس المنفذ الذي بيعت منه
        await tx.inventoryStock.upsert({
          where: {
            productId_locationId: { productId: orderItem.productId, locationId: order.locationId },
          },
          update: { quantity: { increment: requestedItem.quantity } },
          create: {
            productId: orderItem.productId,
            locationId: order.locationId,
            quantity: requestedItem.quantity,
          },
        });

        await recordStockMovement(tx, {
          productId: orderItem.productId,
          locationId: order.locationId,
          type: "refund",
          quantityChange: requestedItem.quantity,
          referenceType: "Refund",
          referenceId: refund.id,
          note: `استرجاع من الفاتورة ${order.localOrderId.slice(0, 8).toUpperCase()}`,
          createdById: currentUserId,
        });
      }

      return refund.id;
    });

    revalidatePath("/inventory");
    revalidatePath("/refunds");

    return { success: true, refundId };
  } catch (error) {
    console.error("فشل تنفيذ عملية الاسترجاع:", error);
    return { success: false, error: "حدث خطأ غير متوقع أثناء تنفيذ الاسترجاع" };
  }
}

// ================================================================
// إجمالي المرتجعات لوردية معيّنة - يُستخدم عند إغلاق الوردية لحساب الصافي
// ================================================================

export type ShiftRefundTotals = {
  totalRefundCash: number;
  totalRefundCard: number;
  refundsCount: number;
};

export async function getShiftRefundTotals(shiftId: string): Promise<ShiftRefundTotals> {
  const refunds = await prisma.refund.findMany({ where: { shiftId } });

  return {
    totalRefundCash: refunds.reduce((sum, r) => sum + Number(r.cashAmount), 0),
    totalRefundCard: refunds.reduce((sum, r) => sum + Number(r.cardAmount), 0),
    refundsCount: refunds.length,
  };
}
