// ============================================================
// أدوات مساعدة لتسويات المخزون (Waste / Damage / Count Adjustments)
// ============================================================
// ملاحظة معمارية: هذا الملف عادي (بدون توجيه العميل/السيرفر الخاص بالإجراءات)
// لأنه لا يحتوي على أي دالة تُنفَّذ على السيرفر (لا اتصال بقاعدة بيانات، لا
// صلاحيات) - إنما ثوابت وتحويلات نصية بحتة. Next.js يشترط أن تكون كل دالة
// مُصدَّرة من ملف Server Actions غير متزامنة (async)؛ إبقاء هذه الدوال البسيطة
// هنا يتفادى هذا القيد تماماً ويجعلها قابلة للاستيراد من مكونات العميل مباشرة
// دون أي Round Trip للسيرفر.

export const ADJUSTMENT_REASON_LABELS = {
  damaged: "تالف",
  expired: "منتهي الصلاحية",
  lost: "فقدان",
  found: "زيادة جرد (عُثر عليه)",
  count_correction: "تصحيح جرد",
  other: "أخرى",
} as const;

export type AdjustmentReasonKey = keyof typeof ADJUSTMENT_REASON_LABELS;

export function getAdjustmentReasonLabel(reason: string): string {
  return (ADJUSTMENT_REASON_LABELS as Record<string, string>)[reason] ?? reason;
}

export function getAdjustmentReasonOptions(): { value: AdjustmentReasonKey; label: string }[] {
  return (Object.entries(ADJUSTMENT_REASON_LABELS) as [AdjustmentReasonKey, string][]).map(
    ([value, label]) => ({ value, label }),
  );
}
