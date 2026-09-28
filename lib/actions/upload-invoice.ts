"use server";

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "invoices");
const PUBLIC_PATH_PREFIX = "/uploads/invoices";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 ميجابايت
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ALLOWED_PDF_TYPE = "application/pdf";

export type UploadInvoiceResult =
  | { success: true; path: string }
  | { success: false; error: string };

export async function uploadInvoiceFile(formData: FormData): Promise<UploadInvoiceResult> {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { success: false, error: "لم يتم إرفاق أي ملف" };
  }

  if (file.size === 0) {
    return { success: false, error: "الملف المرفق فارغ" };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { success: false, error: "حجم الملف يتجاوز الحد المسموح به (10 ميجابايت)" };
  }

  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isPdf = file.type === ALLOWED_PDF_TYPE;

  if (!isImage && !isPdf) {
    return {
      success: false,
      error: "صيغة الملف غير مدعومة. الصيغ المسموحة: JPG, PNG, WebP, PDF",
    };
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const uniqueId = randomUUID();

  try {
    if (isImage) {
      const fileName = `${uniqueId}.webp`;
      const destination = path.join(UPLOAD_DIR, fileName);

      // ضغط الصورة وتحويلها إلى WebP بجودة جيدة مع تحديد أقصى عرض لتقليل الحجم
      await sharp(buffer)
        .rotate() // احترام بيانات EXIF للاتجاه (خصوصاً صور الجوال)
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(destination);

      return { success: true, path: `${PUBLIC_PATH_PREFIX}/${fileName}` };
    }

    // ملف PDF: يُحفظ كما هو دون تحويل
    const fileName = `${uniqueId}.pdf`;
    const destination = path.join(UPLOAD_DIR, fileName);
    await writeFile(destination, buffer);

    return { success: true, path: `${PUBLIC_PATH_PREFIX}/${fileName}` };
  } catch (error) {
    console.error("فشل رفع ملف الفاتورة:", error);
    return { success: false, error: "حدث خطأ أثناء معالجة الملف، حاول مرة أخرى" };
  }
}
