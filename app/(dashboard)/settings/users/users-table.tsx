"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
  createUser,
  toggleUserActive,
  updateUserLocation,
  updateUserRole,
  type LocationOption,
  type RoleOption,
  type UserListItem,
} from "@/lib/actions/users";

const UNASSIGNED_VALUE = "__unassigned__";

export function UsersTable({
  initialUsers,
  roles,
  locations,
}: {
  initialUsers: UserListItem[];
  roles: RoleOption[];
  locations: LocationOption[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRoleId, setNewRoleId] = useState("");
  const [newLocationId, setNewLocationId] = useState<string>(UNASSIGNED_VALUE);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setIsCreating(true);

    try {
      const result = await createUser({
        name: newName,
        username: newUsername,
        password: newPassword,
        roleId: newRoleId,
        locationId: newLocationId === UNASSIGNED_VALUE ? null : newLocationId,
      });

      if (!result.success) {
        setCreateError(result.error);
        return;
      }

      setIsCreateOpen(false);
      setNewName("");
      setNewUsername("");
      setNewPassword("");
      setNewRoleId("");
      setNewLocationId(UNASSIGNED_VALUE);
      window.location.reload();
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRoleChange(userId: string, roleId: string) {
    const role = roles.find((r) => r.id === roleId);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, roleId, roleName: role?.name ?? u.roleName } : u)));
    await updateUserRole(userId, roleId);
  }

  async function handleLocationChange(userId: string, locationId: string) {
    const resolvedId = locationId === UNASSIGNED_VALUE ? null : locationId;
    const location = locations.find((l) => l.id === resolvedId);
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, locationId: resolvedId, locationName: location?.name ?? null } : u,
      ),
    );
    await updateUserLocation(userId, resolvedId);
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive } : u)));
    await toggleUserActive(userId, isActive);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setIsCreateOpen((v) => !v)}>
          <Plus className="ml-2 h-4 w-4" /> مستخدم جديد
        </Button>
      </div>

      {isCreateOpen && (
        <form
          onSubmit={handleCreateUser}
          className="grid grid-cols-1 gap-3 rounded-lg border bg-white p-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div className="space-y-2">
            <Label>الاسم الكامل</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>اسم المستخدم</Label>
            <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>كلمة المرور</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label>الدور</Label>
            <Select value={newRoleId} onValueChange={setNewRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الدور" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>المنفذ الافتراضي (اختياري)</Label>
            <Select value={newLocationId} onValueChange={setNewLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="بدون تخصيص" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED_VALUE}>بدون تخصيص</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={isCreating || !newRoleId} className="w-full">
              {isCreating ? "جاري الإنشاء..." : "إنشاء المستخدم"}
            </Button>
          </div>
          {createError && <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-3">{createError}</p>}
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">اسم المستخدم</TableHead>
              <TableHead className="text-right">الدور</TableHead>
              <TableHead className="text-right">المنفذ الافتراضي</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>
                  <Select value={user.roleId} onValueChange={(value) => handleRoleChange(user.id, value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={user.locationId ?? UNASSIGNED_VALUE}
                    onValueChange={(value) => handleLocationChange(user.id, value)}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED_VALUE}>بدون تخصيص</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(user.id, !user.isActive)}
                  >
                    <Badge variant={user.isActive ? "secondary" : "outline"} className="cursor-pointer">
                      {user.isActive ? "مفعّل" : "معطّل"}
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
