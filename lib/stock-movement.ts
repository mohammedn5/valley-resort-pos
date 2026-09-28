import type { Prisma, StockMovementType } from "@prisma/client";

type TransactionClient = Prisma.TransactionClient;

/**
 * يسجّل حركة واحدة في سجل تدقيق المخزون الموحّد (StockMovement). يجب استدعاؤها
 * دائماً بعد تنفيذ تحديث/إنشاء InventoryStock الفعلي بنفس المعاملة (tx)، حتى
 * تُقرأ balanceAfter الصحيحة بعد العملية مباشرة - وليس قبلها.
 */
export async function recordStockMovement(
  tx: TransactionClient,
  params: {
    productId: string;
    locationId: string;
    type: StockMovementType;
    quantityChange: number;
    referenceType?: string;
    referenceId?: string;
    note?: string;
    createdById: string;
  },
): Promise<void> {
  const stock = await tx.inventoryStock.findUnique({
    where: {
      productId_locationId: { productId: params.productId, locationId: params.locationId },
    },
  });

  const balanceAfter = stock ? Number(stock.quantity) : 0;

  await tx.stockMovement.create({
    data: {
      productId: params.productId,
      locationId: params.locationId,
      type: params.type,
      quantityChange: params.quantityChange,
      balanceAfter,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      note: params.note,
      createdById: params.createdById,
    },
  });
}
