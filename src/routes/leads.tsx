import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { createLead, deleteLead, getLeadUsers, getLeads, importLeads, updateLead, type Lead, type LeadInput } from "../lib/api";
import { Modal } from "../components/common/Modal";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { StatusBadge } from "../components/common/StatusBadge";
import { EmptyState, LoadingRows } from "../components/common/EmptyState";

export const Route = createFileRoute("/leads")({
  head: () => ({
    meta: [
      { title: "Leads — Vantage CRM" },
      { name: "description", content: "Browse, filter, and import your lead database." },
      { property: "og:title", content: "Leads — Vantage CRM" },
      { property: "og:description", content: "Browse, filter, and import your lead database." },
    ],
  }),
  component: LeadsPage,
});

const PAGE_SIZE = 12;
const ENQUIRY_FOR = ["LEAD", "CLIENT"] as const;
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
const EMPTY_LEAD: LeadInput = {
  enquiry_for: "LEAD",
  enquiry_date: new Date().toISOString().slice(0, 10),
  lead_received_by: 0,
  lead_assign_to: null,
  source: "OTHER",
  status: "NEW",
  followup_date: null,
  followup_remarks: "",
  is_opportunity: false,
};

function LeadsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["leads"], queryFn: getLeads });
  const { data: users = [] } = useQuery({ queryKey: ["lead-users"], queryFn: getLeadUsers });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [leadOpen, setLeadOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadForm, setLeadForm] = useState<LeadInput>(EMPTY_LEAD);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);

  const sources = useMemo(() => Array.from(new Set((data ?? []).map((l) => l.source))), [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (data ?? []).filter(
      (l) =>
        (!q || String(l.srNo).includes(q) || l.enquiryFor.toLowerCase().includes(q) || l.leadReceivedByName.toLowerCase().includes(q) || (l.leadAssignToName ?? "").toLowerCase().includes(q) || l.followupRemarks.toLowerCase().includes(q)) &&
        (status === "all" || l.status === status) &&
        (source === "all" || l.source === source),
    );
  }, [data, search, status, source]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

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

  const saveLeadMut = useMutation({
    mutationFn: () => editingLead ? updateLead(editingLead.id, leadForm) : createLead(leadForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      setLeadOpen(false);
      toast.success(editingLead ? "Lead updated" : "Lead created");
    },
    onError: (e: Error) => toast.error(e.message || "Unable to save lead"),
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

  const openCreate = () => {
    setEditingLead(null);
    setLeadForm({ ...EMPTY_LEAD, lead_received_by: users[0]?.id ?? 0 });
    setLeadOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setLeadForm({
      enquiry_for: lead.enquiryFor,
      enquiry_date: lead.enquiryDate,
      lead_received_by: lead.leadReceivedBy,
      lead_assign_to: lead.leadAssignTo,
      source: lead.source,
      status: lead.status.toUpperCase(),
      followup_date: lead.followupDate,
      followup_remarks: lead.followupRemarks,
      is_opportunity: lead.isOpportunity,
    });
    setLeadOpen(true);
  };

  const selectCls =
    "h-9 rounded-lg border border-line bg-surface px-3 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none";

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

      <div className="rise overflow-hidden rounded-xl border border-line bg-surface" style={{ animationDelay: "80ms" }}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, email, company…"
            className="h-9 min-w-56 flex-1 rounded-lg border border-line bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
          />
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={selectCls}>
            <option value="all">All statuses</option>
            {["new", "active", "junk", "hot", "cold"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }} className={selectCls}>
            <option value="all">All sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2.5 font-medium">#</th>
                <th className="px-4 py-2.5 font-medium">Enquiry for</th>
                <th className="px-4 py-2.5 font-medium">Enquiry date</th>
                <th className="px-4 py-2.5 font-medium">Received by</th>
                <th className="px-4 py-2.5 font-medium">Assigned to</th>
                <th className="px-4 py-2.5 font-medium">Source</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Follow-up</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading ? (
                <LoadingRows cols={8} />
              ) : !rows.length ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState title="No leads match your filters" hint="Try clearing the search or filters." />
                  </td>
                </tr>
              ) : (
                rows.map((l) => (
                  <tr key={l.id} className="transition-colors hover:bg-background/60">
                    <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{l.srNo}</td>
                    <td className="px-4 py-3 font-medium">{l.enquiryFor}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{new Date(`${l.enquiryDate}T00:00:00`).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{l.leadReceivedByName}</td>
                    <td className="px-4 py-3">{l.leadAssignToName ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{LEAD_SOURCES.find(([value]) => value === l.source)?.[1] ?? l.source}</td>
                    <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{l.followupDate ? new Date(`${l.followupDate}T00:00:00`).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(l)}
                          className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                          aria-label={`Edit enquiry ${l.srNo}`}
                          title="Edit lead"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(l)}
                          className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Remove enquiry ${l.srNo}`}
                          title="Remove lead"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3">
            <span className="font-mono text-[11px] text-muted-foreground">
              {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-2">
              <button
                disabled={current <= 1}
                onClick={() => setPage(current - 1)}
                className="h-8 rounded-md border border-line px-3 text-xs transition-colors hover:bg-background disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={current >= pageCount}
                onClick={() => setPage(current + 1)}
                className="h-8 rounded-md border border-line px-3 text-xs transition-colors hover:bg-background disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Upload CSV" eyebrow="IMPORT LEADS">
        <div className="space-y-3 p-5">
          <p className="text-xs text-muted-foreground">
            Required columns: enquiry_for, enquiry_date, lead_received_by, source. User fields accept an active username or ID. Optional columns: lead_assign_to, status, followup_date, followup_remarks, is_opportunity.
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

      <Modal
        open={leadOpen}
        onClose={() => setLeadOpen(false)}
        title={editingLead ? "Edit lead" : "Add lead"}
        eyebrow={editingLead ? "UPDATE CONTACT" : "NEW CONTACT"}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            saveLeadMut.mutate();
          }}
        >
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Enquiry for <span className="text-destructive">*</span>
              <select required value={leadForm.enquiry_for} onChange={(event) => setLeadForm({ ...leadForm, enquiry_for: event.target.value as LeadInput["enquiry_for"] })} className={selectCls}>
                {ENQUIRY_FOR.map((value) => <option key={value} value={value}>{value === "LEAD" ? "Lead" : "Client"}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Enquiry date <span className="text-destructive">*</span>
              <input type="date" required value={leadForm.enquiry_date} onChange={(event) => setLeadForm({ ...leadForm, enquiry_date: event.target.value })} className={selectCls} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Received by <span className="text-destructive">*</span>
              <select required value={leadForm.lead_received_by || ""} onChange={(event) => setLeadForm({ ...leadForm, lead_received_by: Number(event.target.value) })} className={selectCls}>
                <option value="" disabled>Select a user</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Assigned to
              <select value={leadForm.lead_assign_to ?? ""} onChange={(event) => setLeadForm({ ...leadForm, lead_assign_to: event.target.value ? Number(event.target.value) : null })} className={selectCls}>
                <option value="">Unassigned</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Source
              <select
                value={leadForm.source}
                onChange={(event) => setLeadForm({ ...leadForm, source: event.target.value })}
                className={selectCls}
              >
                {LEAD_SOURCES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Status
              <select
                value={leadForm.status}
                onChange={(event) => setLeadForm({ ...leadForm, status: event.target.value })}
                className={selectCls}
              >
                {LEAD_STATUSES.map((value) => <option key={value} value={value}>{value[0] + value.slice(1).toLowerCase()}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Follow-up date
              <input type="date" value={leadForm.followup_date ?? ""} onChange={(event) => setLeadForm({ ...leadForm, followup_date: event.target.value || null })} className={selectCls} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
              Follow-up remarks
              <textarea rows={3} value={leadForm.followup_remarks} onChange={(event) => setLeadForm({ ...leadForm, followup_remarks: event.target.value })} className={`${selectCls} h-auto py-2`} />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={leadForm.is_opportunity}
                onChange={(event) => setLeadForm({ ...leadForm, is_opportunity: event.target.checked })}
                className="size-4 accent-brand"
              />
              Mark as opportunity
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-line bg-background/50 px-5 py-4">
            <button type="button" onClick={() => setLeadOpen(false)} className="h-9 rounded-lg border border-line bg-surface px-4 text-sm transition-colors hover:bg-background">
              Cancel
            </button>
            <button type="submit" disabled={saveLeadMut.isPending} className="h-9 rounded-lg bg-brand px-5 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:opacity-50">
              {saveLeadMut.isPending ? "Saving…" : editingLead ? "Save changes" : "Create lead"}
            </button>
          </div>
        </form>
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
