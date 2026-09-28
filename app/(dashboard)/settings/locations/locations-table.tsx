"use client";

import { useState } from "react";
import { Plus, Warehouse, Store } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  createLocation,
  toggleLocationActive,
  type LocationAdminRow,
} from "@/lib/actions/locations";

export function LocationsTable({ initialLocations }: { initialLocations: LocationAdminRow[] }) {
  const [locations, setLocations] = useState(initialLocations);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"warehouse" | "pos">("pos");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setIsCreating(true);

    try {
      const result = await createLocation(newName, newType);
      if (!result.success) {
        setCreateError(result.error);
        return;
      }

      setIsCreateOpen(false);
      setNewName("");
      setNewType("pos");
      window.location.reload();
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggleActive(locationId: string, isActive: boolean) {
    setLocations((prev) =>
      prev.map((loc) => (loc.id === locationId ? { ...loc, isActive } : loc)),
    );
    await toggleLocationActive(locationId, isActive);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setIsCreateOpen((v) => !v)}>
          <Plus className="ml-2 h-4 w-4" /> منفذ / موقع جديد
        </Button>
      </div>

      {isCreateOpen && (
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-1 gap-3 rounded-lg border bg-white p-4 sm:grid-cols-3"
        >
          <div className="space-y-2">
            <Label>اسم الموقع</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="مثال: كشك الشاطئ"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>النوع</Label>
            <Select value={newType} onValueChange={(v) => setNewType(v as "warehouse" | "pos")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pos">منفذ بيع (POS)</SelectItem>
                <SelectItem value="warehouse">مستودع (Warehouse)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={isCreating} className="w-full">
              {isCreating ? "جاري الإنشاء..." : "إنشاء الموقع"}
            </Button>
          </div>
          {createError && <p className="text-sm text-red-600 sm:col-span-3">{createError}</p>}
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">النوع</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map((location) => (
              <TableRow key={location.id}>
                <TableCell className="flex items-center gap-2 font-medium">
                  {location.type === "warehouse" ? (
                    <Warehouse className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Store className="h-4 w-4 text-muted-foreground" />
                  )}
                  {location.name}
                </TableCell>
                <TableCell>{location.type === "warehouse" ? "مستودع" : "منفذ بيع"}</TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(location.id, !location.isActive)}
                  >
                    <Badge variant={location.isActive ? "secondary" : "outline"} className="cursor-pointer">
                      {location.isActive ? "مفعّل" : "معطّل"}
                    </Badge>
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
