import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Download, Plus, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  getLead,
  createLead,
  updateLead,
  getLeadOptions,
  getLeadCategories,
  createLeadCategory,
  type LeadChoiceOption,
  type LeadInput,
} from "@/lib/api";
import { downloadLeadCsvTemplate } from "@/lib/lead-csv-template";
import {
  createCompany,
  createCompanyContact,
  listCities,
  listCompanies,
  listCompanyContacts,
  listCountries,
  listStates,
  updateCompany,
  updateCompanyContact,
  type Company,
} from "@/lib/company-api";

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

const FALLBACK_LEAD_OPTIONS = {
  enquiry_for: [
    { value: "LEAD", label: "Lead" },
    { value: "CLIENT", label: "Client" },
  ],
  source: [
    { value: "WEBSITE", label: "Website" },
    { value: "SOCIAL_MEDIA", label: "Social Media" },
    { value: "GOOGLE", label: "Google Search" },
    { value: "ADVERTISEMENT", label: "Advertisement" },
    { value: "REFERENCE", label: "Reference" },
    { value: "EXISTING_CLIENT", label: "Existing Client" },
    { value: "COLD_CALL", label: "Cold Call" },
    { value: "EMAIL_MARKETING", label: "Email Marketing" },
    { value: "OTHER", label: "Other" },
  ],
  status: [
    { value: "NEW", label: "New", dot: "bg-blue-500" },
    { value: "ACTIVE", label: "Active", dot: "bg-emerald-500" },
    { value: "HOT", label: "Hot", dot: "bg-red-500" },
    { value: "COLD", label: "Cold", dot: "bg-sky-300" },
    { value: "JUNK", label: "Junk", dot: "bg-zinc-400" },
    { value: "OTHER", label: "Other", dot: "bg-zinc-400" },
  ],
} as const;

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
    category: null,
  };
}

const controlClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm transition-colors " +
  "hover:border-foreground/30 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 " +
  "disabled:cursor-not-allowed disabled:opacity-60 " +
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
      <div className="grid gap-8">{children}</div>
    </section>
  );
}

/**
 * A titled block of related fields inside a Section.
 * cols = 2 (default) or 3 columns on desktop; use "full" on a child to span the whole row.
 */
function Group({
  title,
  cols = 2,
  children,
}: {
  title: string;
  cols?: 2 | 3;
  children: ReactNode;
}) {
  return (
    <fieldset
      className={`grid gap-x-5 gap-y-5 ${cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
    >
      <legend className="sr-only">{title}</legend>
      <h3
        aria-hidden
        className={`flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${
          cols === 3 ? "sm:col-span-3" : "sm:col-span-2"
        }`}
      >
        {title}
        <span className="h-px flex-1 bg-line" />
      </h3>
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
  const [companySearch, setCompanySearch] = useState("");
  const [companySuggestionsOpen, setCompanySuggestionsOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [companyCreating, setCompanyCreating] = useState(false);
  const [countryOptions, setCountryOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [stateOptions, setStateOptions] = useState<Array<{ id: number; name: string; country: number }>>([]);
  const [cityOptions, setCityOptions] = useState<Array<{ id: number; name: string; state: number }>>([]);
  const [categoryNameDraft, setCategoryNameDraft] = useState("");
  const [categoryCreatorOpen, setCategoryCreatorOpen] = useState(false);
  // Snapshot of the last loaded values, used to show "Unsaved changes".
  const [baseline, setBaseline] = useState(() => JSON.stringify(emptyLead()));

  const companyQuery = useQuery({
    queryKey: ["companies"],
    queryFn: listCompanies,
  });

  const leadOptionsQuery = useQuery({
    queryKey: ["lead-options"],
    queryFn: getLeadOptions,
  });
  const categoriesQuery = useQuery({
    queryKey: ["lead-categories"],
    queryFn: getLeadCategories,
  });

  const leadOptions = leadOptionsQuery.data ?? FALLBACK_LEAD_OPTIONS;
  const sourceOptions = leadOptions.source as LeadChoiceOption[];
  const statusOptions = leadOptions.status as Array<LeadChoiceOption & { dot?: string }>;

  useEffect(() => {
    let mounted = true;
    async function loadMasterOptions() {
      try {
        const [countries, states, cities] = await Promise.all([
          listCountries(),
          listStates(),
          listCities(),
        ]);
        if (!mounted) return;
        setCountryOptions(countries);
        setStateOptions(states);
        setCityOptions(cities);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load master data");
      }
    }
    void loadMasterOptions();
    return () => {
      mounted = false;
    };
  }, []);

  const leadQuery = useQuery({
    queryKey: ["lead", leadId],
    queryFn: () => getLead(leadId!),
    enabled: Boolean(leadId),
  });

  const companySuggestions = useMemo(() => {
    const query = companySearch.trim().toLowerCase();
    const items = companyQuery.data ?? [];
    if (!query) return items.slice(0, 8);
    return items.filter((company) => company.name.toLowerCase().includes(query)).slice(0, 8);
  }, [companyQuery.data, companySearch]);

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
        category: lead.categoryId,
      };
      setForm(loaded);
      setCompanySearch(lead.companyName ?? "");
      setSelectedCompanyId(null);
      setBaseline(JSON.stringify(loaded));
    }
  }, [leadQuery.data]);

  useEffect(() => {
    if (!companyQuery.data) return;
    if (!form.company_name.trim()) {
      setCompanySearch("");
      return;
    }
    setCompanySearch(form.company_name);
  }, [companyQuery.data, form.company_name]);

  const fillCompanyFields = async (company: Company) => {
    const nextCompanyName = company.name ?? "";
    const nextCompanyAddress = company.address ?? "";
    const nextCompanyCity = company.city_name ?? "";
    const nextCompanyState = company.state_name ?? "";
    const nextCompanyPincode = company.pincode ?? "";
    const nextCompanyCountry = company.country_name || "India";
    const nextCompanyGst = company.gst_number ?? "";

    setSelectedCompanyId(company.id);
    setForm((current) => ({
      ...current,
      company_name: nextCompanyName,
      company_address: nextCompanyAddress,
      company_city: nextCompanyCity,
      company_state: nextCompanyState,
      company_pincode: nextCompanyPincode,
      company_country: nextCompanyCountry,
      company_gst_number: nextCompanyGst,
    }));
    setCompanySearch(nextCompanyName);
    setCompanySuggestionsOpen(false);

    try {
      const contacts = await listCompanyContacts(company.id);
      const preferred = contacts.find((contact) => contact.is_primary) ?? contacts[0];
      if (!preferred) return;
      setForm((current) => ({
        ...current,
        contact_name: preferred.name ?? current.contact_name,
        contact_designation: preferred.designation ?? "",
        contact_mobile: preferred.phone ?? current.contact_mobile,
        contact_email: preferred.email ?? current.contact_email,
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load company contacts");
    }
  };

  const persistCompanyAndContact = async () => {
    const trimmedCompanyName = form.company_name.trim();
    const trimmedContactName = form.contact_name.trim();
    if (!trimmedCompanyName) {
      return null;
    }

    const matchedCompany =
      companyQuery.data?.find(
        (company) => company.name.trim().toLowerCase() === trimmedCompanyName.toLowerCase(),
      ) ?? null;

    const selectedCountryId = countryOptions.find(
      (country) => country.name.trim().toLowerCase() === form.company_country.trim().toLowerCase(),
    )?.id ?? null;

    const selectedStateId = stateOptions.find(
      (state) =>
        state.name.trim().toLowerCase() === form.company_state.trim().toLowerCase() &&
        (selectedCountryId === null || state.country === selectedCountryId),
    )?.id ?? null;

    const selectedCityId = cityOptions.find(
      (city) =>
        city.name.trim().toLowerCase() === form.company_city.trim().toLowerCase() &&
        (selectedStateId === null || city.state === selectedStateId),
    )?.id ?? null;

    const companyPayload = {
      name: trimmedCompanyName,
      address: form.company_address,
      city: selectedCityId,
      state: selectedStateId,
      country: selectedCountryId,
      pincode: form.company_pincode,
      gst_number: form.company_gst_number,
    };

    const companyToSaveId = selectedCompanyId ?? matchedCompany?.id ?? null;
    const savedCompany = companyToSaveId
      ? await updateCompany(companyToSaveId, companyPayload)
      : await createCompany(companyPayload);

    setSelectedCompanyId(savedCompany.id);
    setCompanySearch(savedCompany.name);
    setCompanySuggestionsOpen(false);
    await companyQuery.refetch();

    if (trimmedContactName) {
      const contacts = await listCompanyContacts(savedCompany.id);
      const preferredContact =
        contacts.find((contact) => contact.name.trim().toLowerCase() === trimmedContactName.toLowerCase()) ??
        contacts.find((contact) => contact.is_primary) ??
        contacts[0];

      const contactPayload = {
        name: trimmedContactName,
        designation: form.contact_designation,
        phone: form.contact_mobile,
        email: form.contact_email,
        is_primary: true,
      };

      if (preferredContact) {
        await updateCompanyContact(savedCompany.id, preferredContact.id, contactPayload);
      } else {
        await createCompanyContact(savedCompany.id, contactPayload);
      }
    }

    setForm((current) => ({
      ...current,
      company_name: savedCompany.name,
      company_address: savedCompany.address ?? current.company_address,
      company_city: current.company_city || form.company_city,
      company_state: current.company_state || form.company_state,
      company_pincode: savedCompany.pincode ?? current.company_pincode,
      company_country: current.company_country || form.company_country || "India",
      company_gst_number: savedCompany.gst_number ?? current.company_gst_number,
    }));

    return savedCompany;
  };

  const saveCompanyToMaster = async () => {
    const name = form.company_name.trim();
    if (!name) {
      toast.error("Enter a company name before saving it.");
      return;
    }

    setCompanyCreating(true);
    try {
      const savedCompany = await persistCompanyAndContact();
      if (savedCompany) {
        toast.success(selectedCompanyId ? `Company "${savedCompany.name}" updated.` : `Company "${savedCompany.name}" added.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save company");
    } finally {
      setCompanyCreating(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (values: LeadFormValues) => {
      await persistCompanyAndContact();
      return leadId ? updateLead(leadId, values) : createLead(values);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
      if (leadId) await queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      toast.success(leadId ? "Lead updated" : "Lead created");
      await navigate({ to: "/marketing/leads" });
    },
    onError: (error: Error) => toast.error(error.message || "Unable to save lead"),
  });

  const createCategoryMutation = useMutation({
    mutationFn: () => createLeadCategory(categoryNameDraft.trim()),
    onSuccess: async (category) => {
      await queryClient.invalidateQueries({ queryKey: ["lead-categories"] });
      setForm((current) => ({ ...current, category: category.id }));
      setCategoryNameDraft("");
      setCategoryCreatorOpen(false);
      toast.success(`Category "${category.name}" is ready.`);
    },
    onError: (error: Error) => toast.error(error.message || "Could not create category"),
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

  const selectedCountry = countryOptions.find((country) => country.name === form.company_country);
  const selectedState = stateOptions.find((state) => state.name === form.company_state);
  const filteredStates = stateOptions.filter((state) => !selectedCountry || state.country === selectedCountry.id);
  const filteredCities = cityOptions.filter((city) => !selectedState || city.state === selectedState.id);

  return (
    <div className="mx-auto max-w-4xl space-y-8 rounded-lg bg-white p-11 shadow-md">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" onClick={goBack} className="-ml-3 mb-3 text-muted-foreground">
            <ArrowLeft /> Leads
          </Button>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {leadId ? `Edit enquiry${leadQuery.data?.srNo ? ` #${leadQuery.data.srNo}` : ""}` : "New enquiry"}
          </h1>
        </div>
        <Button
          type="button"
          variant="outline"
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
        >
          <Download /> Download template
        </Button>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) saveMutation.mutate(form);
        }}
      >
        {/* ============ 1. CONTACT DETAILS ============ */}
        <Section
          id="contact-details-heading"
          title="Contact details"
          description="The company first, then the person we'll be speaking to."
        >
          {/* Company: name + GST */}
          <Group title="Company">
            <Field label="Company name" required>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoComplete="organization"
                  value={form.company_name}
                  onFocus={() => setCompanySuggestionsOpen(true)}
                  onBlur={() => setTimeout(() => setCompanySuggestionsOpen(false), 150)}
                  onChange={(event) => {
                    update("company_name", event.target.value);
                    setCompanySearch(event.target.value);
                    setCompanySuggestionsOpen(true);
                    setSelectedCompanyId(null);
                  }}
                  className={controlClass}
                />
                {companySuggestionsOpen && companySuggestions.length > 0 && (
                  <div className="absolute z-20 mt-1.5 w-full rounded-lg border border-line bg-popover p-1 shadow-lg">
                    {companySuggestions.map((company) => (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => void fillCompanyFields(company)}
                        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                      >
                        <span className="font-medium">{company.name}</span>
                        <span className="text-xs text-muted-foreground">{company.city_name || company.state_name || "Company"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Field>

            <Field label="GST number">
              <input
                type="text"
                value={form.company_gst_number}
                onChange={(event) => update("company_gst_number", event.target.value)}
                className={controlClass}
              />
            </Field>

            <div className="flex justify-end sm:col-span-2">
              <button
                type="button"
                onClick={() => void saveCompanyToMaster()}
                className="inline-flex items-center rounded-md border border-brand/50 bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand transition-colors hover:bg-brand/15 disabled:opacity-60"
                disabled={companyCreating || !form.company_name.trim()}
              >
                {companyCreating ? "Saving…" : selectedCompanyId ? "Update company" : "Add company"}
              </button>
            </div>
          </Group>

          {/* Address: street, then country → state → city → pincode */}
          <Group title="Address">
            <Field label="Address" className="sm:col-span-2">
              <textarea
                rows={3}
                autoComplete="street-address"
                value={form.company_address}
                onChange={(event) => update("company_address", event.target.value)}
                className={`${controlClass} h-auto py-2`}
              />
            </Field>
            <Field label="Country">
              <select
                value={form.company_country || ""}
                onChange={(event) => {
                  update("company_country", event.target.value);
                  update("company_state", "");
                  update("company_city", "");
                }}
                className={controlClass}
              >
                <option value="">Select country</option>
                {countryOptions.map((country) => (
                  <option key={country.id} value={country.name}>{country.name}</option>
                ))}
              </select>
            </Field>
            <Field label="State">
              <select
                value={form.company_state || ""}
                onChange={(event) => {
                  update("company_state", event.target.value);
                  update("company_city", "");
                }}
                className={controlClass}
                disabled={!selectedCountry}
              >
                <option value="">Select state</option>
                {filteredStates.map((state) => (
                  <option key={state.id} value={state.name}>{state.name}</option>
                ))}
              </select>
            </Field>
            <Field label="City">
              <select
                value={form.company_city || ""}
                onChange={(event) => update("company_city", event.target.value)}
                className={controlClass}
                disabled={!selectedState}
              >
                <option value="">Select city</option>
                {filteredCities.map((city) => (
                  <option key={city.id} value={city.name}>{city.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Pincode">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                value={form.company_pincode}
                onChange={(event) => update("company_pincode", event.target.value)}
                className={controlClass}
              />
            </Field>
          </Group>

          {/* Contact person */}
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
            <Field label="Email" required>
              <input
                type="email"
                required
                autoComplete="email"
                value={form.contact_email}
                onChange={(event) => update("contact_email", event.target.value)}
                className={controlClass}
              />
            </Field>
          </Group>
        </Section>

        {/* ============ 2. ENQUIRY ============ */}
        <Section
          id="enquiry-heading"
          title="Enquiry"
          description="What came in, where from, and when to follow up."
        >
          {/* Enquiry details */}
          <Group title="Enquiry details" cols={3}>
            <Field label="Enquiry date" required>
              <input
                type="date"
                required
                value={form.enquiry_date}
                onChange={(event) => update("enquiry_date", event.target.value)}
                className={controlClass}
              />
            </Field>
            <Field label="Source">
              <select value={form.source} onChange={(event) => update("source", event.target.value)} className={controlClass}>
                {sourceOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(event) => update("status", event.target.value)}
                className={controlClass}
              >
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Category">
              <div className="flex gap-2">
                <select
                  value={form.category ?? ""}
                  onChange={(event) => update("category", event.target.value ? Number(event.target.value) : null)}
                  className={controlClass}
                >
                  <option value="">No category</option>
                  {(categoriesQuery.data ?? []).map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                <Button type="button" variant="outline" size="icon" aria-label="Add category" onClick={() => setCategoryCreatorOpen((open) => !open)}>
                  <Plus className="size-4" />
                </Button>
              </div>
              {categoryCreatorOpen && (
                <div className="mt-2 flex gap-2">
                  <input
                    value={categoryNameDraft}
                    onChange={(event) => setCategoryNameDraft(event.target.value)}
                    placeholder="e.g. Doctor"
                    className={controlClass}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={createCategoryMutation.isPending || !categoryNameDraft.trim()}
                    onClick={() => createCategoryMutation.mutate()}
                  >
                    {createCategoryMutation.isPending ? "Adding…" : "Add"}
                  </Button>
                </div>
              )}
            </Field>
          </Group>

          {/* Follow-up: date + shortcuts, then remarks */}
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
          </Group>
        </Section>

        <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-between gap-3 border-t border-line bg-background/95 px-1 py-4 backdrop-blur">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {isDirty ? "You have unsaved changes" : ""}
          </p>
          <div className="flex w-full justify-end gap-2 sm:w-auto">
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
