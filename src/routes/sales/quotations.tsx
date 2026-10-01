import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { FileCheck2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EntityForm, fieldPresets, type FormFieldConfig } from "@/components/common/EntityForm";
import { StatusBadge } from "@/components/common/StatusBadge";
import { QuotationModulesTable, computeTotals } from "@/components/quotations/QuotationModulesTable";
import { getOpportunities } from "@/lib/api";
import {
  QUOTATION_STATUSES,
  TAX_TYPES,
  createQuotation,
  deleteQuotation,
  generateFinalOffer,
  getQuotations,
  updateQuotation,
  type Quotation,
  type QuotationInput,
  type QuotationStatus,
  type TaxType,
} from "@/lib/quotation-api";

export const Route = createFileRoute("/sales/quotations")({
  head: () => ({
    meta: [
      { title: "Quotations — Vantage CRM" },
      { name: "description", content: "Create and manage quotations for sales opportunities." },
      { property: "og:title", content: "Quotations — Vantage CRM" },
      { property: "og:description", content: "Create and manage quotations for sales opportunities." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuotationsPage,
});

const DELIVERY_OPTIONS = ["1 week", "2 weeks", "3 weeks", "4 weeks", "6 weeks", "8 weeks", "12 weeks"];

const schema = z.object({
  quotation_number: z.string().trim().min(1, "Quotation number is required"),
  quotation_date: z.string().min(1, "Date is required"),
  opportunity: z.string().min(1, "Opportunity is required"),
  delivery_timeline: z.string(),
  status: z.string().min(1),
  tax_type: z.string(),
  tax_percentage: z.coerce.number().min(0),
  discount: z.coerce.number().min(0),
  packing_charges: z.coerce.number().min(0),
  terms_conditions: z.string(),
  modules: z.array(z.object({
    module: z.string().min(1, "Select a module"),
    description: z.string(),
    amount: z.number().min(0),
  })),
});
type FormValues = z.infer<typeof schema>;

const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const statusLabel = (s: string) => QUOTATION_STATUSES.find(([v]) => v === s)?.[1] ?? s;

function QuotationsPage() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Quotation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);
  const quotationsQuery = useQuery({ queryKey: ["quotations"], queryFn: getQuotations });
  const opportunitiesQuery = useQuery({ queryKey: ["opportunities"], queryFn: getOpportunities });
  const quotations = quotationsQuery.data ?? [];
  const opportunities = opportunitiesQuery.data ?? [];

  const saveMutation = useMutation({
    mutationFn: (v: FormValues) => {
      const t = computeTotals(v);
      const taxType = v.tax_type as TaxType;
      const payload: QuotationInput = {
        quotation_number: v.quotation_number,
        quotation_date: v.quotation_date,
        opportunity: v.opportunity,
        status: v.status as QuotationStatus,
        subtotal: t.subtotal,
        discount: v.discount,
        taxable_amount: t.taxable,
        tax_type: taxType,
        tax_percentage: v.tax_percentage,
        tax_amount: t.tax,
        cgst_amount: taxType === "INTRA_STATE" ? t.tax / 2 : 0,
        sgst_amount: taxType === "INTRA_STATE" ? t.tax / 2 : 0,
        igst_amount: taxType && taxType !== "INTRA_STATE" ? t.tax : 0,
        packing_charges: v.packing_charges,
        total_amount: t.total,
        terms_conditions: v.terms_conditions,
        delivery_timeline: v.delivery_timeline,
        items: v.modules,
      };
      return editing ? updateQuotation(editing.id, payload) : createQuotation(payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["quotations"] });
      setFormOpen(false);
      toast.success(editing ? "Quotation updated" : "Quotation created");
    },
    onError: (e: Error) => toast.error(e.message || "Could not save quotation"),
  });

  const deleteMutation = useMutation({
    mutationFn: (q: Quotation) => deleteQuotation(q.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["quotations"] });
      setDeleteTarget(null);
      toast.success("Quotation deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Could not delete quotation"),
  });

  const foMutation = useMutation({
    mutationFn: (q: Quotation) => generateFinalOffer(q.id),
    onSuccess: async (q) => {
      await qc.invalidateQueries({ queryKey: ["quotations"] });
      setEditing(q);
      toast.success("Final offer created");
      if (q.finalOfferPdf) window.open(q.finalOfferPdf, "_blank");
    },
    onError: (e: Error) => toast.error(e.message || "Could not create final offer"),
  });

  const columns = useMemo<Column<Quotation>[]>(() => [
    { key: "quotationNumber", header: "Quotation No", cell: (q) => <span className="font-mono text-xs font-medium">{q.quotationNumber}</span> },
    { key: "companyName", header: "Company", cell: (q) => <span className="font-medium">{q.companyName || "—"}</span> },
    { key: "quotationDate", header: "Date", filterType: "date", filterValue: (q) => q.quotationDate, cell: (q) => <span className="font-mono text-xs text-muted-foreground">{q.quotationDate ?? "—"}</span> },
    { key: "totalAmount", header: "Total", className: "text-right", headerClassName: "text-right", cell: (q) => <span className="font-mono">{money(q.totalAmount)}</span> },
    { key: "status", header: "Status", filterValue: (q) => q.status, cell: (q) => <StatusBadge status={statusLabel(q.status)} /> },
    {
      key: "actions", header: "Actions", sortable: false, filterable: false, className: "text-right", headerClassName: "text-right",
      cell: (q) => (
        <div className="flex justify-end gap-1">
          <button type="button" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground" aria-label={`Edit ${q.quotationNumber}`} onClick={() => { setEditing(q); setFormOpen(true); }}><Pencil className="size-4" /></button>
          <button type="button" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Delete ${q.quotationNumber}`} onClick={() => setDeleteTarget(q)}><Trash2 className="size-4" /></button>
        </div>
      ),
    },
  ], []);

  const fields = useMemo<FormFieldConfig[]>(() => [
    fieldPresets.row([
      fieldPresets.text("quotation_number", "Quotation No", { required: true, placeholder: "QT-2026-001" }),
      fieldPresets.date("quotation_date", "Date", { required: true, defaultToToday: true }),
      fieldPresets.searchableSelect(
        "opportunity",
        "Opportunity",
        opportunities.map((o) => ({ value: o.id, label: `${o.companyName}${o.enquiryDate ? ` — ${o.enquiryDate}` : ""}` })),
        { required: true, placeholder: opportunitiesQuery.isLoading ? "Loading..." : "Search opportunity..." },
      ),
    ], 3),
    fieldPresets.row([
      fieldPresets.select("delivery_timeline", "Delivery Time", DELIVERY_OPTIONS.map((d) => ({ value: d, label: d })), { placeholder: "Select" }),
      fieldPresets.select("status", "Status", QUOTATION_STATUSES.map(([value, label]) => ({ value, label })), { required: true }),
      fieldPresets.select("tax_type", "Tax Type", TAX_TYPES.map(([value, label]) => ({ value, label })), { placeholder: "Select" }),
    ], 3),
    fieldPresets.row([
      fieldPresets.number("tax_percentage", "Tax %", { min: 0, step: 0.01 }),
      fieldPresets.currency("discount", "Discount"),
      fieldPresets.currency("packing_charges", "Packing Charges"),
    ], 3),
  ], [opportunities, opportunitiesQuery.isLoading]);

  const defaultValues: Partial<FormValues> = editing ? {
    quotation_number: editing.quotationNumber,
    quotation_date: editing.quotationDate ?? "",
    opportunity: editing.opportunity,
    delivery_timeline: editing.deliveryTimeline,
    status: editing.status,
    tax_type: editing.taxType,
    tax_percentage: editing.taxPercentage,
    discount: editing.discount,
    packing_charges: editing.packingCharges,
    terms_conditions: editing.termsConditions,
    modules: editing.items.map((i) => ({ module: i.module, description: i.description, amount: i.amount })),
  } : {
    quotation_number: "",
    quotation_date: "",
    opportunity: "",
    delivery_timeline: "",
    status: "DRAFT",
    tax_type: "",
    tax_percentage: 0,
    discount: 0,
    packing_charges: 0,
    terms_conditions: "",
    modules: [],
  };

  return (
    <div className="space-y-6">
      <div className="rise">
        <div className="font-mono text-[11px] tracking-wide text-muted-foreground">SALES</div>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Quotations</h1>
      </div>
      <div className="rise" style={{ animationDelay: "80ms" }}>
        <DataTable<Quotation>
          data={quotations}
          columns={columns}
          searchKeys={["quotationNumber", "companyName", "status"]}
          searchPlaceholder="Search quotations..."
          storageKey="quotations"
          emptyMessage={quotationsQuery.isLoading ? "Loading quotations…" : "No quotations yet."}
          toolbarActions={<Button className="gap-1.5" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="size-4" /> New quotation</Button>}
        />
        {quotationsQuery.isError && <p className="mt-2 text-sm text-destructive">{quotationsQuery.error.message}</p>}
      </div>

      <EntityForm<FormValues>
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit Quotation" : "New Quotation"}
        fields={fields}
        schema={schema as unknown as z.ZodType<FormValues>}
        defaultValues={defaultValues}
        isEdit={Boolean(editing)}
        isLoading={saveMutation.isPending}
        submitLabel={editing ? "Update Quotation" : "Create Quotation"}
        size="full"
        footerActions={editing ? (
          <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5" disabled={foMutation.isPending} onClick={() => foMutation.mutate(editing)}>
            <FileCheck2 className="size-4" />
            {foMutation.isPending ? "Creating FO…" : editing.finalOfferGenerated ? "Regenerate FO" : "Create FO"}
          </Button>
        ) : undefined}
        onSubmit={async (v) => { await saveMutation.mutateAsync(v); }}
      >
        <QuotationModulesTable opportunities={opportunities} disabled={saveMutation.isPending} />
      </EntityForm>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        title="Delete quotation"
        message={`Delete “${deleteTarget?.quotationNumber ?? "this quotation"}”?`}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
