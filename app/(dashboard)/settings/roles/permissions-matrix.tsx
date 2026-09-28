"use client";

import { Fragment, useState, useTransition } from "react";
import { Plus } from "lucide-react";
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
import { createRole, togglePermission, type PermissionMatrixData } from "@/lib/actions/roles";

export function PermissionsMatrix({ matrix }: { matrix: PermissionMatrixData }) {
  const [assignments, setAssignments] = useState(matrix.assignments);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, startCreateTransition] = useTransition();

  async function handleToggle(roleId: string, permissionId: string) {
    const key = `${roleId}:${permissionId}`;
    const nextValue = !assignments[key];

    setAssignments((prev) => ({ ...prev, [key]: nextValue }));
    setPendingKeys((prev) => new Set(prev).add(key));

    const result = await togglePermission(roleId, permissionId, nextValue);

    setPendingKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });

    if (!result.success) {
      // التراجع عن التغيير محلياً في حال فشل الحفظ على السيرفر
      setAssignments((prev) => ({ ...prev, [key]: !nextValue }));
    }
  }

  function handleCreateRole(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);

    startCreateTransition(async () => {
      const result = await createRole(newRoleName, newRoleDescription);
      if (!result.success) {
        setCreateError(result.error);
        return;
      }
      setIsCreateOpen(false);
      setNewRoleName("");
      setNewRoleDescription("");
      window.location.reload();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={() => setIsCreateOpen((v) => !v)}>
          <Plus className="ml-2 h-4 w-4" /> دور جديد
        </Button>
      </div>

      {isCreateOpen && (
        <form onSubmit={handleCreateRole} className="grid grid-cols-1 gap-3 rounded-lg border bg-white p-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>اسم الدور</Label>
            <Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} required />
          </div>
          <div className="space-y-2 sm:col-span-1">
            <Label>الوصف (اختياري)</Label>
            <Input value={newRoleDescription} onChange={(e) => setNewRoleDescription(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={isCreating} className="w-full">
              {isCreating ? "جاري الإنشاء..." : "إنشاء الدور"}
            </Button>
          </div>
          {createError && <p className="text-sm text-red-600 sm:col-span-3">{createError}</p>}
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky right-0 min-w-[220px] bg-white text-right">الصلاحية</TableHead>
              {matrix.roles.map((role) => (
                <TableHead key={role.id} className="min-w-[120px] text-center">
                  {role.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrix.modules.map((group) => (
              <Fragment key={group.module}>
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={matrix.roles.length + 1} className="font-bold">
                    {group.module}
                  </TableCell>
                </TableRow>
                {group.permissions.map((permission) => (
                  <TableRow key={permission.id}>
                    <TableCell className="sticky right-0 bg-white">{permission.name}</TableCell>
                    {matrix.roles.map((role) => {
                      const key = `${role.id}:${permission.id}`;
                      const isChecked = Boolean(assignments[key]);
                      const isPending = pendingKeys.has(key);
                      return (
                        <TableCell key={role.id} className="text-center">
                          <input
                            type="checkbox"
                            className="h-5 w-5 cursor-pointer accent-primary disabled:opacity-50"
                            checked={isChecked}
                            disabled={isPending}
                            onChange={() => handleToggle(role.id, permission.id)}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
