"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Plus, Trash2 } from "lucide-react";

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
import { searchProductsWithStock, type ProductWithStockResult } from "@/lib/actions/products";
import { createStockTransfer } from "@/lib/actions/transfers";
import { toEnglishDigits, parseLocalizedInt } from "@/lib/utils/digits";

type ItemRow = {
  rowId: string;
  product: ProductWithStockResult | null;
  searchQuery: string;
  searchResults: ProductWithStockResult[];
  quantity: string;
};

function createEmptyRow(): ItemRow {
  return {
    rowId: crypto.randomUUID(),
    product: null,
    searchQuery: "",
    searchResults: [],
    quantity: "1",
  };
}

export function TransferForm({
  locations,
  defaultFromLocationId,
}: {
  locations: LocationOption[];
  defaultFromLocationId: string;
}) {
  const router = useRouter();

  // ملاحظة: القائمتان أدناه تعرضان كل المواقع المفعّلة على حد سواء (مستودع أو
  // منفذ بيع) دون أي تقييد - يمكن التحويل من أي موقع إلى أي موقع آخر، بما في
  // ذلك من منفذ بيع إلى منفذ بيع آخر مباشرة، أو من منفذ بيع إلى المستودع
  // الرئيسي (إرجاع بضاعة). التحقق الصارم من كفاية الرصيد يتم ذرياً في
  // createStockTransfer بغض النظر عن نوع الموقع المصدر.
  const [fromLocationId, setFromLocationId] = useState(defaultFromLocationId);
  const [toLocationId, setToLocationId] = useState("");
  const [items, setItems] = useState<ItemRow[]>([createEmptyRow()]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const searchTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function resetItemsForNewSource() {
    setItems([createEmptyRow()]);
  }

  function handleFromLocationChange(value: string) {
    setFromLocationId(value);
    resetItemsForNewSource();
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

  // الكمية عدد صحيح فقط - نطبّع أي أرقام عربية/فارسية أولاً، ثم نمنع أي رمز
  // غير رقمي من الاستقرار في الحقل (نفس معالجة شاشة المشتريات).
  function handleQuantityChange(rowId: string, rawValue: string) {
    const normalized = toEnglishDigits(rawValue).replace(/[^0-9]/g, "");
    updateRow(rowId, { quantity: normalized });
  }

  function handleSearchChange(rowId: string, query: string) {
    updateRow(rowId, { searchQuery: query, product: null, searchResults: [] });

    if (!fromLocationId) return;
    if (searchTimers.current[rowId]) clearTimeout(searchTimers.current[rowId]);

    searchTimers.current[rowId] = setTimeout(async () => {
      const results = await searchProductsWithStock(query, fromLocationId);
      updateRow(rowId, { searchResults: results });
    }, 300);
  }

  function selectProduct(rowId: string, product: ProductWithStockResult) {
    updateRow(rowId, { product, searchQuery: product.name, searchResults: [] });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!fromLocationId || !toLocationId) {
      setFormError("يجب اختيار الموقع المصدر والموقع المستلم");
      return;
    }

    if (fromLocationId === toLocationId) {
      setFormError("لا يمكن التحويل من وإلى نفس الموقع");
      return;
    }

    // نحوّل الكمية إلى عدد صحيح صريح بعد تطبيع الأرقام قبل أي مقارنة، لتفادي
    // فشل التحقق بصمت مع أرقام مُدخلة بصيغة غير إنجليزية.
    const parsedItems = items.map((row) => ({
      row,
      quantity: parseLocalizedInt(row.quantity),
    }));

    const validItems = parsedItems.filter(
      (item) => item.row.product && Number.isInteger(item.quantity) && item.quantity > 0,
    );

    if (validItems.length === 0) {
      setFormError("يجب إضافة صنف واحد على الأقل بكمية صحيحة (عدد صحيح أكبر من صفر)");
      return;
    }

    const overLimitItem = validItems.find(
      (item) => item.quantity > (item.row.product?.availableQuantity ?? 0),
    );
    if (overLimitItem) {
      setFormError(
        `الكمية المطلوبة لـ "${overLimitItem.row.product?.name}" أكبر من المتوفر (${overLimitItem.row.product?.availableQuantity})`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createStockTransfer({
        fromLocationId,
        toLocationId,
        items: validItems.map((item) => ({
          productId: item.row.product!.id,
          productName: item.row.product!.name,
          quantity: item.quantity,
          availableQuantity: item.row.product!.availableQuantity,
        })),
      });

      if (!result.success) {
        setFormError(result.error);
        return;
      }

      setSuccessMessage("تم تنفيذ التحويل المخزني بنجاح");
      resetItemsForNewSource();
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <div className="space-y-2">
          <Label>الموقع المصدر (أي مستودع أو منفذ بيع)</Label>
          <Select value={fromLocationId} onValueChange={handleFromLocationChange}>
            <SelectTrigger>
              <SelectValue placeholder="اختر الموقع المصدر" />
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

        <ArrowLeftRight className="mb-2 hidden h-5 w-5 text-muted-foreground sm:block" />

        <div className="space-y-2">
          <Label>الموقع المستلم (أي مستودع أو منفذ بيع آخر)</Label>
          <Select value={toLocationId} onValueChange={setToLocationId}>
            <SelectTrigger>
              <SelectValue placeholder="اختر الموقع المستلم" />
            </SelectTrigger>
            <SelectContent>
              {locations
                .filter((loc) => loc.id !== fromLocationId)
                .map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name} {loc.type === "warehouse" ? "(مستودع)" : "(منفذ بيع)"}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-visible rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الصنف (المتوفر بالمصدر)</TableHead>
              <TableHead className="w-28 text-right">الكمية (عدد صحيح)</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => (
              <TableRow key={row.rowId}>
                <TableCell>
                  <div className="relative">
                    <Input
                      placeholder={fromLocationId ? "ابحث بالاسم أو الباركود..." : "اختر الموقع المصدر أولاً"}
                      value={row.searchQuery}
                      disabled={!fromLocationId}
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
                            <span className="text-xs text-muted-foreground">متوفر: {product.availableQuantity}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {row.product && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        المتوفر حالياً: {row.product.availableQuantity}
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
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(row.rowId)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Button type="button" variant="outline" onClick={addRow} disabled={!fromLocationId}>
        <Plus className="ml-2 h-4 w-4" /> إضافة صنف
      </Button>

      <div className="flex justify-end border-t pt-4">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "جاري تنفيذ التحويل..." : "تنفيذ التحويل"}
        </Button>
      </div>
    </form>
  );
}
