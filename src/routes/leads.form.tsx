import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getLead, getLeadUsers, createLead, updateLead, type LeadInput } from "@/lib/api";

export const Route = createFileRoute("/leads/form")({
  validateSearch: (search: Record<string, unknown>) => ({
    leadId: typeof search.leadId === "string" ? search.leadId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Lead Form — Vantage CRM" },
      { name: "description", content: "Create or update an enquiry." },
    ],
  }),
  component: LeadFormPage,
});

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

function todayAsInputDate() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function emptyLead(): LeadInput {
  return {
    enquiry_for: "LEAD",
    enquiry_date: todayAsInputDate(),
    lead_received_by: 0,
    lead_assign_to: null,
    source: "OTHER",
    status: "NEW",
    followup_date: null,
    followup_remarks: "",
    is_opportunity: false,
  };
}

function LeadFormPage() {
  const { leadId } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<LeadInput>(emptyLead);
  const usersQuery = useQuery({ queryKey: ["lead-users"], queryFn: getLeadUsers });
  const leadQuery = useQuery({
    queryKey: ["lead", leadId],
    queryFn: () => getLead(leadId!),
    enabled: Boolean(leadId),
  });
  const users = usersQuery.data ?? [];

  useEffect(() => {
    if (leadQuery.data) {
      const lead = leadQuery.data;
      setForm({
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
    }
  }, [leadQuery.data]);

  useEffect(() => {
    if (!leadId && !form.lead_received_by && users.length) {
      setForm((current) => ({ ...current, lead_received_by: users[0].id }));
    }
  }, [form.lead_received_by, leadId, users]);

  const saveMutation = useMutation({
    mutationFn: (values: LeadInput) => leadId ? updateLead(leadId, values) : createLead(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
      if (leadId) await queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      toast.success(leadId ? "Lead updated" : "Lead created");
      await navigate({ to: "/leads" });
    },
    onError: (error: Error) => toast.error(error.message || "Unable to save lead"),
  });

  const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
  const inputClass = selectClass;
  const labelClass = "grid gap-1.5 text-sm font-medium text-foreground";

  if (leadId && leadQuery.isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Loading enquiry…</div>;
  }

  if (leadId && leadQuery.isError) {
    return (
      <section className="mx-auto max-w-3xl space-y-4">
        <p className="text-sm text-destructive">{leadQuery.error.message || "Unable to load this enquiry."}</p>
        <Button variant="outline" onClick={() => navigate({ to: "/leads" })}>
          <ArrowLeft /> Back to leads
        </Button>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="font-mono text-[11px] tracking-wide text-muted-foreground">AUDIENCE / ENQUIRY</div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">{leadId ? `Edit enquiry #${leadQuery.data?.srNo ?? ""}` : "New enquiry"}</h1>
        </div>
        <Button variant="outline" onClick={() => navigate({ to: "/leads" })}>
          <ArrowLeft /> Back to leads
        </Button>
      </div>

      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          saveMutation.mutate(form);
        }}
      >
        <section className="grid gap-5 sm:grid-cols-2" aria-labelledby="enquiry-details-heading">
          <h2 id="enquiry-details-heading" className="font-display text-lg font-semibold sm:col-span-2">Enquiry details</h2>
          <label className={labelClass}>
            Enquiry for <span className="text-destructive">*</span>
            <select required value={form.enquiry_for} onChange={(event) => setForm({ ...form, enquiry_for: event.target.value as LeadInput["enquiry_for"] })} className={selectClass}>
              <option value="LEAD">Lead</option>
              <option value="CLIENT">Client</option>
            </select>
          </label>
          <label className={labelClass}>
            Enquiry date <span className="text-destructive">*</span>
            <input type="date" required value={form.enquiry_date} onChange={(event) => setForm({ ...form, enquiry_date: event.target.value })} className={inputClass} />
          </label>
          <label className={labelClass}>
            Received by <span className="text-destructive">*</span>
            <select required value={form.lead_received_by || ""} onChange={(event) => setForm({ ...form, lead_received_by: Number(event.target.value) })} className={selectClass}>
              <option value="" disabled>Select a user</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </label>
          <label className={labelClass}>
            Assigned to
            <select value={form.lead_assign_to ?? ""} onChange={(event) => setForm({ ...form, lead_assign_to: event.target.value ? Number(event.target.value) : null })} className={selectClass}>
              <option value="">Unassigned</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </label>
          <label className={labelClass}>
            Source
            <select value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} className={selectClass}>
              {LEAD_SOURCES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className={labelClass}>
            Status
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className={selectClass}>
              {LEAD_STATUSES.map((value) => <option key={value} value={value}>{value[0] + value.slice(1).toLowerCase()}</option>)}
            </select>
          </label>
        </section>

        <section className="grid gap-5 border-t border-line pt-5 sm:grid-cols-2" aria-labelledby="followup-heading">
          <h2 id="followup-heading" className="font-display text-lg font-semibold sm:col-span-2">Follow-up</h2>
          <label className={labelClass}>
            Follow-up date
            <input type="date" value={form.followup_date ?? ""} onChange={(event) => setForm({ ...form, followup_date: event.target.value || null })} className={inputClass} />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Remarks
            <textarea rows={4} value={form.followup_remarks} onChange={(event) => setForm({ ...form, followup_remarks: event.target.value })} className={`${selectClass} h-auto py-2`} />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={form.is_opportunity} onChange={(event) => setForm({ ...form, is_opportunity: event.target.checked })} className="size-4 accent-brand" />
            Mark as opportunity
          </label>
        </section>

        <div className="flex justify-end gap-2 border-t border-line pt-5">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/leads" })}>Cancel</Button>
          <Button type="submit" disabled={saveMutation.isPending || usersQuery.isLoading}>
            <Save /> {saveMutation.isPending ? "Saving…" : leadId ? "Save changes" : "Create lead"}
          </Button>
        </div>
      </form>
    </div>
  );
}
