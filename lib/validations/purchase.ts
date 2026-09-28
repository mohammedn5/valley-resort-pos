import { z } from "zod";

export const purchaseItemSchema = z.object({
  // productId فارغ (null) يعني: "أنشئ هذا الصنف تلقائياً باسم productName" -
  // هذا يتيح كتابة اسم صنف جديد مباشرة دون إجبار المستخدم على اختيار صنف
  // مسجّل مسبقاً من نتائج البحث.
  productId: z.string().min(1).nullable(),
  productName: z
    .string()
    .trim()
    .min(1, "اسم الصنف مطلوب"),
  quantity: z.coerce
    .number({ invalid_type_error: "الكمية يجب أن تكون رقماً" })
    .int("الكمية يجب أن تكون رقماً صحيحاً بدون فواصل عشرية")
    .positive("الكمية يجب أن تكون أكبر من صفر"),
  costPrice: z.coerce
    .number({ invalid_type_error: "سعر الشراء يجب أن يكون رقماً" })
    .nonnegative("سعر الشراء لا يمكن أن يكون سالباً"),
});

export const createPurchaseSchema = z.object({
  // اختياري: إن تُرك فارغاً يُولَّد رقم داخلي تلقائياً في createPurchase()
  invoiceNumber: z
    .string()
    .max(100, "رقم الفاتورة طويل جداً")
    .optional()
    .or(z.literal("")),
  destinationLocationId: z.string().min(1, "يجب اختيار وجهة التوريد"),
  supplierName: z
    .string()
    .min(1, "اسم المورد إلزامي")
    .max(150, "اسم المورد طويل جداً"),
  purchasedAt: z.coerce.date({
    errorMap: () => ({ message: "تاريخ الشراء غير صالح" }),
  }),
  invoiceImagePath: z
    .string()
    .min(1, "رفع صورة أو ملف الفاتورة إلزامي قبل الحفظ"),
  items: z
    .array(purchaseItemSchema)
    .min(1, "يجب إضافة صنف واحد على الأقل للفاتورة"),
});

export type PurchaseItemInput = z.infer<typeof purchaseItemSchema>;
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
