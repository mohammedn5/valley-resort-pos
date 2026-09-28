"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Download, Eye, Pencil, Search } from "lucide-react";
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
import type { PurchaseListRow } from "@/lib/actions/purchases";
import type { LocationOption } from "@/lib/actions/locations";
import { downloadCsv } from "@/lib/utils/csv-export";
import { PurchaseDetailModal } from "./purchase-detail-modal";
import { PurchaseEditModal } from "./purchase-edit-modal";
import { PurchaseCancelModal } from "./purchase-cancel-modal";

const ALL_VALUE = "__all__";

export function PurchasesTable({
  initialPurchases,
  locations,
}: {
  initialPurchases: PurchaseListRow[];
  locations: LocationOption[];
}) {
  const router = useRouter();
  const [purchases] = useState(initialPurchases);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState(ALL_VALUE);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "cancelled">("active");

  const [detailId, setDetailId] = useState<string | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseListRow | null>(null);
  const [cancellingPurchase, setCancellingPurchase] = useState<PurchaseListRow | null>(null);

  const filteredPurchases = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return purchases.filter((p) => {
      const matchesLocation = locationFilter === ALL_VALUE || p.destinationLocationName === locations.find((l) => l.id === locationFilter)?.name;
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        (p.invoiceNumber ?? "").toLowerCase().includes(normalizedSearch) ||
        p.supplierName.toLowerCase().includes(normalizedSearch);
      return matchesLocation && matchesStatus && matchesSearch;
    });
  }, [purchases, search, locationFilter, statusFilter, locations]);

  function handleExportCsv() {
    downloadCsv(
      "فواتير_المشتريات",
      filteredPurchases.map((p) => ({
        "رقم الفاتورة": p.invoiceNumber ?? "",
        المورد: p.supplierName,
        الوجهة: p.destinationLocationName,
        الإجمالي: p.totalCost,
        التاريخ: new Date(p.purchasedAt).toLocaleDateString("ar-SA"),
        الحالة: p.status === "active" ? "نشطة" : "ملغاة",
        "أنشأها": p.createdByName,
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
              placeholder="بحث برقم الفاتورة أو المورد..."
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
              <SelectItem value="active">النشطة فقط</SelectItem>
              <SelectItem value="cancelled">الملغاة فقط</SelectItem>
              <SelectItem value="all">الكل</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="button" variant="outline" onClick={handleExportCsv}>
          <Download className="ml-2 h-4 w-4" /> تصدير CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">رقم الفاتورة</TableHead>
              <TableHead className="text-right">المورد</TableHead>
              <TableHead className="text-right">الوجهة</TableHead>
              <TableHead className="text-right">الإجمالي</TableHead>
              <TableHead className="text-right">التاريخ</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPurchases.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  لا توجد نتائج مطابقة
                </TableCell>
              </TableRow>
            )}
            {filteredPurchases.map((purchase) => (
              <TableRow key={purchase.id} className={purchase.status === "cancelled" ? "opacity-60" : ""}>
                <TableCell className="font-medium">{purchase.invoiceNumber ?? "—"}</TableCell>
                <TableCell>{purchase.supplierName}</TableCell>
                <TableCell>{purchase.destinationLocationName}</TableCell>
                <TableCell>{purchase.totalCost.toFixed(2)}</TableCell>
                <TableCell>{new Date(purchase.purchasedAt).toLocaleDateString("ar-SA")}</TableCell>
                <TableCell>
                  <Badge variant={purchase.status === "active" ? "secondary" : "destructive"}>
                    {purchase.status === "active" ? "نشطة" : "ملغاة"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => setDetailId(purchase.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {purchase.status === "active" && (
                      <>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setEditingPurchase(purchase)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setCancellingPurchase(purchase)}
                        >
                          <Ban className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {detailId && <PurchaseDetailModal purchaseId={detailId} onClose={() => setDetailId(null)} />}

      {editingPurchase && (
        <PurchaseEditModal
          purchase={editingPurchase}
          onClose={() => setEditingPurchase(null)}
          onSaved={() => {
            setEditingPurchase(null);
            router.refresh();
            window.location.reload();
          }}
        />
      )}

      {cancellingPurchase && (
        <PurchaseCancelModal
          purchase={cancellingPurchase}
          onClose={() => setCancellingPurchase(null)}
          onCancelled={() => {
            setCancellingPurchase(null);
            router.refresh();
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
