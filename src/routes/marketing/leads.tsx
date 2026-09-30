import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { deleteLead, getLeads, importLeads, type Lead } from "../../lib/api";
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
const LEAD_STATUSES = ["NEW", "ACTIVE", "JUNK", "HOT", "COLD"] as const;
const selectCls = "h-9 rounded-lg border border-line bg-surface px-3 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none";

function LeadsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["leads"], queryFn: getLeads });
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [importOpen, setImportOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);

  const sources = useMemo(() => Array.from(new Set((data ?? []).map((l) => l.source))), [data]);

  const filtered = useMemo(
    () => (data ?? []).filter((lead) =>
      (status === "all" || lead.status === status) &&
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
      toast.success(`Imported ${res.imported} of ${res.total_rows} rows (${res.duplicates} duplicates, ${res.invalid} invalid)`);
    },
    onError: (e: Error) => toast.error(e.message || "Import failed"),
  });

  const deleteLeadMut = useMutation({
    mutationFn: (lead: Lead) => deleteLead(lead.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      setDeleteTarget(null);
      toast.success("Lead removed");
    },
    onError: (e: Error) => toast.error(e.message || "Unable to remove lead"),
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
      filterValue: (lead) => lead.contactName,
      cell: (lead) => (
        <div>
          <div>{lead.contactName || "—"}</div>
          {lead.contactMobile && <div className="font-mono text-[11px] text-muted-foreground">{lead.contactMobile}</div>}
        </div>
      ),
    },
    {
      key: "enquiryDate",
      header: "Enquiry date",
      filterType: "date",
      filterValue: (lead) => lead.enquiryDate,
      cell: (lead) => <span className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">{new Date(`${lead.enquiryDate}T00:00:00`).toLocaleDateString()}</span>,
    },
    {
      key: "enquiryFor",
      header: "Enquiry for",
      filterValue: (lead) => lead.enquiryFor,
      cell: (lead) => <span className="font-medium">{lead.enquiryFor}</span>,
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
      filterValue: (lead) => lead.status,
      cell: (lead) => <StatusBadge status={lead.status} />,
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
  ], [navigate]);

  return (
    <div className="space-y-6">
      <div className="rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] tracking-wide text-muted-foreground">AUDIENCE</div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Leads</h1>
        </div>
        <div className="flex flex-wrap gap-2">
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
            <Upload className="size-4" /> Import CSV
          </button>
        </div>
      </div>

      <div className="rise" style={{ animationDelay: "80ms" }}>
        <DataTable<Lead>
          data={filtered}
          columns={columns}
          searchKeys={["id", "enquiryFor", "companyName", "contactName", "contactMobile", "followupRemarks"]}
          searchPlaceholder="Search enquiries..."
          pageSize={12}
          storageKey="leads"
          emptyMessage={isLoading ? "Loading enquiries…" : "No enquiries match your filters."}
          toolbarActions={(
            <>
              <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} className={selectCls}>
                <option value="all">All statuses</option>
                {LEAD_STATUSES.map((value) => <option key={value} value={value.toLowerCase()}>{value[0] + value.slice(1).toLowerCase()}</option>)}
              </select>
              <select aria-label="Filter by source" value={source} onChange={(event) => setSource(event.target.value)} className={selectCls}>
                <option value="all">All sources</option>
                {sources.map((value) => <option key={value} value={value}>{LEAD_SOURCES.find(([code]) => code === value)?.[1] ?? value}</option>)}
              </select>
            </>
          )}
        />
      </div>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Upload CSV" eyebrow="IMPORT LEADS">
        <div className="space-y-3 p-5">
          <p className="text-xs text-muted-foreground">
            Required columns: company_name, enquiry_for, enquiry_date, source. Optional columns: company_address, company_city, company_state, company_pincode, company_country, company_gst_number, contact_name, contact_designation, contact_mobile, contact_email, status, followup_date, followup_remarks, is_opportunity.
          </p>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line bg-background px-4 py-8 text-center transition-colors hover:border-brand">
            <Upload className="size-5 text-muted-foreground" />
            <span className="mt-2 text-sm font-medium">{file ? file.name : "Choose File"}</span>
            <span className="mt-1 font-mono text-[11px] text-muted-foreground">CSV up to 5 MB</span>
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
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
        message={`Remove enquiry #${deleteTarget?.srNo ?? ""} from the active leads list? Existing campaign history will be preserved.`}
        loading={deleteLeadMut.isPending}
      />
    </div>
  );
}
