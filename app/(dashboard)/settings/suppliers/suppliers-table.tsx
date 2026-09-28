"use client";

import { useState } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  createSupplier,
  toggleSupplierActive,
  updateSupplier,
  type SupplierAdminRow,
} from "@/lib/actions/suppliers";

export function SuppliersTable({ initialSuppliers }: { initialSuppliers: SupplierAdminRow[] }) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingPhone, setEditingPhone] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setIsCreating(true);
    try {
      const result = await createSupplier(newName, newPhone);
      if (!result.success) {
        setCreateError(result.error);
        return;
      }
      setIsCreateOpen(false);
      setNewName("");
      setNewPhone("");
      window.location.reload();
    } finally {
      setIsCreating(false);
    }
  }

  function startEditing(supplier: SupplierAdminRow) {
    setEditingId(supplier.id);
    setEditingName(supplier.name);
    setEditingPhone(supplier.phone ?? "");
  }

  async function saveEditing(supplierId: string) {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    setSuppliers((prev) =>
      prev.map((s) => (s.id === supplierId ? { ...s, name: trimmed, phone: editingPhone.trim() || null } : s)),
    );
    setEditingId(null);
    await updateSupplier(supplierId, trimmed, editingPhone);
  }

  async function handleToggleActive(supplier: SupplierAdminRow) {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === supplier.id ? { ...s, isActive: !s.isActive } : s)),
    );
    await toggleSupplierActive(supplier.id, !supplier.isActive);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setIsCreateOpen((v) => !v)}>
          <Plus className="ml-2 h-4 w-4" /> مورد جديد
        </Button>
      </div>

      {isCreateOpen && (
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 rounded-lg border bg-white p-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>اسم المورد</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>رقم الهاتف (اختياري)</Label>
            <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
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
              <TableHead className="text-right">اسم المورد</TableHead>
              <TableHead className="text-right">الهاتف</TableHead>
              <TableHead className="text-right">عدد الفواتير</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell>
                  {editingId === supplier.id ? (
                    <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} className="h-8" />
                  ) : (
                    <span className="font-medium">{supplier.name}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === supplier.id ? (
                    <Input value={editingPhone} onChange={(e) => setEditingPhone(e.target.value)} className="h-8" />
                  ) : (
                    supplier.phone ?? "—"
                  )}
                </TableCell>
                <TableCell>{supplier.purchasesCount}</TableCell>
                <TableCell>
                  <button type="button" onClick={() => handleToggleActive(supplier)}>
                    <Badge variant={supplier.isActive ? "secondary" : "outline"} className="cursor-pointer">
                      {supplier.isActive ? "مفعّل" : "معطّل"}
                    </Badge>
                  </button>
                </TableCell>
                <TableCell>
                  {editingId === supplier.id ? (
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => saveEditing(supplier.id)}>
                        <Check className="h-4 w-4 text-green-700" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" variant="ghost" size="icon" onClick={() => startEditing(supplier)}>
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
