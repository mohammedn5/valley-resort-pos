"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FileText, Plus, Trash2, UploadCloud, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { LocationOption } from "@/lib/actions/locations";
import { searchProducts, type ProductSearchResult } from "@/lib/actions/products";
import { uploadInvoiceFile } from "@/lib/actions/upload-invoice";
import { createPurchase } from "@/lib/actions/purchases";
import { toEnglishDigits, parseLocalizedInt, parseLocalizedFloat } from "@/lib/utils/digits";

type ItemRow = {
  rowId: string;
  // منتج تم اختياره فعلياً من نتائج البحث (صنف موجود مسبقاً في قاعدة البيانات)
  product: ProductSearchResult | null;
  // النص المكتوب في حقل البحث - قد يكون اسم صنف موجود تم اختياره، أو اسم صنف
  // جديد كتبه المستخدم يدوياً ولم يختره من القائمة (سيُنشأ تلقائياً عند الحفظ)
  searchQuery: string;
  searchResults: ProductSearchResult[];
  isSearching: boolean;
  quantity: string;
  costPrice: string;
};

function createEmptyRow(): ItemRow {
  return {
    rowId: crypto.randomUUID(),
    product: null,
    searchQuery: "",
    searchResults: [],
    isSearching: false,
    quantity: "1",
    costPrice: "",
  };
}

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

export function PurchaseForm({ locations }: { locations: LocationOption[] }) {
  const router = useRouter();

  // ---- حقول رأس الفاتورة ----
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [destinationLocationId, setDestinationLocationId] = useState("");
  const [purchasedAt, setPurchasedAt] = useState(() => new Date().toISOString().slice(0, 10));

  // ---- رفع الملف ----
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- بنود الفاتورة ----
  const [items, setItems] = useState<ItemRow[]>([createEmptyRow()]);
  const searchTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ---- حالة الإرسال ----
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function validateAndSetFile(file: File) {
    setFileError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError("نوع الملف غير مدعوم. الصيغ المسموحة: JPG, PNG, WebP, PDF");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError("حجم الملف يتجاوز الحد المسموح (10 ميجابايت)");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setInvoiceFile(file);
    setPreviewUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  }

  function removeFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setInvoiceFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function updateRow(rowId: string, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)));
  }

  function removeRow(rowId: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((row) => row.rowId !== rowId) : prev));
  }

  function addRow() {
    setItems((prev) => [...prev, createEmptyRow()]);
  }

  // الكمية عدد صحيح فقط: نطبّع الأرقام العربية/الفارسية أولاً، ثم نمنع أي رمز
  // غير رقمي (بما في ذلك النقطة العشرية) من الاستقرار في الحقل أصلاً.
  function handleQuantityChange(rowId: string, rawValue: string) {
    const normalized = toEnglishDigits(rawValue).replace(/[^0-9]/g, "");
    updateRow(rowId, { quantity: normalized });
  }

  // سعر الشراء رقم عشري: نطبّع الأرقام فقط، ونُبقي النقطة العشرية الإنجليزية.
  function handleCostPriceChange(rowId: string, rawValue: string) {
    const normalized = toEnglishDigits(rawValue).replace(/[^0-9.]/g, "");
    updateRow(rowId, { costPrice: normalized });
  }

  // عند الكتابة في حقل البحث، نعتبر الصنف "غير مؤكد بعد" (product: null) إلى
  // أن يختار المستخدم صراحة من القائمة المنسدلة - لكن هذا لا يمنع حفظ الصف؛
  // فإن لم يتم الاختيار من القائمة، يُعامَل النص المكتوب كاسم صنف جديد تماماً
  // (انظر شرط الصلاحية في handleSubmit وملاحظة الإنشاء التلقائي في الواجهة).
  function handleSearchChange(rowId: string, query: string) {
    updateRow(rowId, { searchQuery: query, product: null, searchResults: [] });

    if (searchTimers.current[rowId]) clearTimeout(searchTimers.current[rowId]);

    if (query.trim().length < 1) return;

    updateRow(rowId, { isSearching: true });
    searchTimers.current[rowId] = setTimeout(async () => {
      const results = await searchProducts(query);
      updateRow(rowId, { searchResults: results, isSearching: false });
    }, 300);
  }

  function selectProduct(rowId: string, product: ProductSearchResult) {
    setItems((prev) =>
      prev.map((row) =>
        row.rowId === rowId
          ? {
              ...row,
              product,
              searchQuery: product.name,
              searchResults: [],
              // نملأ سعر الشراء بسعر بيع المنتج كقيمة مبدئية مقترحة فقط إن كان
              // الحقل لا يزال فارغاً، دون الكتابة فوق سعر أدخله المستخدم بالفعل
              costPrice: row.costPrice.trim() === "" ? String(product.price) : row.costPrice,
            }
          : row,
      ),
    );
  }

  const grandTotal = items.reduce((sum, row) => {
    const qty = parseLocalizedInt(row.quantity);
    const cost = parseLocalizedFloat(row.costPrice);
    return sum + (Number.isNaN(qty) ? 0 : qty) * (Number.isNaN(cost) ? 0 : cost);
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSuccessMessage(null);

    if (!invoiceFile) {
      setFileError("صورة أو ملف الفاتورة إلزامي قبل الحفظ");
      return;
    }

    if (!destinationLocationId) {
      setFormError("يجب اختيار وجهة التوريد");
      return;
    }

    // كل صف صالح إن توفر له "اسم صنف" (سواء عبر اختيار صنف موجود من نتائج
    // البحث، أو بكتابة اسم صنف جديد مباشرة في الحقل) + كمية صحيحة أكبر من صفر
    // + سعر شراء رقمي غير سالب. لا نشترط بعد الآن وجود productId، لأن الصنف
    // الجديد يُنشأ تلقائياً في الـ Server Action إن لم يكن موجوداً مسبقاً.
    const parsedItems = items.map((row) => {
      const productName = (row.product?.name ?? row.searchQuery).trim();
      return {
        row,
        productId: row.product?.id ?? null,
        productName,
        quantity: parseLocalizedInt(row.quantity),
        costPrice: parseLocalizedFloat(row.costPrice),
      };
    });

    const validItems = parsedItems.filter(
      (item) =>
        item.productName.length > 0 &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0 &&
        !Number.isNaN(item.costPrice) &&
        item.costPrice >= 0,
    );

    if (validItems.length === 0) {
      setFormError(
        "يجب إضافة صنف واحد على الأقل باسم صنف، وكمية صحيحة (عدد صحيح أكبر من صفر)، وسعر شراء صالح (رقم أكبر من أو يساوي صفر)",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // 1) رفع ملف الفاتورة أولاً
      const uploadFormData = new FormData();
      uploadFormData.append("file", invoiceFile);
      const uploadResult = await uploadInvoiceFile(uploadFormData);

      if (!uploadResult.success) {
        setFileError(uploadResult.error);
        return;
      }

      // 2) إنشاء فاتورة المشتريات مع بنودها - رقم الفاتورة اختياري، و productId
      // يُترك null لأي صنف جديد ليتولى الـ Server Action إنشاءه تلقائياً
      const result = await createPurchase({
        invoiceNumber: invoiceNumber.trim() || undefined,
        destinationLocationId,
        supplierName,
        purchasedAt: new Date(purchasedAt),
        invoiceImagePath: uploadResult.path,
        items: validItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          costPrice: item.costPrice,
        })),
      });

      if (!result.success) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setSuccessMessage("تم حفظ فاتورة المشتريات وتحديث المخزون بنجاح");
      setInvoiceNumber("");
      setSupplierName("");
      setDestinationLocationId("");
      setPurchasedAt(new Date().toISOString().slice(0, 10));
      removeFile();
      setItems([createEmptyRow()]);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {formError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {formError}
        </div>
      )}
      {successMessage && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {/* بيانات الفاتورة الأساسية */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="invoiceNumber">رقم فاتورة المورد (اختياري)</Label>
          <Input
            id="invoiceNumber"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="اتركه فارغاً لتوليد رقم داخلي تلقائياً"
          />
          <p className="text-xs text-muted-foreground">
            إن لم يوجد رقم فاتورة من المورد، اترك الحقل فارغاً وسيُنشئ النظام رقماً داخلياً تلقائياً (مثال: PUR-1732000000000).
          </p>
          {fieldErrors.invoiceNumber?.[0] && (
            <p className="text-xs text-red-600">{fieldErrors.invoiceNumber[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplierName">اسم المورد</Label>
          <Input
            id="supplierName"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            placeholder="اسم الشركة الموردة"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>وجهة التوريد</Label>
          <Select value={destinationLocationId} onValueChange={setDestinationLocationId}>
            <SelectTrigger>
              <SelectValue placeholder="اختر المستودع أو منفذ البيع" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name} {loc.type === "warehouse" ? "(مستودع)" : "(منفذ بيع)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="purchasedAt">تاريخ الشراء</Label>
          <Input
            id="purchasedAt"
            type="date"
            value={purchasedAt}
            onChange={(e) => setPurchasedAt(e.target.value)}
            required
          />
        </div>
      </section>

      {/* رفع صورة الفاتورة */}
      <section className="space-y-2">
        <Label>صورة أو ملف الفاتورة (إلزامي)</Label>

        {!invoiceFile ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            }`}
          >
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">اسحب وأفلت صورة الفاتورة هنا، أو اضغط للاختيار</p>
            <p className="text-xs text-muted-foreground">JPG, PNG, WebP أو PDF - الحد الأقصى 10 ميجابايت</p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) validateAndSetFile(file);
              }}
            />
          </div>
        ) : (
          <div className="flex items-center gap-4 rounded-lg border p-3">
            {previewUrl ? (
              <div className="relative h-20 w-20 overflow-hidden rounded-md border">
                <Image src={previewUrl} alt="معاينة الفاتورة" fill className="object-cover" unoptimized />
              </div>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-md border bg-muted">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{invoiceFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(invoiceFile.size / 1024).toFixed(0)} كيلوبايت
              </p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={removeFile}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {fileError && <p className="text-xs text-red-600">{fileError}</p>}
      </section>

      {/* جدول الأصناف */}
      <section className="space-y-3">
        <Label>بنود الفاتورة</Label>
        <p className="text-xs text-muted-foreground">
          اختر صنفاً من نتائج البحث، أو اكتب اسم صنف جديد غير موجود وسيتم إنشاؤه تلقائياً عند الحفظ.
        </p>
        <div className="overflow-visible rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الصنف</TableHead>
                <TableHead className="w-28 text-right">الكمية (عدد صحيح)</TableHead>
                <TableHead className="w-32 text-right">سعر الشراء</TableHead>
                <TableHead className="w-32 text-right">الإجمالي</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => {
                const qty = parseLocalizedInt(row.quantity);
                const cost = parseLocalizedFloat(row.costPrice);
                const lineTotal = (Number.isNaN(qty) ? 0 : qty) * (Number.isNaN(cost) ? 0 : cost);
                const typedNameWithNoSelection = !row.product && row.searchQuery.trim().length > 0;

                return (
                  <TableRow key={row.rowId}>
                    <TableCell>
                      <div className="relative">
                        <Input
                          placeholder="ابحث بالاسم أو الباركود، أو اكتب اسم صنف جديد..."
                          value={row.searchQuery}
                          onChange={(e) => handleSearchChange(row.rowId, e.target.value)}
                        />
                        {row.searchResults.length > 0 && (
                          <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-white shadow-lg">
                            {row.searchResults.map((product) => (
                              <button
                                type="button"
                                key={product.id}
                                onClick={() => selectProduct(row.rowId, product)}
                                className="flex w-full items-center justify-between px-3 py-2 text-right text-sm hover:bg-gray-100"
                              >
                                <span>{product.name}</span>
                                {product.barcode && (
                                  <span className="text-xs text-muted-foreground">{product.barcode}</span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                        {row.product && (
                          <p className="mt-1 text-xs text-green-700">✓ صنف موجود: {row.product.name}</p>
                        )}
                        {typedNameWithNoSelection && (
                          <p className="mt-1 text-xs text-amber-700">
                            ⚠ لم يتم اختيار صنف من القائمة - سيتم إنشاء صنف جديد باسم "{row.searchQuery.trim()}"
                            تلقائياً عند الحفظ.
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        step={1}
                        min={1}
                        value={row.quantity}
                        onChange={(e) => handleQuantityChange(row.rowId, e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="decimal"
                        step="0.01"
                        min={0}
                        value={row.costPrice}
                        onChange={(e) => handleCostPriceChange(row.rowId, e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{lineTotal.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(row.rowId)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <Button type="button" variant="outline" onClick={addRow}>
          <Plus className="ml-2 h-4 w-4" /> إضافة صنف
        </Button>
      </section>

      {/* الإجمالي والحفظ */}
      <section className="flex flex-col items-end gap-4 border-t pt-4">
        <div className="text-lg font-bold">
          إجمالي الفاتورة: <span className="text-primary">{grandTotal.toFixed(2)}</span> ر.س
        </div>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "جاري الحفظ..." : "حفظ الفاتورة وتحديث المخزون"}
        </Button>
      </section>
    </form>
  );
}
