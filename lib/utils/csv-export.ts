"use client";

/**
 * يحوّل مصفوفة كائنات إلى ملف CSV (متوافق مع Excel، بترميز UTF-8 مع BOM لدعم
 * العربية بشكل صحيح عند الفتح المباشر) ويبدأ تنزيله في المتصفح فوراً.
 * لا حاجة لأي طلب للسيرفر - التصدير يعمل بالكامل على البيانات المعروضة بالفعل.
 */
export function downloadCsv(filename: string, rows: Record<string, string | number>[]): void {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);

  function escapeCell(value: string | number): string {
    const stringValue = String(value ?? "");
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }

  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(",")),
  ];

  // BOM (\uFEFF) ضروري ليتعرف Excel على النص العربي بترميز UTF-8 الصحيح
  const csvContent = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
