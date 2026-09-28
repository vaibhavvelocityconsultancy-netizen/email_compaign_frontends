import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { getLeads, importLeads } from "../lib/mock-api";
import { Modal } from "../components/common/Modal";
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

function LeadsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["leads"], queryFn: getLeads });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const sources = useMemo(() => Array.from(new Set((data ?? []).map((l) => l.source))), [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (data ?? []).filter(
      (l) =>
        (!q || l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || l.company.toLowerCase().includes(q)) &&
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
      toast.success(`Imported ${res.imported} of ${res.total} rows`);
    },
    onError: (e: Error) => toast.error(e.message || "Import failed"),
  });

  const selectCls =
    "h-9 rounded-lg border border-line bg-surface px-3 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none";

  return (
    <div className="space-y-6">
      <div className="rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] tracking-wide text-muted-foreground">AUDIENCE</div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Leads</h1>
        </div>
        <button
          onClick={() => setImportOpen(true)}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand/90"
        >
          <Upload className="size-4" /> Import CSV
        </button>
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
            {["new", "contacted", "replied", "completed", "unsubscribed"].map((s) => (
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
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Company</th>
                <th className="px-4 py-2.5 font-medium">Phone</th>
                <th className="px-4 py-2.5 font-medium">Source</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading ? (
                <LoadingRows cols={7} />
              ) : !rows.length ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState title="No leads match your filters" hint="Try clearing the search or filters." />
                  </td>
                </tr>
              ) : (
                rows.map((l) => (
                  <tr key={l.id} className="transition-colors hover:bg-background/60">
                    <td className="px-4 py-3 font-medium">{l.name}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{l.email}</td>
                    <td className="px-4 py-3">{l.company}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{l.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.source}</td>
                    <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                    <td className="px-4 py-3 text-right font-mono text-[11px] text-muted-foreground">
                      {new Date(l.createdAt).toLocaleDateString()}
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
            Expected columns: name, email, company, phone, source. The first row is treated as a header.
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
    </div>
  );
}
