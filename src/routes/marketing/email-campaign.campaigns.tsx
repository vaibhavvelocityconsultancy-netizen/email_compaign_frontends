import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, Megaphone, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { Modal } from "@/components/common/Modal";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  createBatch,
  deleteBatch,
  getBatchLeads,
  getBatches,
  getEmailLogs,
  getLeads,
  getSequences,
  pauseBatch,
  resumeBatch,
  updateBatch,
  type Campaign,
  type EmailLog,
  type Lead,
} from "@/lib/api";

export const Route = createFileRoute("/marketing/email-campaign/campaigns")({
  validateSearch: (search: Record<string, unknown>) => ({
    create: search.create === true || search.create === "true",
  }),
  head: () => ({
    meta: [
      { title: "Campaigns — Vantage CRM" },
      { name: "description", content: "Create and manage email campaigns." },
    ],
  }),
  component: CampaignsPage,
});

const campaignSchema = z.object({
  name: z.string().trim().min(1, "Campaign name is required"),
  sequenceId: z.number().int().positive("Choose a sequence"),
  leadIds: z.array(z.number().int().positive()).min(1, "Choose at least one lead"),
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

function CampaignsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [formOpen, setFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [recipientFilter, setRecipientFilter] = useState<"all" | "subscribed" | "unsubscribed">("all");
  const [toDelete, setToDelete] = useState<Campaign | null>(null);
  const [draftReplyToEmail, setDraftReplyToEmail] = useState("");

  const campaignsQuery = useQuery({ queryKey: ["campaigns"], queryFn: getBatches });
  const leadsQuery = useQuery({ queryKey: ["leads"], queryFn: getLeads });
  const sequencesQuery = useQuery({ queryKey: ["sequences"], queryFn: getSequences });
  const selectedLeadsQuery = useQuery({
    queryKey: ["campaign-leads", selectedCampaign?.id],
    queryFn: () => getBatchLeads(selectedCampaign!.id),
    enabled: Boolean(selectedCampaign),
  });
  const emailLogsQuery = useQuery({ queryKey: ["logs"], queryFn: getEmailLogs });
  const selectedCampaignLogs = useMemo<EmailLog[]>(
    () => emailLogsQuery.data?.filter((log) => log.batchId === selectedCampaign?.id) ?? [],
    [emailLogsQuery.data, selectedCampaign?.id],
  );
  const visibleCampaignLeads = useMemo(
    () => (selectedLeadsQuery.data ?? []).filter((lead) =>
      recipientFilter === "all" ||
      (recipientFilter === "unsubscribed" ? lead.unsubscribed : !lead.unsubscribed),
    ),
    [selectedLeadsQuery.data, recipientFilter],
  );

  useEffect(() => {
    if (!search.create) return;
    setFormOpen(true);
    void navigate({ to: "/marketing/email-campaign/campaigns", search: { create: false }, replace: true });
  }, [search.create, navigate]);

  const createMutation = useMutation({
    mutationFn: (values: CampaignFormValues) => createBatch({
      name: values.name,
      sequenceId: String(values.sequenceId),
      leadIds: values.leadIds.map(String),
      replyToEmail: draftReplyToEmail.trim(),
      enquiryDateFrom: dateFrom || undefined,
      enquiryDateTo: dateTo || undefined,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setFormOpen(false);
      toast.success("Campaign created");
    },
    onError: (error: Error) => toast.error(error.message || "Could not create campaign"),
  });

  const editMutation = useMutation({
    mutationFn: ({ campaign, values }: { campaign: Campaign; values: CampaignFormValues }) => updateBatch(campaign.id, {
      name: values.name,
      sequenceId: String(values.sequenceId),
      leadIds: values.leadIds.map(String),
      replyToEmail: draftReplyToEmail.trim(),
      enquiryDateFrom: dateFrom || undefined,
      enquiryDateTo: dateTo || undefined,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setFormOpen(false);
      setEditingCampaign(null);
      toast.success("Campaign updated");
    },
    onError: (error: Error) => toast.error(error.message || "Could not update campaign"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ campaign, action }: { campaign: Campaign; action: "pause" | "resume" }) =>
      action === "pause" ? pauseBatch(campaign.id) : resumeBatch(campaign.id),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success(variables.action === "pause" ? "Campaign paused" : "Campaign resumed");
    },
    onError: (error: Error) => toast.error(error.message || "Could not update campaign"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBatch,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setToDelete(null);
      toast.success("Campaign deleted");
    },
    onError: (error: Error) => toast.error(error.message || "Could not delete campaign"),
  });

  const leads = leadsQuery.data ?? [];
  const sequences = sequencesQuery.data ?? [];
  const leadById = useMemo(() => new Map(leads.map((lead) => [lead.id, lead])), [leads]);
  const sequenceById = useMemo(() => new Map(sequences.map((sequence) => [sequence.id, sequence])), [sequences]);

  const columns = useMemo<Column<Campaign>[]>(() => [
    {
      key: "name",
      header: "Campaign",
      cell: (campaign) => <span className="font-medium">{campaign.name}</span>,
    },
    {
      key: "sequenceId",
      header: "Sequence",
      filterValue: (campaign) => sequenceById.get(campaign.sequenceId)?.name ?? "Unknown",
      cell: (campaign) => <span className="text-muted-foreground">{sequenceById.get(campaign.sequenceId)?.name ?? "Unknown sequence"}</span>,
    },
    {
      key: "leadIds",
      header: "Leads",
      filterable: false,
      sortable: false,
      cell: (campaign) => <span className="font-mono text-xs">{campaign.leadIds.length.toLocaleString()}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (campaign) => <StatusBadge status={campaign.status} />,
    },
    {
      key: "enquiryDateFrom",
      header: "Created",
      filterType: "date",
      filterValue: (campaign) => campaign.enquiryDateFrom,
      cell: (campaign) => <span className="font-mono text-[11px] text-muted-foreground">{campaign.enquiryDateFrom ? new Date(campaign.enquiryDateFrom).toLocaleDateString() : "—"}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      filterable: false,
      sortable: false,
      className: "text-right",
      headerClassName: "text-right",
      cell: (campaign) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="size-8" title="View campaign leads" aria-label="View campaign leads" onClick={() => setSelectedCampaign(campaign)}>
            <Eye />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" title="Edit campaign" aria-label="Edit campaign" onClick={() => {
            setEditingCampaign(campaign);
            setFormOpen(true);
          }}>
            <Pencil />
          </Button>
          {campaign.status !== "completed" && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              title={campaign.status === "paused" ? "Resume campaign" : "Pause campaign"}
              aria-label={campaign.status === "paused" ? "Resume campaign" : "Pause campaign"}
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate({ campaign, action: campaign.status === "paused" ? "resume" : "pause" })}
            >
              {campaign.status === "paused" ? <Play /> : <Pause />}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" title="Delete campaign" aria-label="Delete campaign" onClick={() => setToDelete(campaign)}>
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ], [sequenceById, statusMutation]);

  const [draftName, setDraftName] = useState("");
  const [draftSequenceId, setDraftSequenceId] = useState("");
  const [draftLeadIds, setDraftLeadIds] = useState<number[]>([]);
  const [leadSearch, setLeadSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (!formOpen) return;

    if (editingCampaign) {
      setDraftName(editingCampaign.name);
      setDraftSequenceId(String(editingCampaign.sequenceId));
      setDraftReplyToEmail(editingCampaign.replyToEmail);
      setDraftLeadIds(editingCampaign.leadIds.map((leadId) => Number(leadId)));
      setDateFrom(editingCampaign.enquiryDateFrom ?? "");
      setDateTo(editingCampaign.enquiryDateTo ?? "");
    } else {
      setDraftName("");
      setDraftSequenceId("");
      setDraftReplyToEmail("");
      setDraftLeadIds([]);
      setDateFrom("");
      setDateTo("");
    }

    setLeadSearch("");
    setStatusFilter("all");
    setSourceFilter("all");
  }, [formOpen, editingCampaign]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const searchText = leadSearch.trim().toLowerCase();
      const matchesSearch = !searchText || String(lead.srNo).includes(searchText) || lead.enquiryFor.toLowerCase().includes(searchText) || lead.companyName.toLowerCase().includes(searchText) || lead.contactName.toLowerCase().includes(searchText);
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      const matchesSource = sourceFilter === "all" || lead.source === sourceFilter;

      const leadCreated = new Date(`${lead.enquiryDate}T00:00:00`);
      const matchesFrom = !dateFrom || leadCreated >= new Date(dateFrom);
      const matchesTo = !dateTo || leadCreated <= new Date(`${dateTo}T23:59:59`);

      return matchesSearch && matchesStatus && matchesSource && matchesFrom && matchesTo;
    });
  }, [leads, leadSearch, statusFilter, sourceFilter, dateFrom, dateTo]);

  const toggleLead = (leadId: number) => {
    setDraftLeadIds((current) => current.includes(leadId)
      ? current.filter((id) => id !== leadId)
      : [...current, leadId]);
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredLeads.map((lead) => Number(lead.id));
    const allVisibleSelected = visibleIds.every((id) => draftLeadIds.includes(id));

    if (allVisibleSelected) {
      setDraftLeadIds((current) => current.filter((id) => !visibleIds.includes(id)));
      return;
    }

    setDraftLeadIds((current) => Array.from(new Set([...current, ...visibleIds])));
  };

  const canCreate = sequences.length > 0 && leads.length > 0;

  const handleCreateCampaign = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draftName.trim()) {
      toast.error("Campaign name is required");
      return;
    }

    if (!draftSequenceId) {
      toast.error("Please choose a sequence");
      return;
    }

    if (draftLeadIds.length === 0) {
      toast.error("Select at least one lead");
      return;
    }

    const values = {
      name: draftName.trim(),
      sequenceId: Number(draftSequenceId),
      leadIds: draftLeadIds,
    };

    if (editingCampaign) {
      editMutation.mutate({ campaign: editingCampaign, values });
      return;
    }

    createMutation.mutate({
      name: values.name,
      sequenceId: Number(values.sequenceId),
      leadIds: values.leadIds.map(Number),
    });
  };

  return (
    <div className="space-y-6">
      <div className="rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] tracking-wide text-muted-foreground">OUTREACH</div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Campaigns</h1>
        </div>
      </div>

      <div className="rise" style={{ animationDelay: "80ms" }}>
        <DataTable<Campaign>
          data={campaignsQuery.data ?? []}
          columns={columns}
          searchKeys={["name"]}
          searchPlaceholder="Search campaigns..."
          storageKey="campaigns"
          emptyMessage={campaignsQuery.isLoading ? "Loading campaigns…" : "No campaigns yet. Create one to enroll leads in a sequence."}
          toolbarActions={(
            <Button size="sm" className="h-9 gap-1.5" disabled={!canCreate} title={!canCreate ? "Create a lead and sequence first" : undefined} onClick={() => setFormOpen(true)}>
              <Plus className="size-4" /> New campaign
            </Button>
          )}
        />
        {campaignsQuery.isError && <p className="mt-2 text-sm text-destructive">{campaignsQuery.error.message}</p>}
        {!canCreate && !leadsQuery.isLoading && !sequencesQuery.isLoading && (
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Megaphone className="size-4" /> Add at least one lead and one sequence before launching a campaign.
          </p>
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingCampaign(null);
        }}
        title={editingCampaign ? "Edit Campaign Batch" : "Create Campaign Batch"}
        wide
      >
        <form onSubmit={handleCreateCampaign} className="bg-surface px-5 pb-5 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-1">
              <label className="mb-2 block text-sm font-medium text-foreground">Campaign Name</label>
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                className="h-12 w-full rounded-xl border border-[#2f80ed] bg-background px-3 text-sm text-foreground outline-none ring-0 focus:border-[#2f80ed]"
                placeholder="e.g. Jan 2025 Outreach"
              />
            </div>

            <div className="md:col-span-1">
              <label className="mb-2 block text-sm font-medium text-foreground">Sequence</label>
              <select
                value={draftSequenceId}
                onChange={(event) => setDraftSequenceId(event.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-[#2f80ed]"
              >
                <option value="">Select sequence</option>
                {sequences.map((sequence) => (
                  <option key={sequence.id} value={sequence.id}>
                    {sequence.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-foreground">Reply-to email</label>
            <input
              type="email"
              value={draftReplyToEmail}
              onChange={(event) => setDraftReplyToEmail(event.target.value)}
              className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-[#2f80ed]"
              placeholder="Replies go to the default sender if blank"
            />
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-foreground">Filter Leads</label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={leadSearch}
                onChange={(event) => setLeadSearch(event.target.value)}
                className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-[#2f80ed]"
                placeholder="Search company..."
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-[#2f80ed]"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="active">Active</option>
                <option value="hot">Hot</option>
                <option value="cold">Cold</option>
                <option value="junk">Junk</option>
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <select
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-[#2f80ed]"
              >
                <option value="all">All Source</option>
                {Array.from(new Set(leads.map((lead) => lead.source))).map((source) => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Enquiry Date From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                    className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-[#2f80ed]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Enquiry Date To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                    className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-[#2f80ed]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-foreground">
              Select Leads <span className="text-muted-foreground">{filteredLeads.length} shown</span> · {draftLeadIds.length} selected
            </div>
            <button
              type="button"
              className="text-sm font-medium text-foreground/80 hover:text-foreground"
              onClick={toggleSelectAll}
            >
              {filteredLeads.length > 0 && filteredLeads.every((lead) => draftLeadIds.includes(Number(lead.id))) ? "Deselect All" : "Select All"}
            </button>
          </div>

          <div className="mt-4 space-y-2 rounded-xl border border-line bg-background/40 p-1">
            {filteredLeads.length === 0 ? (
              <div className="flex min-h-[120px] items-center justify-center text-sm text-muted-foreground">
                No leads match the current filters.
              </div>
            ) : (
              filteredLeads.map((lead) => {
                const checked = draftLeadIds.includes(Number(lead.id));
                const leadDate = new Date(`${lead.enquiryDate}T00:00:00`).toLocaleDateString("en-GB");

                return (
                  <label
                    key={lead.id}
                    className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-colors ${checked ? "border-line bg-muted/30" : "border-transparent hover:bg-muted/20"}`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleLead(Number(lead.id))}
                        className="h-4 w-4 rounded border-input text-[#2f80ed] focus:ring-[#2f80ed]"
                      />
                      <div>
                        <div className="text-sm font-semibold uppercase text-foreground">{lead.companyName || `Enquiry #${lead.srNo}`} · {lead.enquiryFor}</div>
                        <div className="text-sm text-muted-foreground">{leadDate}{lead.contactName ? ` · ${lead.contactName}` : ""}</div>
                      </div>
                    </div>

                    <span className="rounded-md border border-input bg-background px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {lead.status}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)} className="h-11 px-6">
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || editMutation.isPending || !draftLeadIds.length} className="h-11 px-6">
              {editMutation.isPending ? "Saving..." : createMutation.isPending ? "Creating..." : editingCampaign ? `Save Campaign (${draftLeadIds.length} leads)` : `Start Campaign (${draftLeadIds.length} leads)`}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(selectedCampaign)}
        onClose={() => {
          setSelectedCampaign(null);
          setRecipientFilter("all");
        }}
        title={selectedCampaign?.name ?? "Campaign leads"}
        eyebrow="ENROLLED LEADS"
        wide
      >
        <div className="max-h-[65vh] overflow-auto p-4 sm:p-5">
          {selectedLeadsQuery.isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading enrolled leads…</p>
          ) : selectedLeadsQuery.isError ? (
            <p className="py-8 text-center text-sm text-destructive">{selectedLeadsQuery.error.message}</p>
          ) : !selectedLeadsQuery.data?.length ? (
            <EmptyState title="No leads assigned" />
          ) : (
            <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">{visibleCampaignLeads.length} recipients</span>
              <select
                aria-label="Filter campaign recipients by subscription status"
                value={recipientFilter}
                onChange={(event) => setRecipientFilter(event.target.value as typeof recipientFilter)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">All subscription statuses</option>
                <option value="subscribed">Subscribed</option>
                <option value="unsubscribed">Unsubscribed</option>
              </select>
            </div>
            <div className="overflow-x-auto rounded-md border border-line">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Step</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleCampaignLeads.map((campaignLead) => {
                    const lead: Lead | undefined = leadById.get(campaignLead.leadId);
                    const status = campaignLead.completed ? "completed" : campaignLead.replied ? "replied" : campaignLead.unsubscribed ? "unsubscribed" : "active";
                    return (
                      <TableRow key={campaignLead.leadId}>
                        <TableCell className="font-medium">{lead ? `Enquiry #${lead.srNo} · ${lead.enquiryFor}` : "Unknown enquiry"}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{campaignLead.email || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{campaignLead.currentStep}</TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1">
                            <StatusBadge status={status} />
                            <span className="text-xs text-muted-foreground">
                              {campaignLead.unsubscribed ? "Unsubscribed" : "Subscribed"}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            </>
          )}

          <div className="mt-6 border-t border-line pt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] tracking-wide text-muted-foreground">EMAIL ACTIVITY</p>
                <h3 className="font-display text-base font-semibold">Campaign logs</h3>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">{selectedCampaignLogs.length} total</span>
            </div>

            {emailLogsQuery.isLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Loading email activity…</p>
            ) : emailLogsQuery.isError ? (
              <p className="py-6 text-center text-sm text-destructive">{emailLogsQuery.error.message}</p>
            ) : !selectedCampaignLogs.length ? (
              <p className="rounded-md border border-dashed border-line px-4 py-6 text-center text-sm text-muted-foreground">No email activity yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-line">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Enquiry</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Step</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCampaignLogs.map((log) => {
                      const lead = leadById.get(log.leadId);
                      return (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="font-medium">{lead ? `Enquiry #${lead.srNo}` : "Unknown enquiry"}</div>
                            <div className="font-mono text-[11px] text-muted-foreground">{lead?.enquiryFor ?? log.leadId}</div>
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate text-muted-foreground">{log.subject}</TableCell>
                          <TableCell className="font-mono text-xs">#{log.step}</TableCell>
                          <TableCell><StatusBadge status={log.status} /></TableCell>
                          <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                            {new Date(log.sentAt).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.id)}
        title="Delete campaign"
        message={`Delete “${toDelete?.name ?? "this campaign"}” and its lead assignments?`}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}