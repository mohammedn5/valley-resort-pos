"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import type { LocationOption } from "@/lib/actions/locations";
import { searchProductsWithStock, searchProducts, type ProductWithStockResult } from "@/lib/actions/products";
import { createAdjustment } from "@/lib/actions/adjustments";
import type { AdjustmentReasonKey } from "@/lib/utils/adjustments";
import { toEnglishDigits, parseLocalizedInt } from "@/lib/utils/digits";

export function AdjustmentForm({
  locations,
  reasonOptions,
}: {
  locations: LocationOption[];
  reasonOptions: { value: AdjustmentReasonKey; label: string }[];
}) {
  const router = useRouter();

  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [direction, setDirection] = useState<"decrease" | "increase">("decrease");
  const [reason, setReason] = useState<AdjustmentReasonKey>("damaged");
  const [reasonNote, setReasonNote] = useState("");
  const [quantity, setQuantity] = useState("1");

  const [product, setProduct] = useState<ProductWithStockResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductWithStockResult[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSearchChange(query: string) {
    setSearchQuery(query);
    setProduct(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (query.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      // للنقص: نعرض فقط الأصناف التي لها رصيد فعلي بهذا الموقع (لا يمكن إتلاف
      // ما لا يوجد). للزيادة (تصحيح جرد/عُثر عليه): نبحث في كل الأصناف.
      const results =
        direction === "decrease"
          ? await searchProductsWithStock(query, locationId)
          : (await searchProducts(query)).map((p) => ({ ...p, availableQuantity: 0 }));
      setSearchResults(results);
    }, 300);
  }

  function selectProduct(p: ProductWithStockResult) {
    setProduct(p);
    setSearchQuery(p.name);
    setSearchResults([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!product) {
      setFormError("يجب اختيار صنف من نتائج البحث");
      return;
    }

    const parsedQuantity = parseLocalizedInt(quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setFormError("الكمية يجب أن تكون رقماً صحيحاً أكبر من صفر");
      return;
    }

    if (direction === "decrease" && parsedQuantity > product.availableQuantity) {
      setFormError(`الكمية المطلوب خصمها أكبر من الرصيد المتوفر (${product.availableQuantity})`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createAdjustment({
        productId: product.id,
        locationId,
        quantity: parsedQuantity,
        direction,
        reason,
        reasonNote,
      });

      if (!result.success) {
        setFormError(result.error);
        return;
      }

      setSuccessMessage("تم تسجيل التسوية وتحديث المخزون بنجاح");
      setProduct(null);
      setSearchQuery("");
      setQuantity("1");
      setReasonNote("");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-white p-4">
      {formError && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{formError}</p>}
      {successMessage && <p className="rounded-md bg-green-50 p-2 text-sm text-green-700">{successMessage}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>الموقع</Label>
          <Select
            value={locationId}
            onValueChange={(v) => {
              setLocationId(v);
              setProduct(null);
              setSearchQuery("");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>نوع التسوية</Label>
          <Select value={direction} onValueChange={(v) => setDirection(v as "decrease" | "increase")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="decrease">نقص (تالف / هدر / فقدان)</SelectItem>
              <SelectItem value="increase">زيادة (عُثر عليه / تصحيح جرد)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="relative space-y-2">
        <Label>الصنف</Label>
        <Input
          placeholder="ابحث بالاسم أو الباركود..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        {searchResults.length > 0 && (
          <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-white shadow-lg">
            {searchResults.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => selectProduct(p)}
                className="flex w-full items-center justify-between px-3 py-2 text-right text-sm hover:bg-gray-100"
              >
                <span>{p.name}</span>
                {direction === "decrease" && (
                  <span className="text-xs text-muted-foreground">متوفر: {p.availableQuantity}</span>
                )}
              </button>
            ))}
          </div>
        )}
        {product && direction === "decrease" && (
          <p className="text-xs text-muted-foreground">المتوفر حالياً: {product.availableQuantity}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>الكمية (عدد صحيح)</Label>
          <Input
            type="text"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(toEnglishDigits(e.target.value).replace(/[^0-9]/g, ""))}
          />
        </div>
        <div className="space-y-2">
          <Label>السبب</Label>
          <Select value={reason} onValueChange={(v) => setReason(v as AdjustmentReasonKey)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {reasonOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>ملاحظة (اختياري)</Label>
        <Input value={reasonNote} onChange={(e) => setReasonNote(e.target.value)} placeholder="تفاصيل إضافية عن سبب التسوية" />
      </div>

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "جاري الحفظ..." : "تسجيل التسوية"}
      </Button>
    </form>
  );
}
