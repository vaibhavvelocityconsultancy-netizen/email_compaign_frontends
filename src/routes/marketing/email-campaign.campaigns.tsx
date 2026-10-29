import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Eye, Megaphone, Pause, Pencil, Play, Plus, RefreshCw, Send, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { Modal } from "@/components/common/Modal";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  createBatch,
  createTemplate,
  createLeadCategory,
  deleteBatch,
  getBatchLeads,
  getBatches,
  getEmailLogs,
  getLeads,
  getLeadCategories,
  getSequences,
  getTemplates,
  request,
  pauseBatch,
  resumeBatch,
  sendBatchNow,
  updateBatch,
  type Campaign,
  type EmailLog,
  type Lead,
  type MessageTemplate,
} from "@/lib/api";
import { syncIonosMailbox } from "@/lib/mailgun-settings-api";

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
  categoryId: z.number().int().positive().optional(),
  sequenceId: z.number().int().positive().optional(),
  templateId: z.number().int().positive().optional(),
  leadIds: z.array(z.number().int().positive()).min(1, "Choose at least one lead"),
});

type CampaignFormValues = z.infer<typeof campaignSchema>;
const LEAD_PICKER_PAGE_SIZE = 5;

function templatesForCategory(
  templates: MessageTemplate[],
  categoryId: string | null | undefined,
): MessageTemplate[] {
  if (!categoryId) return templates;
  return templates.filter((template) => String(template.categoryId ?? "") === categoryId);
}

function CampaignsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [formOpen, setFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [recipientFilter, setRecipientFilter] = useState<"all" | "subscribed" | "unsubscribed">("all");
  const [toDelete, setToDelete] = useState<Campaign | null>(null);
  const [sendingCampaign, setSendingCampaign] = useState<Campaign | null>(null);
  const [sendTemplateId, setSendTemplateId] = useState("");
  const [draftCategoryId, setDraftCategoryId] = useState("");
  const [categoryNameDraft, setCategoryNameDraft] = useState("");
  const [showCategoryCreator, setShowCategoryCreator] = useState(false);
  const [newTemplateCategoryId, setNewTemplateCategoryId] = useState("");
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateSubject, setNewTemplateSubject] = useState("");
  const [newTemplateBody, setNewTemplateBody] = useState("");
  const [newTemplateSignature, setNewTemplateSignature] = useState("");
  const [draftTemplateId, setDraftTemplateId] = useState("");
  const [syncingReplies, setSyncingReplies] = useState(false);

  async function syncCampaignReplies() {
    setSyncingReplies(true);
    const results = await Promise.allSettled([
      request<{ processed_count: number }>("/auth/gmail-connection/sync/", { method: "POST" }),
      syncIonosMailbox(),
    ]);
    setSyncingReplies(false);

    const providers = ["Gmail", "IONOS"];
    const summary = results.map((result, index) => {
      const provider = providers[index];
      if (result.status === "fulfilled") {
        const count = result.value.processed_count;
        return `${provider}: ${count} new repl${count === 1 ? "y" : "ies"}`;
      }
      const message = result.reason instanceof Error ? result.reason.message : "sync failed";
      return `${provider}: ${message}`;
    });

    if (results.every((result) => result.status === "fulfilled")) {
      toast.success(`Reply sync complete. ${summary.join("; ")}.`);
    } else {
      toast.error(summary.join("; "));
    }
  }

  const campaignsQuery = useQuery({ queryKey: ["campaigns"], queryFn: getBatches });
  const leadsQuery = useQuery({ queryKey: ["leads"], queryFn: getLeads });
  const categoriesQuery = useQuery({ queryKey: ["lead-categories"], queryFn: getLeadCategories });
  const sequencesQuery = useQuery({ queryKey: ["sequences"], queryFn: getSequences });
  const templatesQuery = useQuery({ queryKey: ["templates"], queryFn: getTemplates });
  const emailTemplates = (templatesQuery.data ?? []).filter((template) => template.channel === "email");
  const categoryTemplates = templatesForCategory(emailTemplates, draftCategoryId);
  const sendCampaignTemplates = templatesForCategory(
    emailTemplates,
    sendingCampaign?.categoryId,
  );
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
      ...(values.categoryId ? { categoryId: String(values.categoryId) } : {}),
      ...(values.sequenceId ? { sequenceId: String(values.sequenceId) } : {}),
      ...(values.templateId ? { templateId: String(values.templateId) } : {}),
      leadIds: values.leadIds.map(String),
    }),
    onSuccess: async ({ campaign, automaticEmail }) => {
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setFormOpen(false);
      if (automaticEmail?.sent) {
        const failureSummary = automaticEmail.failed
          ? ` ${automaticEmail.failed} failed.`
          : "";
        toast.success(
          `Campaign created; ${automaticEmail.sent} email${automaticEmail.sent === 1 ? "" : "s"} sent automatically.${failureSummary}`,
        );
      } else if (automaticEmail?.failed) {
        toast.error(
          `Campaign created, but ${automaticEmail.failed} automatic email${automaticEmail.failed === 1 ? "" : "s"} failed.`,
        );
      } else {
        toast.success(`Campaign "${campaign.name}" created`);
      }
    },
    onError: (error: Error) => toast.error(error.message || "Could not create campaign"),
  });

  const editMutation = useMutation({
    mutationFn: ({ campaign, values }: { campaign: Campaign; values: CampaignFormValues }) => updateBatch(campaign.id, {
      name: values.name,
      categoryId: values.categoryId ? String(values.categoryId) : null,
      sequenceId: values.sequenceId ? String(values.sequenceId) : null,
      leadIds: values.leadIds.map(String),
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
    mutationFn: async ({ campaign, action }: { campaign: Campaign; action: "pause" | "resume" }) => {
      if (action === "pause") {
        await pauseBatch(campaign.id);
        return null;
      }
      return resumeBatch(campaign.id);
    },
    onSuccess: async (result, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      if (variables.action === "pause") {
        toast.success("Campaign paused");
      } else if (result?.automaticEmail?.sent) {
        const { sent, failed } = result.automaticEmail;
        const failureSummary = failed ? ` ${failed} failed.` : "";
        toast.success(
          `Campaign resumed; ${sent} email${sent === 1 ? "" : "s"} sent automatically.${failureSummary}`,
        );
      } else if (result?.automaticEmail?.failed) {
        const { failed } = result.automaticEmail;
        toast.error(
          `Campaign resumed, but ${failed} automatic email${failed === 1 ? "" : "s"} failed.`,
        );
      } else {
        toast.success("Campaign resumed");
      }
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

  const sendMutation = useMutation({
    mutationFn: ({ campaign, templateId }: {
      campaign: Campaign;
      templateId: string;
    }) => sendBatchNow(campaign.id, { templateId }),
    onSuccess: async (result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
        queryClient.invalidateQueries({ queryKey: ["logs"] }),
        queryClient.invalidateQueries({ queryKey: ["campaign-leads", variables.campaign.id] }),
      ]);
      setSendingCampaign(null);
      if (result.failed) {
        toast.error(`Sent ${result.sent} email${result.sent === 1 ? "" : "s"}; ${result.failed} failed`);
      } else {
        toast.success(`${result.sent} email${result.sent === 1 ? "" : "s"} sent`);
      }
    },
    onError: (error: Error) => toast.error(error.message || "Could not send campaign"),
  });

  const createSendTemplateMutation = useMutation({
    mutationFn: () => createTemplate({
      channel: "email",
      name: newTemplateName.trim(),
      categoryId: newTemplateCategoryId ? Number(newTemplateCategoryId) : null,
      subject: newTemplateSubject.trim(),
      body: newTemplateBody.trim(),
      signature: newTemplateSignature.trim(),
    }),
    onSuccess: async (template: MessageTemplate) => {
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      setSendTemplateId(template.id);
      setCreateTemplateOpen(false);
      setNewTemplateName("");
      setNewTemplateSubject("");
      setNewTemplateBody("");
      setNewTemplateSignature("");
      setNewTemplateCategoryId("");
      toast.success("Email template created and selected");
    },
    onError: (error: Error) => toast.error(error.message || "Could not create email template"),
  });

  const createCategoryMutation = useMutation({
    mutationFn: () => createLeadCategory(categoryNameDraft.trim()),
    onSuccess: async (category) => {
      await queryClient.invalidateQueries({ queryKey: ["lead-categories"] });
      setDraftCategoryId(String(category.id));
      setCategoryNameDraft("");
      setShowCategoryCreator(false);
      setDraftTemplateId("");
      toast.success(`Category "${category.name}" is ready.`);
    },
    onError: (error: Error) => toast.error(error.message || "Could not create category"),
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
      filterValue: (campaign) => sequenceById.get(campaign.sequenceId)?.name ?? "One-time",
      cell: (campaign) => <span className="text-muted-foreground">{sequenceById.get(campaign.sequenceId)?.name ?? "One-time send"}</span>,
    },
    {
      key: "categoryId",
      header: "Category",
      filterValue: (campaign) => categoriesQuery.data?.find((category) => String(category.id) === campaign.categoryId)?.name ?? "",
      cell: (campaign) => <span className="text-muted-foreground">{categoriesQuery.data?.find((category) => String(category.id) === campaign.categoryId)?.name ?? "—"}</span>,
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
      key: "createdAt",
      header: "Created",
      filterType: "date",
      filterValue: (campaign) => campaign.createdAt,
      cell: (campaign) => <span className="font-mono text-[11px] text-muted-foreground">{new Date(campaign.createdAt).toLocaleDateString()}</span>,
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
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            title="Send campaign email"
            aria-label={`Send campaign email for ${campaign.name}`}
            disabled={campaign.status !== "active"}
            onClick={() => {
              setSendingCampaign(campaign);
              setSendTemplateId("");
              setNewTemplateCategoryId(campaign.categoryId);
              setCreateTemplateOpen(false);
            }}
          >
            <Send />
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
  ], [categoriesQuery.data, sequenceById, statusMutation]);

  const [draftName, setDraftName] = useState("");
  const [draftSequenceId, setDraftSequenceId] = useState("");
  const [draftLeadIds, setDraftLeadIds] = useState<number[]>([]);
  const [leadSearch, setLeadSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [enquiryDateFilter, setEnquiryDateFilter] = useState("");
  const [followupDateFilter, setFollowupDateFilter] = useState("");
  const [leadPage, setLeadPage] = useState(0);

  useEffect(() => {
    if (!formOpen) return;

    if (editingCampaign) {
      setDraftName(editingCampaign.name);
      setDraftCategoryId(editingCampaign.categoryId);
      setDraftSequenceId(editingCampaign.sequenceId);
      setDraftTemplateId("");
      setDraftLeadIds(editingCampaign.leadIds.map((leadId) => Number(leadId)));
    } else {
      setDraftName("");
      setDraftCategoryId("");
      setDraftSequenceId("");
      setDraftTemplateId("");
      setDraftLeadIds([]);
    }

    setEnquiryDateFilter("");
    setFollowupDateFilter("");
    setLeadSearch("");
    setStatusFilter("all");
    setSourceFilter("all");
    setLeadPage(0);
    setShowCategoryCreator(false);
    setCategoryNameDraft("");
  }, [formOpen, editingCampaign]);

  useEffect(() => {
    setLeadPage(0);
  }, [leadSearch, statusFilter, sourceFilter, draftCategoryId, enquiryDateFilter, followupDateFilter]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const searchText = leadSearch.trim().toLowerCase();
      const matchesSearch = !searchText || String(lead.srNo).includes(searchText) || lead.enquiryFor.toLowerCase().includes(searchText) || lead.companyName.toLowerCase().includes(searchText) || lead.contactName.toLowerCase().includes(searchText) || lead.contactEmail.toLowerCase().includes(searchText);
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      const matchesSource = sourceFilter === "all" || lead.source === sourceFilter;
      const matchesCategory = !draftCategoryId || String(lead.categoryId ?? "") === draftCategoryId;

      const matchesEnquiryDate = !enquiryDateFilter || lead.enquiryDate === enquiryDateFilter;
      const matchesFollowupDate = !followupDateFilter || lead.followupDate === followupDateFilter;

      return matchesSearch && matchesStatus && matchesSource && matchesCategory && matchesEnquiryDate && matchesFollowupDate;
    });
  }, [leads, leadSearch, statusFilter, sourceFilter, draftCategoryId, enquiryDateFilter, followupDateFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredLeads.length / LEAD_PICKER_PAGE_SIZE));
  const currentLeadPage = Math.min(leadPage, pageCount - 1);
  const pageLeads = filteredLeads.slice(
    currentLeadPage * LEAD_PICKER_PAGE_SIZE,
    (currentLeadPage + 1) * LEAD_PICKER_PAGE_SIZE,
  );

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

  const canCreate = leads.length > 0;

  const handleCreateCampaign = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draftName.trim()) {
      toast.error("Campaign name is required");
      return;
    }

    if (draftLeadIds.length === 0) {
      toast.error("Select at least one lead");
      return;
    }

    const values = {
      name: draftName.trim(),
      ...(draftCategoryId ? { categoryId: Number(draftCategoryId) } : {}),
      ...(draftSequenceId ? { sequenceId: Number(draftSequenceId) } : {}),
      ...(!draftSequenceId && draftTemplateId ? { templateId: Number(draftTemplateId) } : {}),
      leadIds: draftLeadIds,
    };

    if (editingCampaign) {
      editMutation.mutate({ campaign: editingCampaign, values });
      return;
    }

    createMutation.mutate({
      name: values.name,
      ...(values.categoryId ? { categoryId: String(values.categoryId) } : {}),
      ...(values.sequenceId ? { sequenceId: Number(values.sequenceId) } : {}),
      ...(values.templateId ? { templateId: Number(values.templateId) } : {}),
      leadIds: values.leadIds.map(Number),
    });
  };

  return (
<div className="space-y-6">
  <div className="rise flex flex-wrap items-end justify-between gap-3 rounded-xl border border-line bg-card/60 p-5 shadow-sm">
  <div>
  <div className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground">OUTREACH</div>
  <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Campaigns</h1>
  <p className="mt-2 max-w-xl text-sm text-muted-foreground">Coordinate targeted outreach with clear ownership, timing, and delivery visibility.</p>
        </div>
        <Button size="sm" variant="outline" className="h-9 gap-1.5" disabled={syncingReplies} onClick={syncCampaignReplies}>
          <RefreshCw className={`size-4 ${syncingReplies ? "animate-spin" : ""}`} />
          {syncingReplies ? "Syncing replies…" : "Sync Replies"}
        </Button>
      </div>

      <div className="rise" style={{ animationDelay: "80ms" }}>
        <DataTable<Campaign>
          data={campaignsQuery.data ?? []}
          columns={columns}
          searchKeys={["name"]}
          searchPlaceholder="Search campaigns..."
          storageKey="campaigns"
          emptyMessage={campaignsQuery.isLoading ? "Loading campaigns…" : "No campaigns yet. Create one to enroll leads."}
          toolbarActions={(
            <div className="flex gap-2">
              <Button size="sm" className="h-9 gap-1.5" disabled={!canCreate} title={!canCreate ? "Create a lead first" : undefined} onClick={() => setFormOpen(true)}>
                <Plus className="size-4" /> New campaign
              </Button>
            </div>
          )}
        />
        {campaignsQuery.isError && <p className="mt-2 text-sm text-destructive">{campaignsQuery.error.message}</p>}
        {!canCreate && !leadsQuery.isLoading && (
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Megaphone className="size-4" /> Add at least one lead before creating a campaign. A sequence is optional.
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
              <label className="mb-2 block text-sm font-medium text-foreground">Category</label>
              <div className="flex gap-2">
                <select
                  value={draftCategoryId}
                  onChange={(event) => {
                    setDraftCategoryId(event.target.value);
                    setDraftTemplateId("");
                  }}
                  className="h-12 min-w-0 flex-1 appearance-none rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-[#2f80ed]"
                >
                  <option value="">All categories</option>
                  {(categoriesQuery.data ?? []).map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                <button type="button" className="rounded-xl border border-input px-3 text-sm" onClick={() => setShowCategoryCreator((open) => !open)}>
                  Add
                </button>
              </div>
              {showCategoryCreator && (
                <div className="mt-2 flex gap-2">
                  <input value={categoryNameDraft} onChange={(event) => setCategoryNameDraft(event.target.value)} placeholder="e.g. Doctor" className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm" />
                  <button type="button" disabled={createCategoryMutation.isPending || !categoryNameDraft.trim()} onClick={() => createCategoryMutation.mutate()} className="rounded-lg border border-input px-3 text-sm disabled:opacity-50">
                    {createCategoryMutation.isPending ? "Adding…" : "Save"}
                  </button>
                </div>
              )}
            </div>

            <div className="md:col-span-1">
              <label className="mb-2 block text-sm font-medium text-foreground">Sequence <span className="text-muted-foreground">(optional)</span></label>
              <select
                value={draftSequenceId}
                onChange={(event) => {
                  setDraftSequenceId(event.target.value);
                  setDraftTemplateId("");
                }}
                className="h-12 w-full appearance-none rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-[#2f80ed]"
              >
                <option value="">No sequence — send a template manually</option>
                {sequences.map((sequence) => (
                  <option key={sequence.id} value={sequence.id}>
                    {sequence.name}
                  </option>
                ))}
              </select>
            </div>
            {!draftSequenceId && !editingCampaign && (
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-foreground">Email template <span className="text-muted-foreground">(optional; sends immediately when selected)</span></label>
                <select
                  value={draftTemplateId}
                  onChange={(event) => setDraftTemplateId(event.target.value)}
                  className="h-12 w-full appearance-none rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-[#2f80ed]"
                >
                  <option value="">Create without sending</option>
                  {categoryTemplates.map((template) => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
                {!templatesQuery.isLoading && categoryTemplates.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {draftCategoryId
                      ? "No email templates are available for this category."
                      : "No email templates are available."}
                  </p>
                )}
              </div>
            )}
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
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Enquiry Date</label>
                  <input
                    type="date"
                    value={enquiryDateFilter}
                    onChange={(event) => setEnquiryDateFilter(event.target.value)}
                    className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-[#2f80ed]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Follow-up Date</label>
                  <input
                    type="date"
                    value={followupDateFilter}
                    onChange={(event) => setFollowupDateFilter(event.target.value)}
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

          <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-background/40">
            {filteredLeads.length === 0 ? (
              <div className="flex min-h-[120px] items-center justify-center text-sm text-muted-foreground">
                No leads match the current filters.
              </div>
            ) : (
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-line bg-muted/30 text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={filteredLeads.length > 0 && filteredLeads.every((lead) => draftLeadIds.includes(Number(lead.id)))}
                        onChange={toggleSelectAll}
                        aria-label="Select all filtered leads"
                        className="h-4 w-4 rounded border-input text-[#2f80ed] focus:ring-[#2f80ed]"
                      />
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">Company</th>
                    <th scope="col" className="px-3 py-3 font-medium">Contact</th>
                    <th scope="col" className="px-3 py-3 font-medium">Email</th>
                    <th scope="col" className="px-3 py-3 font-medium">Category</th>
                    <th scope="col" className="px-3 py-3 font-medium">Status</th>
                    <th scope="col" className="px-3 py-3 font-medium">Enquiry date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pageLeads.map((lead) => {
                    const checked = draftLeadIds.includes(Number(lead.id));
                    const leadDate = lead.enquiryDate
                      ? new Date(`${lead.enquiryDate}T00:00:00`).toLocaleDateString("en-GB")
                      : "—";
                    return (
                      <tr key={lead.id} className={checked ? "bg-muted/30" : "hover:bg-muted/20"}>
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleLead(Number(lead.id))}
                            aria-label={`Select ${lead.contactName || lead.companyName || `lead ${lead.srNo}`}`}
                            className="h-4 w-4 rounded border-input text-[#2f80ed] focus:ring-[#2f80ed]"
                          />
                        </td>
                        <td className="px-3 py-3 font-medium">{lead.companyName || `Enquiry #${lead.srNo}`}</td>
                        <td className="px-3 py-3">{lead.contactName || "—"}</td>
                        <td className="px-3 py-3">{lead.contactEmail || "No email"}</td>
                        <td className="px-3 py-3">{lead.categoryName || "—"}</td>
                        <td className="px-3 py-3 capitalize">{lead.status}</td>
                        <td className="px-3 py-3 whitespace-nowrap">{leadDate}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          {filteredLeads.length > 0 && (
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Showing {currentLeadPage * LEAD_PICKER_PAGE_SIZE + 1}–
                {Math.min((currentLeadPage + 1) * LEAD_PICKER_PAGE_SIZE, filteredLeads.length)}
                {" "}of {filteredLeads.length} leads
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLeadPage((page) => Math.max(0, page - 1))}
                  disabled={currentLeadPage === 0}
                  aria-label="Previous lead page"
                >
                  <ChevronLeft className="size-4" /> Previous
                </Button>
                <span>Page {currentLeadPage + 1} of {pageCount}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLeadPage((page) => Math.min(pageCount - 1, page + 1))}
                  disabled={currentLeadPage >= pageCount - 1}
                  aria-label="Next lead page"
                >
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}

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
        open={Boolean(sendingCampaign)}
        onClose={() => {
          setSendingCampaign(null);
          setCreateTemplateOpen(false);
        }}
        title={`Send ${sendingCampaign?.name ?? "campaign"}`}
        eyebrow="SEND CAMPAIGN EMAIL"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!sendingCampaign || !sendTemplateId) {
              toast.error("Choose an email template");
              return;
            }
            sendMutation.mutate({
              campaign: sendingCampaign,
              templateId: sendTemplateId,
            });
          }}
          className="space-y-4 p-5"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Email template</label>
            <select
              required
              value={sendTemplateId}
              onChange={(event) => setSendTemplateId(event.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Select email template</option>
              {!templatesQuery.isLoading && sendCampaignTemplates.length === 0 && (
                <option value="" disabled>
                  {sendingCampaign?.categoryId
                    ? "No templates for this category"
                    : "No email templates available"}
                </option>
              )}
              {sendCampaignTemplates.map((template) => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
            {templatesQuery.isError && (
              <p className="mt-1 text-xs text-destructive">{templatesQuery.error.message}</p>
            )}
          </div>

          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateTemplateOpen((open) => !open)}
            >
              <Plus className="size-4" /> {createTemplateOpen ? "Cancel new template" : "Create new template"}
            </Button>
          </div>

          {createTemplateOpen && (
            <div className="space-y-3 rounded-lg border border-line bg-background/50 p-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Category</label>
                <select
                  value={newTemplateCategoryId}
                  onChange={(event) => setNewTemplateCategoryId(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Uncategorized</option>
                  {(categoriesQuery.data ?? []).map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Template name</label>
                <input
                  required
                  value={newTemplateName}
                  onChange={(event) => setNewTemplateName(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Subject</label>
                <input
                  required
                  value={newTemplateSubject}
                  onChange={(event) => setNewTemplateSubject(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email body</label>
                <textarea
                  required
                  rows={5}
                  value={newTemplateBody}
                  onChange={(event) => setNewTemplateBody(event.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Signature <span className="text-muted-foreground">(optional)</span></label>
                <textarea
                  rows={2}
                  value={newTemplateSignature}
                  onChange={(event) => setNewTemplateSignature(event.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <Button
                type="button"
                size="sm"
                disabled={
                  createSendTemplateMutation.isPending ||
                  !newTemplateName.trim() ||
                  !newTemplateSubject.trim() ||
                  !newTemplateBody.trim()
                }
                onClick={() => createSendTemplateMutation.mutate()}
              >
                {createSendTemplateMutation.isPending ? "Creating…" : "Create and select template"}
              </Button>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="outline" onClick={() => setSendingCampaign(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={sendMutation.isPending || !sendTemplateId}>
              <Send /> {sendMutation.isPending ? "Sending…" : "Send"}
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
