import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, KeyRound, Loader2, Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { createRole, deleteRole, listRolePermissions, listRoles, type Role } from "@/lib/user-api";

export const Route = createFileRoute("/roles")({
  head: () => ({ meta: [{ title: "Roles — Vantage CRM" }] }),
  component: RolesPage,
});

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "role"
  );
}

function RolesPage() {
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [permissionCounts, setPermissionCounts] = React.useState<Record<number, number>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  // Create dialog
  const [createOpen, setCreateOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  // Delete dialog
  const [roleToDelete, setRoleToDelete] = React.useState<Role | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [roleList, permissionList] = await Promise.all([listRoles(), listRolePermissions()]);
      const counts: Record<number, number> = {};
      for (const permission of permissionList) {
        counts[permission.role] = (counts[permission.role] ?? 0) + 1;
      }
      setRoles(roleList);
      setPermissionCounts(counts);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load roles.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const trimmedName = newName.trim();
  const generatedCode = slugify(trimmedName);
  const isDuplicate = roles.some(
    (role) => role.code === generatedCode || role.name.trim().toLowerCase() === trimmedName.toLowerCase(),
  );
  const nameError = trimmedName && isDuplicate ? "A role with this name already exists." : "";

  const openCreate = () => {
    setNewName("");
    setCreateOpen(true);
  };

  const handleCreateRole = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!trimmedName || isDuplicate || creating) return;

    setCreating(true);
    try {
      await createRole({ name: trimmedName, code: generatedCode });
      toast.success("Role created.");
      setCreateOpen(false);
      await loadData();
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : "Could not create role.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteRole(roleToDelete.id);
      toast.success("Role deleted.");
      setRoleToDelete(null);
      await loadData();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Could not delete role.");
    } finally {
      setDeleting(false);
    }
  };

  const showSkeleton = loading && roles.length === 0;
  const showEmpty = !loading && !error && roles.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 sm:gap-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Users &amp; roles</p>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Roles</h1>
          <p className="mt-2 max-w-prose text-sm text-muted-foreground">
            Create reusable permission sets, then assign them to people in your workspace.
          </p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus data-icon="inline-start" /> Create role
        </Button>
      </header>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span className="break-words">{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadData()} disabled={loading} className="w-full sm:w-auto">
            <RefreshCw className={loading ? "animate-spin" : ""} data-icon="inline-start" /> Try again
          </Button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy={loading}>
        {showSkeleton &&
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="size-10 rounded-xl" />
                <Skeleton className="mt-3 h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}

        {showEmpty && (
          <div className="col-span-full flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
            <div className="grid size-12 place-items-center rounded-xl bg-brand-soft text-brand">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <p className="font-medium">No roles yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Create your first role to start granting permissions.</p>
            </div>
            <Button onClick={openCreate} className="w-full sm:w-auto">
              <Plus data-icon="inline-start" /> Create role
            </Button>
          </div>
        )}

        {roles.map((role) => {
          const permissionCount = permissionCounts[role.id] ?? 0;
          const permissionsLabel =
            permissionCount === 0 ? "No permissions" : `${permissionCount} permission${permissionCount === 1 ? "" : "s"}`;

          return (
            <Card key={role.id} className="flex flex-col transition-shadow focus-within:shadow-md hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                    <ShieldCheck className="size-5" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-mr-2 -mt-1 size-10 text-muted-foreground hover:text-destructive sm:size-8 sm:mr-0 sm:mt-0"
                    aria-label={`Delete ${role.name}`}
                    onClick={() => setRoleToDelete(role)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <CardTitle className="truncate pt-2" title={role.name}>
                  {role.name}
                </CardTitle>
                <CardDescription className="truncate font-mono text-xs" title={role.code}>
                  {role.code}
                </CardDescription>
              </CardHeader>

              <CardContent className="mt-auto">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t pt-4 text-sm">
                  <Badge variant={permissionCount === 0 ? "outline" : "secondary"} className="gap-1.5 font-normal">
                    <KeyRound className="size-3.5" />
                    {permissionsLabel}
                  </Badge>
                  <Link
                    to="/access-control"
                    search={{ roleId: role.id }}
                    className="inline-flex min-h-10 items-center gap-1 rounded-md px-1 font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0"
                  >
                    Manage access
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create role dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => !creating && setCreateOpen(open)}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
          <form onSubmit={handleCreateRole} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Create role</DialogTitle>
              <DialogDescription>Name the role. You can set its permissions next.</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2">
              <Label htmlFor="role-name">Role name</Label>
              <Input
                id="role-name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="e.g. Sales manager"
                autoComplete="off"
                autoFocus
                maxLength={60}
                aria-invalid={Boolean(nameError)}
                aria-describedby="role-name-hint"
              />
              <p
                id="role-name-hint"
                className={nameError ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
              >
                {nameError ||
                  (trimmedName ? (
                    <>
                      Code: <span className="font-mono">{generatedCode}</span>
                    </>
                  ) : (
                    "The code is generated from the name."
                  ))}
              </p>
            </div>

            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!trimmedName || isDuplicate || creating} className="w-full sm:w-auto">
                {creating && <Loader2 className="animate-spin" data-icon="inline-start" />}
                {creating ? "Creating…" : "Create role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={roleToDelete !== null} onOpenChange={(open) => !open && !deleting && setRoleToDelete(null)}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete “{roleToDelete?.name}”?</DialogTitle>
            <DialogDescription>
              This removes the role and its permission settings. This can’t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setRoleToDelete(null)}
              disabled={deleting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDeleteRole()} disabled={deleting} className="w-full sm:w-auto">
              {deleting && <Loader2 className="animate-spin" data-icon="inline-start" />}
              {deleting ? "Deleting…" : "Delete role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RolesPage;