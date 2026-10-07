import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { Pencil, Plus, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { UserFormDialog } from "@/components/users/UserFormDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteUser, listUsers, type User } from "@/lib/user-api";

export const Route = createFileRoute("/user")({
  head: () => ({
    meta: [
      { title: "Users — Vantage CRM" },
      { name: "description", content: "Manage Vantage CRM users and roles." },
    ],
  }),
  component: UsersPage,
});

const SEARCH_KEYS: (keyof User)[] = ["username", "email", "first_name", "last_name"];

function UsersPage() {
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<User | null>(null);
  const [deleting, setDeleting] = React.useState<User | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setUsers(await listUsers());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load users.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const openForm = React.useCallback((user: User | null = null) => {
    setEditing(user);
    setFormOpen(true);
  }, []);

  const confirmDelete = React.useCallback(async () => {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await deleteUser(deleting.id);
      toast.success("User deleted.");
      setDeleting(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete user.");
    } finally {
      setDeletePending(false);
    }
  }, [deleting, refresh]);

  const columns = React.useMemo<Column<User>[]>(
    () => [
      {
        key: "username",
        header: "User",
        cell: (user) => {
          const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
          const initials = (fullName || user.username)
            .split(/[\s@._-]+/)
            .filter(Boolean)
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          return (
            <div className="flex items-center gap-3">
              <Avatar className="size-9">
                <AvatarFallback className="bg-brand-soft text-xs font-semibold text-brand">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate font-medium">{fullName || user.username}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {fullName ? `@${user.username} · ` : ""}
                  {user.email}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: "role",
        header: "Role",
        filterValue: (user) => (user.role === null ? "Unassigned" : `Role #${user.role}`),
        cell: (user) => (
          <Badge variant="outline" className="font-normal">
            {user.role === null ? "Unassigned" : `Role #${user.role}`}
          </Badge>
        ),
      },
      {
        key: "is_active",
        header: "Status",
        filterValue: (user) => (user.is_active ? "Active" : "Inactive"),
        cell: (user) => (
          <Badge variant={user.is_active ? "default" : "secondary"}>
            {user.is_active ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "",
        className: "w-20",
        cell: (user) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={`Edit ${user.username}`}
              onClick={() => openForm(user)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              aria-label={`Delete ${user.username}`}
              onClick={() => setDeleting(user)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [openForm],
  );

  const activeCount = users.filter((user) => user.is_active).length;

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="font-mono text-[11px] tracking-wide text-muted-foreground">
            USER & ROLES
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold">Users</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage people and workspace access.</p>
        </div>
        <Button onClick={() => openForm()}>
          <Plus data-icon="inline-start" /> Add user
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
              <UserRound />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">TOTAL USERS</p>
              <p className="font-display text-2xl font-bold">{loading ? "—" : users.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-good/10 text-good">
              <ShieldCheck />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ACTIVE USERS</p>
              <p className="font-display text-2xl font-bold">{loading ? "—" : activeCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loadError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <span>{loadError}</span>
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable
        data={users}
        columns={columns}
        searchKeys={SEARCH_KEYS}
        searchPlaceholder="Search users"
        emptyMessage={
          loading ? "Loading users…" : loadError ? "Users could not be loaded." : "No users found."
        }
        pageSize={10}
        storageKey="vantage-users"
      />

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editing} onSaved={refresh} />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title="Delete user"
        message={`Delete ${deleting?.username ?? "this user"}? This action cannot be undone.`}
        loading={deletePending}
      />
    </div>
  );
}

export default UsersPage;
