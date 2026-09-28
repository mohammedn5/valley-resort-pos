"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, History, Pencil, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { toggleProductActive, type ProductAdminRow } from "@/lib/actions/products";
import { downloadCsv } from "@/lib/utils/csv-export";
import { ProductFormModal } from "./product-form-modal";
import { ProductLedgerModal } from "./product-ledger-modal";

type CategoryOption = { id: string; name: string; locationId: string };
type LocationOption = { id: string; name: string; type: "warehouse" | "pos" };

const ALL_VALUE = "__all__";

export function ProductsTable({
  initialProducts,
  categories,
  locations,
}: {
  initialProducts: ProductAdminRow[];
  categories: CategoryOption[];
  locations: LocationOption[];
}) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState(ALL_VALUE);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");

  const [editingProduct, setEditingProduct] = useState<ProductAdminRow | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [ledgerProduct, setLedgerProduct] = useState<ProductAdminRow | null>(null);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesLocation = locationFilter === ALL_VALUE || p.locationId === locationFilter;
      const matchesStatus =
        statusFilter === "all" || (statusFilter === "active" ? p.isActive : !p.isActive);
      const matchesSearch =
        normalizedSearch.length === 0 ||
        p.name.toLowerCase().includes(normalizedSearch) ||
        (p.barcode ?? "").toLowerCase().includes(normalizedSearch);
      return matchesLocation && matchesStatus && matchesSearch;
    });
  }, [products, search, locationFilter, statusFilter]);

  function refreshAfterSave() {
    setEditingProduct(null);
    setIsCreateOpen(false);
    router.refresh();
    // إعادة التحميل الخفيفة لضمان أحدث بيانات فوراً في نفس الجدول
    window.location.reload();
  }

  async function handleToggleActive(product: ProductAdminRow) {
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, isActive: !p.isActive } : p)),
    );
    await toggleProductActive(product.id, !product.isActive);
  }

  function handleExportCsv() {
    downloadCsv(
      "المنتجات",
      filteredProducts.map((p) => ({
        الاسم: p.name,
        الباركود: p.barcode ?? "",
        التصنيف: p.categoryName,
        الموقع: p.locationName,
        "سعر البيع": p.price,
        "سعر الشراء المرجعي": p.costPrice ?? "",
        "الحد الأدنى": p.minStockLevel ?? "",
        الحالة: p.isActive ? "مفعّل" : "معطّل",
      })),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو الباركود..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="sm:max-w-xs">
              <SelectValue placeholder="كل المواقع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>كل المواقع</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="sm:max-w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">المفعّل فقط</SelectItem>
              <SelectItem value="inactive">المعطّل فقط</SelectItem>
              <SelectItem value="all">الكل</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={handleExportCsv}>
            <Download className="ml-2 h-4 w-4" /> تصدير CSV
          </Button>
          <Button type="button" onClick={() => setIsCreateOpen(true)}>
            <Plus className="ml-2 h-4 w-4" /> صنف جديد
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الصنف</TableHead>
              <TableHead className="text-right">التصنيف / الموقع</TableHead>
              <TableHead className="text-right">الباركود</TableHead>
              <TableHead className="text-right">سعر البيع</TableHead>
              <TableHead className="text-right">سعر الشراء</TableHead>
              <TableHead className="text-right">الحد الأدنى</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  لا توجد نتائج مطابقة
                </TableCell>
              </TableRow>
            )}
            {filteredProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {product.categoryName} - {product.locationName}
                </TableCell>
                <TableCell>{product.barcode ?? "—"}</TableCell>
                <TableCell>{product.price.toFixed(2)}</TableCell>
                <TableCell>{product.costPrice !== null ? product.costPrice.toFixed(2) : "—"}</TableCell>
                <TableCell>{product.minStockLevel ?? "—"}</TableCell>
                <TableCell>
                  <button type="button" onClick={() => handleToggleActive(product)}>
                    <Badge variant={product.isActive ? "secondary" : "outline"} className="cursor-pointer">
                      {product.isActive ? "مفعّل" : "معطّل"}
                    </Badge>
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => setEditingProduct(product)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setLedgerProduct(product)}>
                      <History className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {(isCreateOpen || editingProduct) && (
        <ProductFormModal
          product={editingProduct}
          categories={categories}
          locations={locations}
          onClose={() => {
            setIsCreateOpen(false);
            setEditingProduct(null);
          }}
          onSaved={refreshAfterSave}
        />
      )}

      {ledgerProduct && (
        <ProductLedgerModal
          productId={ledgerProduct.id}
          productName={ledgerProduct.name}
          onClose={() => setLedgerProduct(null)}
        />
      )}
    </div>
  );
}
