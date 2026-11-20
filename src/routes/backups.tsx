import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ModuleHero } from "@/components/ModuleHero";
import { useAuth } from "@/lib/auth";
import { getBackups, restoreBackup, type BackupEntry } from "@/lib/api";

export const Route = createFileRoute("/backups")({
  head: () => ({ meta: [{ title: "Backups — Vantage CRM" }] }),
  component: BackupsPage,
});

function BackupsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [moduleFilter, setModuleFilter] = useState("all");
  const [restoreTarget, setRestoreTarget] = useState<BackupEntry | null>(null);
  const backups = useQuery({
    queryKey: ["backups", moduleFilter],
    queryFn: () => getBackups(moduleFilter === "all" ? undefined : moduleFilter),
    enabled: Boolean(user?.is_superuser),
  });
  const restore = useMutation({
    mutationFn: restoreBackup,
    onSuccess: async (result) => {
      toast.success(`Restored ${result.restored} record${result.restored === 1 ? "" : "s"}.`);
      setRestoreTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["backups"] });
      await queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not restore this backup.");
    },
  });

  if (!user?.is_superuser) {
    return <div className="p-6">Only super administrators can view backups.</div>;
  }

  const entries = backups.data?.results ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <ModuleHero
          eyebrow="Super admin"
          title="Backup & Restore"
          description="Deleted records are retained for 30 days. Restore an item to return it to its module."
          icon={<ArchiveRestore aria-hidden="true" />}
        />
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Filter by module
          <select
            aria-label="Filter backups by module"
            value={moduleFilter}
            onChange={(event) => setModuleFilter(event.target.value)}
            className="h-10 min-w-52 rounded-lg border border-line bg-surface px-3 text-sm text-foreground"
          >
            <option value="all">All modules</option>
            {(backups.data?.modules ?? []).map((module) => (
              <option key={module} value={module}>{module}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        {backups.isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading backups…</p>
        ) : backups.isError ? (
          <p className="p-6 text-sm text-destructive">{backups.error.message}</p>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center">
            <ArchiveRestore className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="font-medium">No deleted records to restore</p>
            <p className="mt-1 text-sm text-muted-foreground">Deleted items appear here for 30 days.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line bg-background/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Record</th>
                  <th className="px-4 py-3 font-medium">Module</th>
                  <th className="px-4 py-3 font-medium">Tenant</th>
                  <th className="px-4 py-3 font-medium">Deleted by</th>
                  <th className="px-4 py-3 font-medium">Deleted</th>
                  <th className="px-4 py-3 font-medium">Expires</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{entry.record_name || entry.model}</div>
                      <div className="font-mono text-xs text-muted-foreground">ID {entry.object_id}</div>
                    </td>
                    <td className="px-4 py-3">{entry.module}</td>
                    <td className="px-4 py-3">{entry.tenant ?? "—"}</td>
                    <td className="px-4 py-3">{entry.deleted_by ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(entry.deleted_at)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(entry.expires_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setRestoreTarget(entry)}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-brand/30 px-3 text-sm font-medium text-brand hover:bg-brand/10"
                      >
                        <RotateCcw className="size-4" /> Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(restoreTarget)}
        onClose={() => setRestoreTarget(null)}
        onConfirm={() => restoreTarget && restore.mutate(restoreTarget.id)}
        title="Restore deleted record?"
        message={`Restore “${restoreTarget?.record_name ?? "this record"}” to ${restoreTarget?.module ?? "its module"}? Related records deleted with it will be restored as well.`}
        confirmLabel="Restore"
        loading={restore.isPending}
      />
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}
