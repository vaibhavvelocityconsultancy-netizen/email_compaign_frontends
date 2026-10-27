import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Download, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { deleteLead, getLeads, importLeads, updateLeadStatus, type Lead, type LeadStatus } from "../../lib/api";
import { downloadLeadCsvTemplate } from "../../lib/lead-csv-template";
import { DataTable, type Column } from "../../components/common/DataTable";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { StatusBadge } from "../../components/common/StatusBadge";

export const Route = createFileRoute("/marketing/leads")({
  head: () => ({
    meta: [
      { title: "Leads — Vantage CRM" },
      { name: "description", content: "Browse, filter, and import your lead database." },
      { property: "og:title", content: "Leads — Vantage CRM" },
      { property: "og:description", content: "Browse, filter, and import your lead database." },
    ],
  }),
  component: LeadsRouteView,
});

function LeadsRouteView() {
  const isFormRoute = useRouterState({
    select: (state) => state.location.pathname === "/marketing/leads/form",
  });

  return isFormRoute ? <Outlet /> : <LeadsPage />;
}

const LEAD_SOURCES = [
  ["WEBSITE", "Website"],
  ["SOCIAL_MEDIA", "Social Media"],
  ["GOOGLE", "Google Search"],
  ["ADVERTISEMENT", "Advertisement"],
  ["REFERENCE", "Reference"],
  ["EXISTING_CLIENT", "Existing Client"],
  ["COLD_CALL", "Cold Call"],
  ["EMAIL_MARKETING", "Email Marketing"],
  ["OTHER", "Other"],
] as const;
const LEAD_STATUSES = ["NEW", "ACTIVE", "JUNK", "HOT", "COLD", "OTHER"] as const;
const selectCls = "h-9 rounded-lg border border-line bg-surface px-3 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none";

function displayedLeadStatus(lead: Lead) {
  return lead.unsubscribed ? "unsubscribed" : lead.status;
}

function statusLabel(value: string) {
  return value ? value[0].toUpperCase() + value.slice(1).toLowerCase() : "";
}

function StatusSelect({
  value,
  onChange,
  disabled,
  label,
}: {
  value: string;
  onChange: (next: LeadStatus) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div
      className={`relative inline-flex items-center gap-1 rounded-full focus-within:ring-2 focus-within:ring-brand/30 ${
        disabled ? "opacity-60" : ""
      }`}
    >
      {/* the visible colored badge */}
      <StatusBadge status={statusLabel(value)} />
      <ChevronDown className="pointer-events-none size-3.5 text-muted-foreground" />

      {/* invisible select on top, handles the click and change */}
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as LeadStatus)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s.toLowerCase()}>
            {statusLabel(s)}
          </option>
        ))}
        <option value="unsubscribed">Unsubscribed</option>
      </select>
    </div>
  );
}

function LeadsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["leads"], queryFn: getLeads });
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [importOpen, setImportOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<Lead[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selectionResetKey, setSelectionResetKey] = useState(0);

  const handleSelectionChange = useCallback((selected: Lead[]) => {
    setSelectedLeads(selected);
  }, []);

  const updateStatusMut = useMutation({
    mutationFn: ({ lead, nextStatus }: { lead: Lead; nextStatus: LeadStatus }) =>
      updateLeadStatus(lead.id, nextStatus),
    onSuccess: (updatedLead) => {
      qc.setQueryData<Lead[]>(["leads"], (current) =>
        current?.map((lead) => lead.id === updatedLead.id ? updatedLead : lead),
      );
      toast.success("Lead status updated");
    },
    onError: (error: Error) => {
      void qc.invalidateQueries({ queryKey: ["leads"] });
      toast.error(error.message || "Unable to update lead status");
    },
  });

  const sources = useMemo(() => Array.from(new Set((data ?? []).map((l) => l.source))), [data]);

  const filtered = useMemo(
    () => (data ?? []).filter((lead) =>
      (status === "all" || displayedLeadStatus(lead) === status) &&
      (source === "all" || lead.source === source),
    ),
    [data, status, source],
  );

  const importMut = useMutation({
    mutationFn: (f: File) => importLeads(f),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      setImportOpen(false);
      setFile(null);
      const summary = `Imported ${res.imported} of ${res.total_rows} rows (${res.duplicates} duplicates, ${res.invalid} invalid)`;
      const firstError = res.row_errors?.[0];
      if (firstError) {
        const details = Object.entries(firstError.errors)
          .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
          .join("; ");
        toast.error(`${summary}. Row ${firstError.row}: ${details}`);
      } else {
        toast.success(summary);
      }
    },
    onError: (e: Error) => toast.error(e.message || "Import failed"),
  });

  const deleteLeadMut = useMutation({
    mutationFn: (lead: Lead) => deleteLead(lead.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      setDeleteTarget(null);
      setSelectedLeads([]);
      setSelectionResetKey((key) => key + 1);
      toast.success("Lead removed");
    },
    onError: (e: Error) => toast.error(e.message || "Unable to remove lead"),
  });

  const bulkDeleteMut = useMutation({
    mutationFn: async (leads: Lead[]) =>
      Promise.allSettled(leads.map((lead) => deleteLead(lead.id))),
    onSuccess: (results) => {
      const deleted = results.filter((result) => result.status === "fulfilled").length;
      const failed = results.length - deleted;
      void qc.invalidateQueries({ queryKey: ["leads"] });
      setBulkDeleteOpen(false);
      setSelectedLeads([]);
      setSelectionResetKey((key) => key + 1);
      if (failed) {
        toast.error(`Deleted ${deleted} leads; ${failed} could not be deleted.`);
      } else {
        toast.success(`${deleted} leads permanently deleted.`);
      }
    },
    onError: (error: Error) => toast.error(error.message || "Unable to delete selected leads"),
  });

  const openCreate = () => navigate({ to: "/marketing/leads/form", search: { leadId: undefined } });

  const columns = useMemo<Column<Lead>[]>(() => [
    {
      key: "companyName",
      header: "Company",
      filterValue: (lead) => lead.companyName,
      cell: (lead) => <span className="font-medium">{lead.companyName || "—"}</span>,
    },
    {
      key: "contactName",
      header: "Contact",
      filterValue: (lead) => [lead.contactName, lead.contactMobile, lead.contactEmail].join(" "),
      cell: (lead) => (
        <div>
          <div>{lead.contactName || "—"}</div>
          {lead.contactMobile && (
            <div className="font-mono text-[11px] text-muted-foreground">
              {lead.contactMobile}
            </div>
          )}
          <div className="font-mono text-[11px] text-muted-foreground">
            {lead.contactEmail || "No email"}
          </div>
        </div>
      ),
    },
    {
      key: "categoryName",
      header: "Category",
      filterValue: (lead) => lead.categoryName,
      cell: (lead) => lead.categoryName || "—",
    },
    {
      key: "enquiryDate",
      header: "Enquiry date",
      filterType: "date",
      filterValue: (lead) => lead.enquiryDate,
      cell: (lead) => <span className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">{new Date(`${lead.enquiryDate}T00:00:00`).toLocaleDateString()}</span>,
    },
    {
      key: "source",
      header: "Source",
      filterValue: (lead) => lead.source,
      cell: (lead) => LEAD_SOURCES.find(([value]) => value === lead.source)?.[1] ?? lead.source,
    },
    {
      key: "status",
      header: "Status",
      filterValue: displayedLeadStatus,
      cell: (lead) => lead.unsubscribed ? (
        <StatusBadge status="Unsubscribed" />
      ) : (
        <StatusSelect
          value={lead.status}
          disabled={updateStatusMut.isPending}
          label={`Change status for ${lead.contactName || lead.companyName}`}
          onChange={(nextStatus) => updateStatusMut.mutate({ lead, nextStatus })}
        />
      ),
    },
    {
      key: "followupDate",
      header: "Follow-up",
      filterType: "date",
      filterValue: (lead) => lead.followupDate,
      cell: (lead) => lead.followupDate
        ? <span className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">{new Date(`${lead.followupDate}T00:00:00`).toLocaleDateString()}</span>
        : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "actions",
      header: "Actions",
      filterable: false,
      sortable: false,
      className: "w-24 text-right",
      headerClassName: "text-right",
      cell: (lead) => (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={() => navigate({ to: "/marketing/leads/form", search: { leadId: lead.id } })}
            className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            aria-label={`Edit enquiry ${lead.srNo}`}
            title="Edit lead"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(lead)}
            className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Remove enquiry ${lead.srNo}`}
            title="Remove lead"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ),
    },
  ], [navigate, updateStatusMut]);

  return (
    <div className="space-y-6">
      <div className="rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] tracking-wide text-muted-foreground">AUDIENCE</div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Leads</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void downloadLeadCsvTemplate()
                .then(() => {
                  toast.success("Lead import template downloaded.");
                })
                .catch((error: unknown) => {
                  toast.error(
                    error instanceof Error ? error.message : "Could not download template.",
                  );
                });
            }}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-sm font-medium transition-colors hover:bg-background"
          >
            <Download className="size-4" /> Download template
          </button>
          <button
            type="button"
            onClick={() => navigate({
              to: "/tasks/form",
              search: { taskId: undefined, module: "LEAD", companyId: undefined, referenceId: undefined },
            })}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-sm font-medium transition-colors hover:bg-background"
          >
            <Plus className="size-4" /> New Task
          </button>
          <button
            onClick={openCreate}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand/90"
          >
            <Plus className="size-4" /> Add lead
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-sm font-medium transition-colors hover:bg-background"
          >
            <Upload className="size-4" /> Import Leads
          </button>
        </div>
      </div>

      <div className="rise" style={{ animationDelay: "80ms" }}>
        <DataTable<Lead>
          data={filtered}
          columns={columns}
          selectable
          onSelectionChange={handleSelectionChange}
          selectionResetKey={selectionResetKey}
          selectionSummary={selectedLeads.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
              <span className="text-sm">{selectedLeads.length} leads selected</span>
              <button
                type="button"
                onClick={() => setBulkDeleteOpen(true)}
                disabled={bulkDeleteMut.isPending || deleteLeadMut.isPending}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-destructive px-4 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
              >
                <Trash2 className="size-4" />
                Delete selected
              </button>
            </div>
          ) : null}
          searchKeys={[
            "id",
            "companyName",
            "contactName",
            "contactMobile",
            "followupRemarks",
          ]}
          searchPlaceholder="Search enquiries..."
          pageSize={12}
          storageKey="leads"
          emptyMessage={isLoading ? "Loading enquiries…" : "No enquiries match your filters."}
          toolbarActions={(
            <>
              <select
                aria-label="Filter by status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className={selectCls}
              >
                <option value="all">All statuses</option>
                {LEAD_STATUSES.map((value) => (
                  <option key={value} value={value.toLowerCase()}>
                    {statusLabel(value)}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by source"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                className={selectCls}
              >
                <option value="all">All sources</option>
                {sources.map((value) => (
                  <option key={value} value={value}>
                    {LEAD_SOURCES.find(([code]) => code === value)?.[1] ?? value}
                  </option>
                ))}
              </select>
            </>
          )}
        />
      </div>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Upload Leads" eyebrow="IMPORT LEADS">
        <div className="space-y-3 p-5">
          <p className="text-xs text-muted-foreground">
            CSV files with commas or tabs and Excel files are supported. Missing columns or values are allowed. Contact email is optional; leads without one are imported and marked “No email.”
            Enquiry date defaults to today if blank or missing; source and status default to Other.
          </p>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line bg-background px-4 py-8 text-center transition-colors hover:border-brand">
            <Upload className="size-5 text-muted-foreground" />
            <span className="mt-2 text-sm font-medium">{file ? file.name : "Choose File"}</span>
            <span className="mt-1 font-mono text-[11px] text-muted-foreground">CSV, XLS, or XLSX up to 5 MB</span>
            <input type="file" accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-line bg-background/50 px-5 py-4">
          <button onClick={() => setImportOpen(false)} className="h-9 rounded-lg border border-line bg-surface px-4 text-sm transition-colors hover:bg-background">
            Cancel
          </button>
          <button
            disabled={!file || importMut.isPending}
            onClick={() => file && importMut.mutate(file)}
            className="h-9 rounded-lg bg-brand px-5 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:opacity-50"
          >
            {importMut.isPending ? "Importing…" : "Import"}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteLeadMut.mutate(deleteTarget)}
        title="Remove lead?"
        message={`Permanently delete enquiry #${deleteTarget?.srNo ?? ""}? This action cannot be undone, and related campaign history may also be deleted.`}
        loading={deleteLeadMut.isPending}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={() => bulkDeleteMut.mutate(selectedLeads)}
        title="Delete selected leads?"
        message={`Permanently delete ${selectedLeads.length} selected leads? This action cannot be undone, and related campaign history may also be deleted.`}
        confirmLabel={bulkDeleteMut.isPending ? "Deleting…" : `Delete ${selectedLeads.length} leads`}
        loading={bulkDeleteMut.isPending}
      />
    </div>
  );
}
