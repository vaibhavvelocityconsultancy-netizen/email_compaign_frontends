import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LockKeyhole, Shield, Users } from "lucide-react";
import { toast } from "sonner";

import { RoleFormDialog } from "@/components/users/RoleFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  createRolePermission,
  listModules,
  listRolePermissions,
  listRoles,
  updateRolePermission,
  type Module,
  type Role,
  type RolePermission,
} from "@/lib/user-api";

export const Route = createFileRoute("/access-control")({
  head: () => ({
    meta: [
      { title: "Access Control — Vantage CRM" },
      { name: "description", content: "Configure role permissions in Vantage CRM." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    roleId:
      typeof search.roleId === "number" && Number.isInteger(search.roleId)
        ? search.roleId
        : undefined,
  }),
  component: AccessControlPage,
});

type PermissionField = "can_view" | "can_create";

const PERMISSION_COLUMNS: { field: PermissionField; label: string }[] = [
  { field: "can_view", label: "View" },
  { field: "can_create", label: "Create" },
];

function AccessControlPage() {
  const { roleId } = Route.useSearch();
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [modules, setModules] = React.useState<Module[]>([]);
  const [permissions, setPermissions] = React.useState<RolePermission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = React.useState<number | null>(roleId ?? null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [roleDialogOpen, setRoleDialogOpen] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [roleList, moduleList, permissionList] = await Promise.all([
        listRoles(),
        listModules(),
        listRolePermissions(),
      ]);
      setRoles(roleList);
      setModules(moduleList);
      setPermissions(permissionList);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Unable to load access control.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  React.useEffect(() => {
    if (roleId !== undefined) setSelectedRoleId(roleId);
  }, [roleId]);

  React.useEffect(() => {
    if (loading) return;
    if (roles.length === 0) {
      setSelectedRoleId(null);
    } else if (selectedRoleId === null || !roles.some((role) => role.id === selectedRoleId)) {
      setSelectedRoleId(roles[0].id);
    }
  }, [loading, roles, selectedRoleId]);

  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0] ?? null;

  const permissionMap = React.useMemo(() => {
    const map = new Map<string, RolePermission>();
    for (const permission of permissions) {
      map.set(`${permission.role}:${permission.module}`, permission);
    }
    return map;
  }, [permissions]);

  const handleRoleSaved = React.useCallback(
    async (role: Role) => {
      setSelectedRoleId(role.id);
      await loadData();
    },
    [loadData],
  );

  const handleToggle = React.useCallback(
    async (module: Module, field: PermissionField, checked: boolean) => {
      if (!selectedRole) return;
      const key = `${selectedRole.id}:${module.id}`;
      const existing = permissionMap.get(key);
      // can_edit / can_delete are still sent so previously saved values aren't overwritten
      const payload = {
        role: selectedRole.id,
        module: module.id,
        can_view: existing?.can_view ?? false,
        can_create: existing?.can_create ?? false,
        can_edit: existing?.can_edit ?? false,
        can_delete: existing?.can_delete ?? false,
      };
      payload[field] = checked;

      try {
        if (existing) {
          await updateRolePermission(existing.id, payload);
        } else {
          await createRolePermission(payload);
        }
        await loadData();
      } catch (toggleError) {
        toast.error(
          toggleError instanceof Error ? toggleError.message : "Could not update permission.",
        );
      }
    },
    [loadData, permissionMap, selectedRole],
  );

  if (!loading && roles.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <div className="font-mono text-[11px] tracking-wide text-muted-foreground">
            USER & ROLES
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold">Access control</h1>
        </div>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No roles exist yet. Create one to begin managing permissions.
            <div className="mt-4">
              <Button onClick={() => setRoleDialogOpen(true)}>Create first role</Button>
            </div>
          </CardContent>
        </Card>
        <RoleFormDialog
          open={roleDialogOpen}
          onOpenChange={setRoleDialogOpen}
          onSaved={handleRoleSaved}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="font-mono text-[11px] tracking-wide text-muted-foreground">
            USER & ROLES
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold">Access control</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Define what each role can see and do across Vantage.
          </p>
        </div>
        <Button onClick={() => setRoleDialogOpen(true)}>Create role</Button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
          <Button variant="outline" size="sm" className="ml-3" onClick={() => void loadData()}>
            Retry
          </Button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Roles</CardTitle>
            <CardDescription>Choose a role to configure.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {roles.map((role) => {
              const count = permissions.filter((permission) => permission.role === role.id).length;
              return (
                <RoleButton
                  key={role.id}
                  icon={role.name.toLowerCase().includes("admin") ? Shield : Users}
                  label={role.name}
                  count={
                    count === 0 ? "No permissions" : `${count} permission${count === 1 ? "" : "s"}`
                  }
                  active={selectedRole?.id === role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                />
              );
            })}
            <Separator className="my-2" />
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => setRoleDialogOpen(true)}
            >
              + Create custom role
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>{selectedRole?.name ?? "Role"}</CardTitle>
                  <Badge>Role</Badge>
                </div>
                <CardDescription className="mt-1">
                  Configure access permissions for this role.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[460px]">
                <div className="grid grid-cols-[minmax(220px,1.6fr)_repeat(2,110px)] items-center border-b bg-muted/30 px-4 py-3 text-xs font-medium text-muted-foreground">
                  <span>Module</span>
                  {PERMISSION_COLUMNS.map((column) => (
                    <span key={column.field} className="text-center">
                      {column.label}
                    </span>
                  ))}
                </div>

                {loading ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Loading access settings…
                  </div>
                ) : modules.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No modules are configured yet.
                  </div>
                ) : (
                  modules.map((module) => {
                    const record = selectedRole
                      ? permissionMap.get(`${selectedRole.id}:${module.id}`)
                      : null;
                    return (
                      <div
                        key={module.id}
                        className="grid grid-cols-[minmax(220px,1.6fr)_repeat(2,110px)] items-center border-b px-4 py-4 last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium">{module.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{module.code}</p>
                        </div>
                        {PERMISSION_COLUMNS.map(({ field, label }) => (
                          <div key={`${module.id}-${field}`} className="flex justify-center">
                            <Switch
                              checked={Boolean(record?.[field])}
                              onCheckedChange={(checked) =>
                                void handleToggle(module, field, checked)
                              }
                              aria-label={`${module.name} ${label}`}
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-lg bg-brand-soft px-4 py-3 text-sm">
              <span>
                <strong>
                  {selectedRole
                    ? permissions.filter((permission) => permission.role === selectedRole.id).length
                    : 0}
                </strong>{" "}
                permission rows configured
              </span>
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <LockKeyhole className="size-4" /> Role-based access
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      <RoleFormDialog
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        onSaved={handleRoleSaved}
      />
    </div>
  );
}

function RoleButton({
  icon: Icon,
  label,
  count,
  active = false,
  onClick,
}: {
  icon: typeof Shield;
  label: string;
  count: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${active ? "bg-brand-soft text-brand" : "hover:bg-muted"}`}
    >
      <Icon />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{count}</span>
      </span>
      {active && <span className="size-2 rounded-full bg-brand" aria-hidden="true" />}
    </button>
  );
}

export default AccessControlPage;


