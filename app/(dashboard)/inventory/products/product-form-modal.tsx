"use client";

import { useState } from "react";
import { X } from "lucide-react";
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
import { createProduct, updateProduct, type ProductAdminRow } from "@/lib/actions/products";
import { toEnglishDigits } from "@/lib/utils/digits";

type CategoryOption = { id: string; name: string; locationId: string };
type LocationOption = { id: string; name: string; type: "warehouse" | "pos" };

export function ProductFormModal({
  product,
  categories,
  locations,
  onClose,
  onSaved,
}: {
  product: ProductAdminRow | null; // null = إنشاء جديد
  categories: CategoryOption[];
  locations: LocationOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [locationId, setLocationId] = useState(product?.locationId ?? locations[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [barcode, setBarcode] = useState(product?.barcode ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [costPrice, setCostPrice] = useState(product?.costPrice ? String(product.costPrice) : "");
  const [minStockLevel, setMinStockLevel] = useState(
    product?.minStockLevel !== null && product?.minStockLevel !== undefined ? String(product.minStockLevel) : "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoriesForLocation = categories.filter((c) => c.locationId === locationId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedPrice = parseFloat(toEnglishDigits(price));
    const parsedCostPrice = costPrice.trim() ? parseFloat(toEnglishDigits(costPrice)) : null;
    const parsedMinStock = minStockLevel.trim() ? parseInt(toEnglishDigits(minStockLevel), 10) : null;

    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setError("سعر البيع غير صالح");
      return;
    }

    setIsSubmitting(true);
    try {
      const input = {
        name,
        categoryId,
        barcode: barcode.trim() || null,
        price: parsedPrice,
        costPrice: parsedCostPrice,
        minStockLevel: parsedMinStock,
      };

      const result = product
        ? await updateProduct(product.id, input)
        : await createProduct(input);

      if (!result.success) {
        setError(result.error);
        return;
      }

      onSaved();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{product ? "تعديل الصنف" : "إضافة صنف جديد"}</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}

          <div className="space-y-2">
            <Label>الموقع</Label>
            <Select
              value={locationId}
              onValueChange={(v) => {
                setLocationId(v);
                setCategoryId("");
              }}
              disabled={!!product}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الموقع" />
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
            <Label>التصنيف</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر التصنيف" />
              </SelectTrigger>
              <SelectContent>
                {categoriesForLocation.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>اسم الصنف</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>سعر البيع</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(toEnglishDigits(e.target.value).replace(/[^0-9.]/g, ""))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>سعر الشراء المرجعي (اختياري)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={costPrice}
                onChange={(e) => setCostPrice(toEnglishDigits(e.target.value).replace(/[^0-9.]/g, ""))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الباركود (اختياري)</Label>
              <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>الحد الأدنى لإعادة الطلب (اختياري)</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={minStockLevel}
                onChange={(e) => setMinStockLevel(toEnglishDigits(e.target.value).replace(/[^0-9]/g, ""))}
              />
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || !categoryId}>
            {isSubmitting ? "جاري الحفظ..." : product ? "حفظ التعديلات" : "إنشاء الصنف"}
          </Button>
        </form>
      </div>
    </div>
  );
}
