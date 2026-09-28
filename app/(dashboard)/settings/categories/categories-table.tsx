"use client";

import { useState } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
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
  createCategory,
  toggleCategoryActive,
  updateCategoryName,
  type CategoryAdminRow,
} from "@/lib/actions/categories";

type LocationOption = { id: string; name: string; type: "warehouse" | "pos" };

export function CategoriesTable({
  initialCategories,
  locations,
}: {
  initialCategories: CategoryAdminRow[];
  locations: LocationOption[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLocationId, setNewLocationId] = useState(locations[0]?.id ?? "");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setIsCreating(true);
    try {
      const result = await createCategory(newName, newLocationId);
      if (!result.success) {
        setCreateError(result.error);
        return;
      }
      setIsCreateOpen(false);
      setNewName("");
      window.location.reload();
    } finally {
      setIsCreating(false);
    }
  }

  function startEditing(category: CategoryAdminRow) {
    setEditingId(category.id);
    setEditingName(category.name);
  }

  async function saveEditing(categoryId: string) {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    setCategories((prev) => prev.map((c) => (c.id === categoryId ? { ...c, name: trimmed } : c)));
    setEditingId(null);
    await updateCategoryName(categoryId, trimmed);
  }

  async function handleToggleActive(category: CategoryAdminRow) {
    setCategories((prev) =>
      prev.map((c) => (c.id === category.id ? { ...c, isActive: !c.isActive } : c)),
    );
    await toggleCategoryActive(category.id, !category.isActive);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setIsCreateOpen((v) => !v)}>
          <Plus className="ml-2 h-4 w-4" /> تصنيف جديد
        </Button>
      </div>

      {isCreateOpen && (
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 rounded-lg border bg-white p-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>اسم التصنيف</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>الموقع</Label>
            <Select value={newLocationId} onValueChange={setNewLocationId}>
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
          <div className="flex items-end">
            <Button type="submit" disabled={isCreating} className="w-full">
              {isCreating ? "جاري الإنشاء..." : "إنشاء"}
            </Button>
          </div>
          {createError && <p className="text-sm text-red-600 sm:col-span-3">{createError}</p>}
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">التصنيف</TableHead>
              <TableHead className="text-right">الموقع</TableHead>
              <TableHead className="text-right">عدد الأصناف</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  {editingId === category.id ? (
                    <div className="flex items-center gap-1">
                      <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} className="h-8" />
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => saveEditing(category.id)}>
                        <Check className="h-4 w-4 text-green-700" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <span className="font-medium">{category.name}</span>
                  )}
                </TableCell>
                <TableCell>{category.locationName}</TableCell>
                <TableCell>{category.productsCount}</TableCell>
                <TableCell>
                  <button type="button" onClick={() => handleToggleActive(category)}>
                    <Badge variant={category.isActive ? "secondary" : "outline"} className="cursor-pointer">
                      {category.isActive ? "مفعّل" : "معطّل"}
                    </Badge>
                  </button>
                </TableCell>
                <TableCell>
                  {editingId !== category.id && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => startEditing(category)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
