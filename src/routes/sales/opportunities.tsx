import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowDown, ArrowUp, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { EntityForm, fieldPresets, type FormFieldConfig } from "@/components/common/EntityForm";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  createOpportunity,
  deleteOpportunity,
  getOpportunities,
  updateOpportunity,
  type Opportunity,
  type OpportunityInput,
  type OpportunityModulePriority,
  type OpportunityStatus,
} from "@/lib/api";
import { listCompanies, type Company } from "@/lib/company-api";

export const Route = createFileRoute("/sales/opportunities")({
  head: () => ({
    meta: [
      { title: "Opportunities — Vantage CRM" },
      { name: "description", content: "Track and manage sales opportunities." },
      { property: "og:title", content: "Opportunities — Vantage CRM" },
      { property: "og:description", content: "Track and manage sales opportunities." },
    ],
  }),
  component: OpportunitiesPage,
});

const OPPORTUNITY_STATUSES: Array<[OpportunityStatus, string]> = [
  ["PROSPECTING", "Prospecting"],
  ["QUALIFICATION", "Qualification"],
  ["NEEDS_ANALYSIS", "Needs analysis"],
  ["VALUE_PROPOSITION", "Value proposition"],
  ["IDENTIFY_DECISION_MAKERS", "Identify decision makers"],
  ["PERCEPTION_ANALYSIS", "Perception analysis"],
  ["PROPOSAL_PRICE_QUOTE", "Proposal / price quote"],
  ["NEGOTIATION_REVIEW", "Negotiation / review"],
  ["CLOSED_WON", "Closed won"],
  ["CLOSED_LOST", "Closed lost"],
];

const opportunitySchema = z.object({
  company_name: z.string().trim().min(1, "Company name is required"),
  enquiry_for: z.string().min(1, "Enquiry type is required"),
  status: z.string().min(1),
  enquiry_date: z.string().regex(/^\d{2}-\d{2}-\d{4}$/, "Use MM-DD-YYYY"),
  modules: z.array(z.object({
    module_number: z.number().int().positive(),
    module_name: z.string().trim().min(1, "Module name is required"),
    description: z.string(),
    requirements: z.string(),
    estimated_cost: z.number().min(0),
    estimated_days: z.number().int().min(0),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
    remarks: z.string(),
  })),
});

type OpportunityFormValues = z.infer<typeof opportunitySchema>;

function toDisplayDate(value: string | null): string {
  if (!value) return "";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[2]}-${match[3]}-${match[1]}` : value;
}

function toApiDate(value: string): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return match ? `${match[3]}-${match[1]}-${match[2]}` : value;
}

function OpportunityModulesEditor({ disabled }: { disabled: boolean }) {
  const { control, register, watch, formState: { errors } } = useFormContext<OpportunityFormValues>();
  const { fields, append, remove, move } = useFieldArray({ control, name: "modules", keyName: "fieldKey" });
  const [moduleDialogIndex, setModuleDialogIndex] = useState<number | null>(null);
  const modules = watch("modules");

  const addModule = () => append({
    module_number: fields.length + 1,
    module_name: "",
    description: "",
    requirements: "",
    estimated_cost: 0,
    estimated_days: 0,
    priority: "MEDIUM",
    remarks: "",
  });

  const addAndEditModule = () => {
    const nextIndex = fields.length;
    addModule();
    setModuleDialogIndex(nextIndex);
  };

  return (
    <section className="col-span-full space-y-3 rounded-lg border border-line bg-background/60 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Opportunity modules</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Customize the scope for this client requirement.</p>
        </div>
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5" disabled={disabled} onClick={addAndEditModule}>
          <Plus className="size-4" /> Add module
        </Button>
      </div>

      {fields.length === 0 && <p className="rounded-md border border-dashed border-line p-3 text-xs text-muted-foreground">No modules added yet.</p>}

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.fieldKey} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface p-3">
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setModuleDialogIndex(index)}>
              <span className="block truncate text-sm font-medium">{modules[index]?.module_name || `Module ${index + 1}`}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{modules[index]?.priority ?? "MEDIUM"} priority</span>
            </button>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" disabled={disabled || index === 0} onClick={() => move(index, index - 1)} aria-label="Move module up" title="Move module up"><ArrowUp className="size-4" /></Button>
              <Button type="button" variant="ghost" size="icon" disabled={disabled || index === fields.length - 1} onClick={() => move(index, index + 1)} aria-label="Move module down" title="Move module down"><ArrowDown className="size-4" /></Button>
              <Button type="button" variant="ghost" size="icon" disabled={disabled} onClick={() => setModuleDialogIndex(index)} aria-label={`Edit module ${index + 1}`} title="Edit module"><Pencil className="size-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className="text-destructive" disabled={disabled} onClick={() => { remove(index); setModuleDialogIndex(null); }} aria-label={`Remove module ${index + 1}`} title="Remove module"><Trash2 className="size-4" /></Button>
            </div>
          </div>
        ))}
      </div>

      {moduleDialogIndex !== null && modules[moduleDialogIndex] && (
        <Drawer open onOpenChange={(open) => !open && setModuleDialogIndex(null)} direction="right">
          <DrawerContent className="inset-y-0 right-0 bottom-auto left-auto mt-0 h-full w-full max-w-xl rounded-none border-l">
            <DrawerHeader className="border-b border-line text-left">
              <DrawerTitle>{modules[moduleDialogIndex].module_name || "New module"}</DrawerTitle>
              <DrawerDescription>Configure this module for the opportunity.</DrawerDescription>
            </DrawerHeader>
            <div className="grid flex-1 gap-3 overflow-y-auto p-5 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm sm:col-span-2">
              <span className="font-medium">Module name</span>
              <Input disabled={disabled} placeholder="Inventory Management" {...register(`modules.${moduleDialogIndex}.module_name`)} />
              {errors.modules?.[moduleDialogIndex]?.module_name && <span className="text-xs text-destructive">{errors.modules[moduleDialogIndex]?.module_name?.message}</span>}
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Description</span>
              <textarea className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={disabled} {...register(`modules.${moduleDialogIndex}.description`)} />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Requirements</span>
              <textarea className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={disabled} {...register(`modules.${moduleDialogIndex}.requirements`)} />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Estimated cost</span>
              <Input type="number" min={0} step="0.01" disabled={disabled} {...register(`modules.${moduleDialogIndex}.estimated_cost`, { valueAsNumber: true })} />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Estimated days</span>
              <Input type="number" min={0} step={1} disabled={disabled} {...register(`modules.${moduleDialogIndex}.estimated_days`, { valueAsNumber: true })} />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Priority</span>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" disabled={disabled} {...register(`modules.${moduleDialogIndex}.priority`)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Remarks</span>
              <Input disabled={disabled} {...register(`modules.${moduleDialogIndex}.remarks`)} />
            </label>
            <div className="flex justify-end sm:col-span-2">
              <Button type="button" onClick={() => setModuleDialogIndex(null)}>Done</Button>
            </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </section>
  );
}

function displayStatus(status: string): string {
  return OPPORTUNITY_STATUSES.find(([value]) => value === status)?.[1] ?? status;
}

function OpportunitiesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Opportunity | null>(null);
  const opportunitiesQuery = useQuery({ queryKey: ["opportunities"], queryFn: getOpportunities });
  const companiesQuery = useQuery({ queryKey: ["companies"], queryFn: listCompanies });
  const opportunities = opportunitiesQuery.data ?? [];
  const companies = companiesQuery.data ?? [];

  const saveMutation = useMutation({
    mutationFn: (values: OpportunityFormValues) => {
      const payload: OpportunityInput = {
        ...values,
        status: values.status as OpportunityStatus,
        enquiry_date: toApiDate(values.enquiry_date),
        source: "",
        expected_close_date: null,
        estimated_value: null,
        probability: null,
        modules: values.modules.map((module, index) => ({
          ...module,
          module_number: index + 1,
          priority: module.priority as OpportunityModulePriority,
          estimated_cost: module.estimated_cost || null,
          estimated_days: module.estimated_days || null,
        })),
      };
      return editing ? updateOpportunity(editing.id, payload) : createOpportunity(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      setFormOpen(false);
      toast.success(editing ? "Opportunity updated" : "Opportunity created");
    },
    onError: (error: Error) => toast.error(error.message || "Could not save opportunity"),
  });

  const deleteMutation = useMutation({
    mutationFn: (opportunity: Opportunity) => deleteOpportunity(opportunity.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      setDeleteTarget(null);
      toast.success("Opportunity deleted");
    },
    onError: (error: Error) => toast.error(error.message || "Could not delete opportunity"),
  });

  const columns = useMemo<Column<Opportunity>[]>(() => [
    {
      key: "companyName",
      header: "Company",
      cell: (opportunity) => <span className="font-medium">{opportunity.companyName}</span>,
    },
    {
      key: "enquiryFor",
      header: "Enquiry for",
      filterValue: (opportunity) => opportunity.enquiryFor,
      cell: (opportunity) => opportunity.enquiryFor || <span className="text-muted-foreground">—</span>,
    },
    {
      key: "enquiryDate",
      header: "Enquiry date",
      filterType: "date",
      filterValue: (opportunity) => opportunity.enquiryDate,
      cell: (opportunity) => opportunity.enquiryDate
        ? <span className="font-mono text-xs text-muted-foreground">{toDisplayDate(opportunity.enquiryDate)}</span>
        : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "status",
      header: "Stage",
      filterValue: (opportunity) => opportunity.status,
      cell: (opportunity) => <StatusBadge status={displayStatus(opportunity.status)} />,
    },
    {
      key: "actions",
      header: "Actions",
      sortable: false,
      filterable: false,
      className: "text-right",
      headerClassName: "text-right",
      cell: (opportunity) => (
        <div className="flex justify-end gap-1">
          <button type="button" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground" aria-label={`Edit ${opportunity.companyName}`} title="Edit opportunity" onClick={() => { setEditing(opportunity); setFormOpen(true); }}>
            <Pencil className="size-4" />
          </button>
          <button type="button" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Delete ${opportunity.companyName}`} title="Delete opportunity" onClick={() => setDeleteTarget(opportunity)}>
            <Trash2 className="size-4" />
          </button>
        </div>
      ),
    },
  ], []);

  const fields = useMemo<FormFieldConfig[]>(() => [
    fieldPresets.searchableSelect(
      "company_name",
      "Company name",
      companies.map((company: Company) => ({ value: company.name, label: company.name })),
      { required: true, colSpan: 2, placeholder: companiesQuery.isLoading ? "Loading companies..." : "Select company" },
    ),
    fieldPresets.select("enquiry_for", "Enquiry for", [
      { value: "LEAD", label: "Lead" },
      { value: "CLIENT", label: "Client" },
    ], { required: true }),
    fieldPresets.select("status", "Stage", OPPORTUNITY_STATUSES.map(([value, label]) => ({ value, label })), { required: true }),
    fieldPresets.text("enquiry_date", "Enquiry date", { required: true, placeholder: "MM-DD-YYYY" }),
  ], [companies, companiesQuery.isLoading]);

  const defaultValues: Partial<OpportunityFormValues> = editing ? {
    company_name: editing.companyName,
    enquiry_for: editing.enquiryFor || "LEAD",
    status: editing.status,
    enquiry_date: toDisplayDate(editing.enquiryDate),
    modules: editing.modules.map((module) => ({
      module_number: module.moduleNumber,
      module_name: module.moduleName,
      description: module.description,
      requirements: module.requirements,
      estimated_cost: module.estimatedCost ?? 0,
      estimated_days: module.estimatedDays ?? 0,
      priority: module.priority,
      remarks: module.remarks,
    })),
  } : {
    company_name: "",
    enquiry_for: "LEAD",
    status: "PROSPECTING",
    enquiry_date: "",
    modules: [],
  };

  return (
    <div className="space-y-6">
      <div className="rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] tracking-wide text-muted-foreground">SALES PIPELINE</div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Opportunities</h1>
        </div>
      </div>
      <div className="rise" style={{ animationDelay: "80ms" }}>
        <DataTable<Opportunity>
          data={opportunities}
          columns={columns}
          searchKeys={["companyName", "enquiryFor", "status"]}
          searchPlaceholder="Search opportunities..."
          storageKey="opportunities"
          emptyMessage={opportunitiesQuery.isLoading ? "Loading opportunities…" : "No opportunities yet."}
          toolbarActions={<button type="button" className="flex h-9 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand/90" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="size-4" /> New opportunity</button>}
        />
        {opportunitiesQuery.isError && <p className="mt-2 text-sm text-destructive">{opportunitiesQuery.error.message}</p>}
      </div>
      <EntityForm<OpportunityFormValues>
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit opportunity" : "Create opportunity"}
        fields={fields}
        schema={opportunitySchema}
        defaultValues={defaultValues}
        isEdit={Boolean(editing)}
        isLoading={saveMutation.isPending}
        submitLabel="Save opportunity"
        size="lg"
        footerActions={editing ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            onClick={() => navigate({ to: "/sales/quotations" })}
          >
            <FileText className="size-4" />
            Convert to quotation
          </Button>
        ) : undefined}
        onSubmit={async (values) => { await saveMutation.mutateAsync(values); }}
      >
        <OpportunityModulesEditor disabled={saveMutation.isPending} />
      </EntityForm>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        title="Delete opportunity"
        message={`Delete “${deleteTarget?.companyName ?? "this opportunity"}”?`}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
