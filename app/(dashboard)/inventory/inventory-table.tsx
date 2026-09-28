"use client";

import { useMemo, useState } from "react";
import { Search, Download } from "lucide-react";

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
import { downloadCsv } from "@/lib/utils/csv-export";

export type InventoryRow = {
  id: string;
  productName: string;
  categoryName: string;
  barcode: string | null;
  locationId: string;
  locationName: string;
  locationType: "warehouse" | "pos";
  quantity: number;
};

type LocationOption = { id: string; name: string; type: "warehouse" | "pos" };

const LOW_STOCK_THRESHOLD = 5;

export function InventoryTable({
  rows,
  locations,
}: {
  rows: InventoryRow[];
  locations: LocationOption[];
}) {
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesLocation = locationFilter === "all" || row.locationId === locationFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        row.productName.toLowerCase().includes(normalizedSearch) ||
        (row.barcode ?? "").toLowerCase().includes(normalizedSearch);
      return matchesLocation && matchesSearch;
    });
  }, [rows, locationFilter, search]);

  function handleExportCsv() {
    downloadCsv(
      "المخزون",
      filteredRows.map((row) => ({
        الصنف: row.productName,
        التصنيف: row.categoryName,
        الباركود: row.barcode ?? "",
        الموقع: row.locationName,
        النوع: row.locationType === "warehouse" ? "مستودع" : "منفذ بيع",
        الكمية: row.quantity,
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
              placeholder="بحث باسم الصنف أو الباركود..."
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
              <SelectItem value="all">كل المواقع</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="button" variant="outline" onClick={handleExportCsv}>
          <Download className="ml-2 h-4 w-4" /> تصدير CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الصنف</TableHead>
              <TableHead className="text-right">التصنيف</TableHead>
              <TableHead className="text-right">الباركود</TableHead>
              <TableHead className="text-right">الموقع</TableHead>
              <TableHead className="text-right">الكمية المتوفرة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  لا توجد نتائج مطابقة
                </TableCell>
              </TableRow>
            )}
            {filteredRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.productName}</TableCell>
                <TableCell>{row.categoryName}</TableCell>
                <TableCell>{row.barcode ?? "—"}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    {row.locationName}
                    <Badge variant={row.locationType === "warehouse" ? "secondary" : "outline"}>
                      {row.locationType === "warehouse" ? "مستودع" : "منفذ بيع"}
                    </Badge>
                  </span>
                </TableCell>
                <TableCell
                  className={
                    row.quantity <= LOW_STOCK_THRESHOLD ? "font-bold text-red-600" : "font-medium"
                  }
                >
                  {row.quantity}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
