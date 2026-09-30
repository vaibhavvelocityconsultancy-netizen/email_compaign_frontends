import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, Save, Target } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getLead, createLead, updateLead, type LeadInput } from "@/lib/api";

export const Route = createFileRoute("/marketing/leads/form")({
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

type LeadFormValues = LeadInput;

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

// Static class strings so Tailwind can see them.
const LEAD_STATUSES = [
  { value: "NEW", label: "New", dot: "bg-blue-500" },
  { value: "ACTIVE", label: "Active", dot: "bg-emerald-500" },
  { value: "HOT", label: "Hot", dot: "bg-red-500" },
  { value: "COLD", label: "Cold", dot: "bg-sky-300" },
  { value: "JUNK", label: "Junk", dot: "bg-zinc-400" },
] as const;

const FOLLOWUP_SHORTCUTS = [
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "Next week", days: 7 },
] as const;

function toInputDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function daysFromToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toInputDate(date);
}

function emptyLead(): LeadFormValues {
  return {
    company_name: "",
    company_address: "",
    company_city: "",
    company_state: "",
    company_pincode: "",
    company_country: "India",
    company_gst_number: "",
    contact_name: "",
    contact_designation: "",
    contact_mobile: "",
    contact_email: "",
    enquiry_for: "LEAD",
    enquiry_date: toInputDate(new Date()),
    source: "OTHER",
    status: "NEW",
    followup_date: null,
    followup_remarks: "",
    is_opportunity: false,
  };
}

const controlClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm transition-colors " +
  "hover:border-foreground/30 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 " +
  "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20";

function Field({
  label,
  required,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label className="grid gap-1.5 text-sm font-medium text-foreground">
        <span>
          {label}
          {required && <span aria-hidden className="ml-0.5 text-destructive">*</span>}
        </span>
        {children}
      </label>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="space-y-6 border-b border-line py-8 first:pt-0"
    >
      <div>
        <h2 id={id} className="font-display text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-6">{children}</div>
    </section>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-5 sm:grid-cols-2 [&+&]:border-t [&+&]:border-line [&+&]:pt-5">
      <legend className="sr-only">{title}</legend>
      <h3 aria-hidden className="text-sm font-semibold text-foreground sm:col-span-2">{title}</h3>
      {children}
    </fieldset>
  );
}

function LeadFormSkeleton() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse space-y-8" aria-busy="true" aria-label="Loading enquiry">
      <div className="h-9 w-56 rounded bg-muted" />
      {[0, 1].map((i) => (
        <div key={i} className="space-y-6 border-b border-line pb-8">
          <div className="space-y-2">
            <div className="h-5 w-36 rounded bg-muted" />
            <div className="h-3 w-56 rounded bg-muted" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="h-10 rounded bg-muted" />
            <div className="h-10 rounded bg-muted" />
            <div className="h-10 rounded bg-muted" />
            <div className="h-10 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LeadFormPage() {
  const { leadId } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<LeadFormValues>(emptyLead);
  // Snapshot of the last loaded values, used to show "Unsaved changes".
  const [baseline, setBaseline] = useState(() => JSON.stringify(emptyLead()));

  const leadQuery = useQuery({
    queryKey: ["lead", leadId],
    queryFn: () => getLead(leadId!),
    enabled: Boolean(leadId),
  });

  useEffect(() => {
    if (leadQuery.data) {
      const lead = leadQuery.data;
      const loaded: LeadFormValues = {
        company_name: lead.companyName ?? "",
        company_address: lead.companyAddress ?? "",
        company_city: lead.companyCity ?? "",
        company_state: lead.companyState ?? "",
        company_pincode: lead.companyPincode ?? "",
        company_country: lead.companyCountry ?? "India",
        company_gst_number: lead.companyGstNumber ?? "",
        contact_name: lead.contactName ?? "",
        contact_designation: lead.contactDesignation ?? "",
        contact_mobile: lead.contactMobile ?? "",
        contact_email: lead.contactEmail ?? "",
        enquiry_for: lead.enquiryFor,
        enquiry_date: lead.enquiryDate,
        source: lead.source,
        status: lead.status.toUpperCase(),
        followup_date: lead.followupDate,
        followup_remarks: lead.followupRemarks,
        is_opportunity: lead.isOpportunity,
      };
      setForm(loaded);
      setBaseline(JSON.stringify(loaded));
    }
  }, [leadQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (values: LeadFormValues) => (leadId ? updateLead(leadId, values) : createLead(values)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
      if (leadId) await queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      toast.success(leadId ? "Lead updated" : "Lead created");
      await navigate({ to: "/marketing/leads" });
    },
    onError: (error: Error) => toast.error(error.message || "Unable to save lead"),
  });

  const update = <K extends keyof LeadFormValues>(key: K, value: LeadFormValues[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const isDirty = JSON.stringify(form) !== baseline;
  const followupError =
    form.followup_date && form.followup_date < form.enquiry_date
      ? "Follow-up can't be before the enquiry date."
      : null;
  const canSubmit = !saveMutation.isPending && !followupError;
  const goBack = () => navigate({ to: "/marketing/leads" });

  if (leadId && leadQuery.isLoading) return <LeadFormSkeleton />;

  if (leadId && leadQuery.isError) {
    return (
      <section className="mx-auto max-w-3xl space-y-4">
        <p className="text-sm text-destructive">
          {leadQuery.error.message || "Couldn't load this enquiry. Try again, or go back to the list."}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => leadQuery.refetch()}>Try again</Button>
          <Button variant="ghost" onClick={goBack}>
            <ArrowLeft /> Back to leads
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto p-11">
      <div className="mb-8">
        <Button variant="ghost" size="sm" onClick={goBack} className="-ml-3 mb-3 text-muted-foreground">
          <ArrowLeft /> Leads
        </Button>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {leadId ? `Edit enquiry${leadQuery.data?.srNo ? ` #${leadQuery.data.srNo}` : ""}` : "New enquiry"}
        </h1>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) saveMutation.mutate(form);
        }}
      >
        <Section
          id="contact-details-heading"
          title="Contact details"
          description="The company first, then the person we'll be speaking to."
        >
          <Group title="Company">
            <Field label="Company name" required className="sm:col-span-2">
              <input
                type="text"
                required
                autoComplete="organization"
                value={form.company_name}
                onChange={(event) => update("company_name", event.target.value)}
                className={controlClass}
              />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <textarea
                rows={3}
                autoComplete="street-address"
                value={form.company_address}
                onChange={(event) => update("company_address", event.target.value)}
                className={`${controlClass} h-auto py-2`}
              />
            </Field>
            <Field label="City">
              <input
                type="text"
                autoComplete="address-level2"
                value={form.company_city}
                onChange={(event) => update("company_city", event.target.value)}
                className={controlClass}
              />
            </Field>
            <Field label="State">
              <input
                type="text"
                autoComplete="address-level1"
                value={form.company_state}
                onChange={(event) => update("company_state", event.target.value)}
                className={controlClass}
              />
            </Field>
            <Field label="Pincode">
              <input type="text" inputMode="numeric" autoComplete="postal-code" value={form.company_pincode} onChange={(event) => update("company_pincode", event.target.value)} className={controlClass} />
            </Field>
            <Field label="Country">
              <input type="text" autoComplete="country-name" value={form.company_country} onChange={(event) => update("company_country", event.target.value)} className={controlClass} />
            </Field>
            <Field label="GST number" className="sm:col-span-2">
              <input type="text" value={form.company_gst_number} onChange={(event) => update("company_gst_number", event.target.value)} className={controlClass} />
            </Field>
          </Group>

          <Group title="Contact person">
            <Field label="Name" required>
              <input
                type="text"
                required
                autoComplete="name"
                value={form.contact_name}
                onChange={(event) => update("contact_name", event.target.value)}
                className={controlClass}
              />
            </Field>
            <Field label="Designation">
              <input
                type="text"
                autoComplete="organization-title"
                value={form.contact_designation}
                onChange={(event) => update("contact_designation", event.target.value)}
                className={controlClass}
              />
            </Field>
            <Field label="Mobile" required>
              <input
                type="tel"
                required
                autoComplete="tel"
                inputMode="tel"
                value={form.contact_mobile}
                onChange={(event) => update("contact_mobile", event.target.value)}
                className={controlClass}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                autoComplete="email"
                value={form.contact_email}
                onChange={(event) => update("contact_email", event.target.value)}
                className={controlClass}
              />
            </Field>
          </Group>
        </Section>

        <Section
          id="enquiry-heading"
          title="Enquiry"
          description="What came in, where from, and when to follow up."
        >
          <Group title="Enquiry details">
            <Field label="Enquiry for" required>
              <select
                required
                value={form.enquiry_for}
                onChange={(event) => update("enquiry_for", event.target.value as LeadInput["enquiry_for"])}
                className={controlClass}
              >
                <option value="LEAD">Lead</option>
                <option value="CLIENT">Client</option>
              </select>
            </Field>
            <Field label="Enquiry date" required>
              <input
                type="date"
                required
                value={form.enquiry_date}
                onChange={(event) => update("enquiry_date", event.target.value)}
                className={controlClass}
              />
            </Field>
            <Field label="Source" className="sm:col-span-2">
              <select value={form.source} onChange={(event) => update("source", event.target.value)} className={controlClass}>
                {LEAD_SOURCES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <fieldset className="sm:col-span-2">
              <legend className="mb-1.5 text-sm font-medium text-foreground">Status</legend>
              <div className="flex flex-wrap gap-2">
                {LEAD_STATUSES.map((status) => (
                  <label key={status.value} className="cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value={status.value}
                      checked={form.status === status.value}
                      onChange={() => update("status", status.value)}
                      className="peer sr-only"
                    />
                    <span
                      className={
                        "inline-flex h-9 items-center gap-2 rounded-full border border-input bg-background px-3.5 text-sm transition-colors " +
                        "hover:border-foreground/30 peer-checked:border-brand peer-checked:bg-brand/10 peer-checked:font-medium " +
                        "peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40"
                      }
                    >
                      <span aria-hidden className={`size-2 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </Group>

          <Group title="Follow-up">
            <div className="sm:col-span-2">
              <Field label="Follow-up date" error={followupError}>
                <input
                  type="date"
                  min={form.enquiry_date}
                  value={form.followup_date ?? ""}
                  aria-invalid={Boolean(followupError)}
                  onChange={(event) => update("followup_date", event.target.value || null)}
                  className={`${controlClass} sm:max-w-56`}
                />
              </Field>
              <div className="mt-2 flex flex-wrap gap-2">
                {FOLLOWUP_SHORTCUTS.map(({ label, days }) => {
                  const value = daysFromToday(days);
                  const active = form.followup_date === value;
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => update("followup_date", active ? null : value)}
                      className={
                        "h-7 rounded-full border px-3 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 " +
                        (active
                          ? "border-brand bg-brand/10 font-medium"
                          : "border-input text-muted-foreground hover:border-foreground/30 hover:text-foreground")
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Field label="Remarks" className="sm:col-span-2">
              <textarea
                rows={4}
                value={form.followup_remarks}
                placeholder="What was discussed? What should the next call cover?"
                onChange={(event) => update("followup_remarks", event.target.value)}
                className={`${controlClass} h-auto resize-y py-2 leading-relaxed`}
              />
            </Field>

            <button
              type="button"
              aria-pressed={form.is_opportunity}
              onClick={() => update("is_opportunity", !form.is_opportunity)}
              className={`flex w-full items-start gap-3 rounded-md border p-3.5 text-left transition-colors sm:col-span-2 ${
                form.is_opportunity
                  ? "border-brand bg-brand/10 text-foreground"
                  : "border-line hover:bg-muted/40"
              }`}
            >
              <Target className={`mt-0.5 size-5 shrink-0 ${form.is_opportunity ? "text-brand" : "text-muted-foreground"}`} />
              <span className="grid gap-0.5 text-sm">
                <span className="font-medium">Mark as opportunity</span>
                <span className="text-xs text-muted-foreground">Use this once the enquiry looks like a real deal.</span>
              </span>
            </button>
          </Group>
        </Section>

        <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-between gap-3 border-t border-line bg-background/95 px-1 py-4 backdrop-blur">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {isDirty ? "You have unsaved changes" : ""}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={goBack}>Cancel</Button>
            <Button type="submit" disabled={!canSubmit}>
              <Save /> {saveMutation.isPending ? "Saving…" : leadId ? "Save changes" : "Create lead"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}