"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, requirePermission } from "@/lib/auth";
import { createPurchaseSchema, type CreatePurchaseInput } from "@/lib/validations/purchase";
import { recordStockMovement } from "@/lib/stock-movement";

export type CreatePurchaseResult =
  | { success: true; purchaseId: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// التصنيف الافتراضي الذي تُوضع بداخله أي أصناف جديدة تُنشأ تلقائياً من شاشة
// المشتريات عند كتابة اسم صنف غير مسجّل مسبقاً في النظام
const GENERAL_CATEGORY_NAME = "عام";

type TransactionClient = Prisma.TransactionClient;

async function findOrCreateGeneralCategory(tx: TransactionClient, locationId: string) {
  const existingCategory = await tx.category.findFirst({
    where: { locationId, name: GENERAL_CATEGORY_NAME },
  });

  if (existingCategory) return existingCategory;

  return tx.category.create({
    data: { name: GENERAL_CATEGORY_NAME, locationId },
  });
}

async function findOrCreateProductForLocation(
  tx: TransactionClient,
  locationId: string,
  productName: string,
  suggestedPrice: number,
) {
  const existingProduct = await tx.product.findFirst({
    where: {
      name: { equals: productName, mode: "insensitive" },
      category: { locationId },
    },
  });

  if (existingProduct) return existingProduct;

  const generalCategory = await findOrCreateGeneralCategory(tx, locationId);

  return tx.product.create({
    data: {
      name: productName,
      categoryId: generalCategory.id,
      price: suggestedPrice,
      costPrice: suggestedPrice,
      isActive: true,
    },
  });
}

async function findOrCreateSupplierByName(
  tx: TransactionClient,
  supplierName: string,
): Promise<string | null> {
  const trimmed = supplierName.trim();
  if (!trimmed) return null;

  const existing = await tx.supplier.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) return existing.id;

  const created = await tx.supplier.create({ data: { name: trimmed, isActive: true } });
  return created.id;
}

export async function createPurchase(input: CreatePurchaseInput): Promise<CreatePurchaseResult> {
  await requirePermission("inventory.purchase");

  const parsed = createPurchaseSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "توجد بيانات غير صحيحة في النموذج",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;

  const invoiceNumber =
    data.invoiceNumber && data.invoiceNumber.trim().length > 0
      ? data.invoiceNumber.trim()
      : `PUR-${Date.now()}`;

  const existingInvoice = await prisma.purchase.findUnique({
    where: { invoiceNumber },
    select: { id: true },
  });

  if (existingInvoice) {
    return {
      success: false,
      error: "رقم الفاتورة مستخدم مسبقاً، الرجاء التأكد من الرقم",
      fieldErrors: { invoiceNumber: ["رقم الفاتورة مستخدم مسبقاً"] },
    };
  }

  const destination = await prisma.location.findUnique({
    where: { id: data.destinationLocationId },
  });

  if (!destination || !destination.isActive) {
    return { success: false, error: "وجهة التوريد المختارة غير موجودة أو معطّلة حالياً" };
  }

  const totalCost = data.items.reduce((sum, item) => sum + item.quantity * item.costPrice, 0);

  try {
    const currentUserId = await getCurrentUserId();

    const purchaseId = await prisma.$transaction(async (tx) => {
      const supplierId = await findOrCreateSupplierByName(tx, data.supplierName);

      const purchase = await tx.purchase.create({
        data: {
          invoiceNumber,
          destinationLocationId: data.destinationLocationId,
          supplierId,
          supplierName: data.supplierName.trim(),
          invoiceImagePath: data.invoiceImagePath,
          purchasedAt: data.purchasedAt,
          totalCost,
          createdById: currentUserId,
        },
      });

      for (const item of data.items) {
        const productId =
          item.productId ??
          (
            await findOrCreateProductForLocation(
              tx,
              data.destinationLocationId,
              item.productName,
              item.costPrice,
            )
          ).id;

        await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            productId,
            quantity: item.quantity,
            costPrice: item.costPrice,
            totalCost: item.quantity * item.costPrice,
          },
        });

        await tx.inventoryStock.upsert({
          where: {
            productId_locationId: { productId, locationId: data.destinationLocationId },
          },
          update: { quantity: { increment: item.quantity } },
          create: {
            productId,
            locationId: data.destinationLocationId,
            quantity: item.quantity,
          },
        });

        // تحديث سعر الشراء المرجعي للصنف ليعكس آخر سعر توريد فعلي
        await tx.product.update({
          where: { id: productId },
          data: { costPrice: item.costPrice },
        });

        await recordStockMovement(tx, {
          productId,
          locationId: data.destinationLocationId,
          type: "purchase",
          quantityChange: item.quantity,
          referenceType: "Purchase",
          referenceId: purchase.id,
          note: `توريد بفاتورة ${invoiceNumber}`,
          createdById: currentUserId,
        });
      }

      return purchase.id;
    });

    revalidatePath("/purchases");
    revalidatePath("/inventory");
    revalidatePath("/inventory/products");

    return { success: true, purchaseId };
  } catch (error) {
    console.error("فشل إنشاء فاتورة المشتريات:", error);
    return { success: false, error: "حدث خطأ غير متوقع أثناء حفظ الفاتورة، حاول مرة أخرى" };
  }
}

// ================================================================
// استعراض المشتريات (قائمة + تفصيل)
// ================================================================

export type PurchaseListRow = {
  id: string;
  invoiceNumber: string | null;
  supplierName: string;
  destinationLocationName: string;
  totalCost: number;
  purchasedAt: string;
  status: "active" | "cancelled";
  createdByName: string;
};

export type PurchaseFilters = {
  search?: string;
  locationId?: string;
  status?: "active" | "cancelled" | "all";
};

export async function getPurchases(filters: PurchaseFilters = {}): Promise<PurchaseListRow[]> {
  await requirePermission("inventory.purchase");

  const trimmedSearch = filters.search?.trim();

  const purchases = await prisma.purchase.findMany({
    where: {
      ...(filters.locationId ? { destinationLocationId: filters.locationId } : {}),
      ...(filters.status && filters.status !== "all" ? { status: filters.status } : {}),
      ...(trimmedSearch
        ? {
            OR: [
              { invoiceNumber: { contains: trimmedSearch, mode: "insensitive" } },
              { supplierName: { contains: trimmedSearch, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { destinationLocation: true, createdBy: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return purchases.map((p) => ({
    id: p.id,
    invoiceNumber: p.invoiceNumber,
    supplierName: p.supplierName,
    destinationLocationName: p.destinationLocation.name,
    totalCost: Number(p.totalCost),
    purchasedAt: p.purchasedAt.toISOString(),
    status: p.status,
    createdByName: p.createdBy.name,
  }));
}

export type PurchaseDetail = PurchaseListRow & {
  invoiceImagePath: string;
  cancelledAt: string | null;
  cancelledByName: string | null;
  cancellationReason: string | null;
  items: { productName: string; quantity: number; costPrice: number; totalCost: number }[];
};

export async function getPurchaseDetail(purchaseId: string): Promise<PurchaseDetail | null> {
  await requirePermission("inventory.purchase");

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: {
      destinationLocation: true,
      createdBy: true,
      cancelledBy: true,
      items: { include: { product: true } },
    },
  });

  if (!purchase) return null;

  return {
    id: purchase.id,
    invoiceNumber: purchase.invoiceNumber,
    supplierName: purchase.supplierName,
    destinationLocationName: purchase.destinationLocation.name,
    totalCost: Number(purchase.totalCost),
    purchasedAt: purchase.purchasedAt.toISOString(),
    status: purchase.status,
    createdByName: purchase.createdBy.name,
    invoiceImagePath: purchase.invoiceImagePath,
    cancelledAt: purchase.cancelledAt ? purchase.cancelledAt.toISOString() : null,
    cancelledByName: purchase.cancelledBy?.name ?? null,
    cancellationReason: purchase.cancellationReason,
    items: purchase.items.map((item) => ({
      productName: item.product.name,
      quantity: Number(item.quantity),
      costPrice: Number(item.costPrice),
      totalCost: Number(item.totalCost),
    })),
  };
}

// ================================================================
// تعديل بيانات الفاتورة الأساسية (Header فقط)
// ================================================================
// قرار معماري: تعديل بنود وكميات فاتورة محفوظة أمر خطير لأن الكمية قد تكون
// بيعت أو تحوّلت لموقع آخر بالفعل، فأي تعديل رجعي على الكمية قد يُنتج رصيداً
// سالباً بصمت أو يُفسد سجل التدقيق. لذلك: بيانات الفاتورة الوصفية (المورد،
// رقم الفاتورة، تاريخ الشراء، صورة الفاتورة) قابلة للتعديل مباشرة هنا، أما أي
// خطأ في الكميات أو الأصناف فيُصحَّح عبر إلغاء الفاتورة (cancelPurchase) - وهو
// إجراء آمن رياضياً موثّق أدناه - ثم تسجيل فاتورة توريد جديدة صحيحة.

export type UpdatePurchaseHeaderInput = {
  invoiceNumber: string | null;
  supplierName: string;
  purchasedAt: Date;
  invoiceImagePath?: string;
};

export type PurchaseMutationResult = { success: true } | { success: false; error: string };

export async function updatePurchaseHeader(
  purchaseId: string,
  input: UpdatePurchaseHeaderInput,
): Promise<PurchaseMutationResult> {
  await requirePermission("inventory.purchase");

  const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
  if (!purchase) return { success: false, error: "الفاتورة غير موجودة" };
  if (purchase.status === "cancelled") {
    return { success: false, error: "لا يمكن تعديل فاتورة ملغاة" };
  }

  const supplierName = input.supplierName.trim();
  if (!supplierName) return { success: false, error: "اسم المورد مطلوب" };

  const invoiceNumber = input.invoiceNumber?.trim() || null;
  if (invoiceNumber) {
    const duplicate = await prisma.purchase.findFirst({
      where: { invoiceNumber, id: { not: purchaseId } },
    });
    if (duplicate) return { success: false, error: "رقم الفاتورة مستخدم مسبقاً لفاتورة أخرى" };
  }

  await prisma.$transaction(async (tx) => {
    const supplierId = await findOrCreateSupplierByName(tx, supplierName);
    await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        invoiceNumber,
        supplierId,
        supplierName,
        purchasedAt: input.purchasedAt,
        ...(input.invoiceImagePath ? { invoiceImagePath: input.invoiceImagePath } : {}),
      },
    });
  });

  revalidatePath("/purchases");
  return { success: true };
}

// ================================================================
// إلغاء فاتورة شراء (يعكس المخزون بأمان تام)
// ================================================================

class InsufficientReversalStockError extends Error {
  constructor(public productName: string, public available: number, public required: number) {
    super(
      `لا يمكن إلغاء الفاتورة: الكمية المتبقية من "${productName}" في المخزون (${available}) أقل من الكمية المطلوب عكسها (${required}) - على الأرجح تم بيع أو تحويل جزء منها بالفعل`,
    );
  }
}

export async function cancelPurchase(
  purchaseId: string,
  reason: string,
): Promise<PurchaseMutationResult> {
  await requirePermission("inventory.purchase");

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { items: { include: { product: true } } },
  });

  if (!purchase) return { success: false, error: "الفاتورة غير موجودة" };
  if (purchase.status === "cancelled") {
    return { success: false, error: "الفاتورة ملغاة بالفعل" };
  }

  try {
    const currentUserId = await getCurrentUserId();

    await prisma.$transaction(async (tx) => {
      for (const item of purchase.items) {
        const quantity = Number(item.quantity);

        // خصم ذري: ينجح فقط إذا كانت الكمية المتبقية في المخزون كافية للعكس،
        // مما يمنع نشوء رصيد سالب ناتج عن إلغاء توريد بضاعة بيع جزء منها فعلاً
        const reversal = await tx.inventoryStock.updateMany({
          where: {
            productId: item.productId,
            locationId: purchase.destinationLocationId,
            quantity: { gte: quantity },
          },
          data: { quantity: { decrement: quantity } },
        });

        if (reversal.count === 0) {
          const currentStock = await tx.inventoryStock.findUnique({
            where: {
              productId_locationId: {
                productId: item.productId,
                locationId: purchase.destinationLocationId,
              },
            },
          });
          throw new InsufficientReversalStockError(
            item.product.name,
            currentStock ? Number(currentStock.quantity) : 0,
            quantity,
          );
        }

        await recordStockMovement(tx, {
          productId: item.productId,
          locationId: purchase.destinationLocationId,
          type: "purchase_cancelled",
          quantityChange: -quantity,
          referenceType: "Purchase",
          referenceId: purchase.id,
          note: `إلغاء فاتورة ${purchase.invoiceNumber ?? purchase.id}${reason ? ` - السبب: ${reason}` : ""}`,
          createdById: currentUserId,
        });
      }

      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancelledById: currentUserId,
          cancellationReason: reason.trim() || null,
        },
      });
    });

    revalidatePath("/purchases");
    revalidatePath("/inventory");
    revalidatePath("/inventory/products");

    return { success: true };
  } catch (error) {
    if (error instanceof InsufficientReversalStockError) {
      return { success: false, error: error.message };
    }
    console.error("فشل إلغاء فاتورة المشتريات:", error);
    return { success: false, error: "حدث خطأ غير متوقع أثناء إلغاء الفاتورة" };
  }
}
