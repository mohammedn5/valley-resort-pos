import { z } from "zod";

export const transferItemSchema = z.object({
  productId: z.string().min(1, "يجب اختيار الصنف"),
  productName: z.string().min(1),
  quantity: z.coerce
    .number({ invalid_type_error: "الكمية يجب أن تكون رقماً" })
    .int("الكمية يجب أن تكون رقماً صحيحاً بدون فواصل عشرية")
    .positive("الكمية يجب أن تكون أكبر من صفر"),
  availableQuantity: z.coerce.number().nonnegative().optional(),
});

export const createTransferSchema = z
  .object({
    fromLocationId: z.string().min(1, "يجب اختيار الموقع المصدر"),
    toLocationId: z.string().min(1, "يجب اختيار الموقع المستلم"),
    items: z
      .array(transferItemSchema)
      .min(1, "يجب إضافة صنف واحد على الأقل للتحويل"),
  })
  .refine((data) => data.fromLocationId !== data.toLocationId, {
    message: "لا يمكن التحويل من وإلى نفس الموقع",
    path: ["toLocationId"],
  });

export type TransferItemInput = z.infer<typeof transferItemSchema>;
export type CreateTransferInput = z.infer<typeof createTransferSchema>;
