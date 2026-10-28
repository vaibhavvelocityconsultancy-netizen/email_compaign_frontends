import { createFileRoute } from "@tanstack/react-router";
import { Building2, KeyRound, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { useAuth } from "@/lib/auth";
import {
  deleteAdminTenant,
  listAdminTenants,
  type TenantAdminSummary,
} from "@/lib/mailgun-settings-api";

export const Route = createFileRoute("/tenants")({
  component: TenantsPage,
});

function TenantsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [toDelete, setToDelete] = useState<TenantAdminSummary | null>(null);
  const tenantsQuery = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: listAdminTenants,
    enabled: Boolean(user?.is_superuser),
  });

  const removeTenant = useMutation({
    mutationFn: (tenantId: number) => deleteAdminTenant(tenantId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      setToDelete(null);
      toast.success("Tenant deleted");
    },
    onError: (error: Error) => toast.error(error.message || "Could not delete tenant"),
  });

  if (!user?.is_superuser) {
    return <div className="p-6 text-sm text-muted-foreground">Only administrators can manage tenants.</div>;
  }

  const tenants = tenantsQuery.data ?? [];
  const columns: Column<TenantAdminSummary>[] = [
    {
      key: "name",
      header: "Tenant",
      cell: (tenant) => (
        <div>
          <div className="font-medium">{tenant.name}</div>
          <div className="text-xs text-muted-foreground">ID: {tenant.id}</div>
        </div>
      ),
    },
    {
      key: "users_count",
      header: "Users",
      cell: (tenant) => <span>{tenant.users_count}</span>,
    },
    {
      key: "sender_domain",
      header: "Sender domain",
      cell: (tenant) => <span className="text-muted-foreground">{tenant.sender_domain || "Not configured"}</span>,
    },
    {
      key: "mailgun_configured",
      header: "Mailgun keys",
      cell: (tenant) => (
        <div className="flex flex-wrap gap-1.5">
          <span className={`rounded-full px-2 py-1 text-xs ${tenant.has_api_key ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
            API key: {tenant.has_api_key ? "Configured" : "Missing"}
          </span>
          <span className={`rounded-full px-2 py-1 text-xs ${tenant.has_webhook_signing_key ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
            Webhook key: {tenant.has_webhook_signing_key ? "Configured" : "Missing"}
          </span>
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      cell: (tenant) => <span className="text-muted-foreground">{new Date(tenant.created_at).toLocaleString()}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      cell: (tenant) => (
        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setToDelete(tenant)} disabled={tenant.users_count > 0}>
          <Trash2 className="mr-1.5 size-4" /> Delete
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-[11px] tracking-wide text-muted-foreground">ADMINISTRATION</div>
        <h1 className="mt-1 flex items-center gap-2 font-display text-3xl font-bold tracking-tight">
          <Building2 className="size-7" /> Tenants
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">View tenant accounts and verify their Mailgun key configuration.</p>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><KeyRound className="size-4" /> Fully configured tenants have both an API key and webhook signing key.</div>
      <DataTable
        data={tenants}
        columns={columns}
        searchKeys={["name", "sender_domain"]}
        searchPlaceholder="Search tenants..."
        storageKey="admin-tenants"
        emptyMessage={tenantsQuery.isLoading ? "Loading tenants…" : "No tenants found."}
      />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && removeTenant.mutate(toDelete.id)}
        title="Delete tenant"
        message={`"${toDelete?.name}" and its tenant data will be permanently deleted.`}
        loading={removeTenant.isPending}
      />
    </div>
  );
}
