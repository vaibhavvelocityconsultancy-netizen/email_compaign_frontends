  import { createFileRoute } from "@tanstack/react-router";
  import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
  import { useMemo, useState } from "react";
  import { z } from "zod";
  import { FileCheck2, Pencil, Plus, Trash2 } from "lucide-react";
  import { toast } from "sonner";

  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { ConfirmDialog } from "@/components/common/ConfirmDialog";
  import { DataTable, type Column } from "@/components/common/DataTable";
  import { EntityForm, fieldPresets, type FormFieldConfig } from "@/components/common/EntityForm";
  import { Modal } from "@/components/common/Modal";
  import { StatusBadge } from "@/components/common/StatusBadge";
  import { QuotationModulesTable, computeTotals } from "@/components/quotations/QuotationModulesTable";
  import {
    QUOTATION_STATUSES,
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
  const GST_SCHEMES = [
    { value: "INTRA_STATE", label: "Gujarat State — CGST 9% + SGST 9%" },
    { value: "INTER_STATE", label: "Inter State — IGST 18%" },
  ];
  const ADDITIONAL_CHARGE_OPTIONS = [
    "Deployment / Setup Charges",
    "Hosting / Server Charges",
    "Domain Charges",
    "Maintenance & Support",
    "AMC Charges",
    "Third-party Integration Charges",
    "Training Charges",
    "Customization Charges",
    "Other Charges",
  ];

  const schema = z.object({
    quotation_number: z.string().trim().min(1, "Quotation number is required"),
    quotation_date: z.string().min(1, "Date is required"),
    delivery_timeline: z.string(),
    status: z.string().min(1),
    tax_type: z.string(),
    tax_percentage: z.coerce.number().min(0),
    discount: z.coerce.number().min(0),
    packing_charges: z.coerce.number().min(0),
    terms_conditions: z.string(),
    modules: z.array(z.object({
      module: z.string().nullable(),
      module_name: z.string().trim().min(1, "Module name is required"),
      description: z.string(),
      requirements: z.string(),
      estimated_cost: z.number().min(0),
      estimated_days: z.number().int().min(0),
      priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
      remarks: z.string(),
      amount: z.number().min(0),
    })),
  });
  type FormValues = z.infer<typeof schema>;

  const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const statusLabel = (s: string) => QUOTATION_STATUSES.find(([v]) => v === s)?.[1] ?? s;
  const toInputDate = (value: string | null) => {
    if (!value) return "";
    const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    return match ? `${match[3]}-${match[1]}-${match[2]}` : value;
  };

  function QuotationsPage() {
    const qc = useQueryClient();
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Quotation | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);
    const [foModalOpen, setFoModalOpen] = useState(false);
    const [foScheme, setFoScheme] = useState("INTRA_STATE");
    const [foCharges, setFoCharges] = useState(
      ADDITIONAL_CHARGE_OPTIONS.map((label) => ({ key: label, label, selected: false, amount: 0 })),
    );
    const quotationsQuery = useQuery({ queryKey: ["quotations"], queryFn: getQuotations });
    const quotations = quotationsQuery.data ?? [];

    const baseQuotationTotal = editing?.totalAmount ?? 0;
    const selectedAdditionalCharges = foCharges.filter((charge) => charge.selected && Number(charge.amount) > 0);
    const additionalChargesTotal = selectedAdditionalCharges.reduce((sum, charge) => sum + Number(charge.amount || 0), 0);
    const taxableWithCharges = baseQuotationTotal + additionalChargesTotal;
    const gstRate = foScheme === "INTRA_STATE" ? 18 : 9;
    const gstAmount = (taxableWithCharges * gstRate) / 100;
    const grandTotalWithCharges = taxableWithCharges + gstAmount;

    const updateFoCharge = (key: string, changes: Partial<{ selected: boolean; amount: number }>) => {
      setFoCharges((current) => current.map((charge) =>
        charge.key === key ? { ...charge, ...changes } : charge,
      ));
    };

    const saveMutation = useMutation({
      mutationFn: (v: FormValues) => {
        const t = computeTotals(v);
        const taxType = v.tax_type as TaxType;
        const payload: QuotationInput = {
          quotation_number: v.quotation_number,
          quotation_date: v.quotation_date,
          opportunity: editing?.opportunity || null,
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
          items: v.modules.map((module) => ({
            ...module,
            module_name: module.module_name,
            estimated_cost: module.estimated_cost || null,
            estimated_days: module.estimated_days || null,
          })),
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
      onSuccess: async () => {
        await qc.invalidateQueries({ queryKey: ["quotations"] });
        toast.success("Final offer created");
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
        fieldPresets.text("quotation_number", "Quotation number", { required: true, placeholder: "QT-2026-001" }),
        fieldPresets.date("quotation_date", "Date", { required: true, defaultToToday: true }),
      ], 2),
      fieldPresets.row([
        fieldPresets.select("delivery_timeline", "Delivery Time", DELIVERY_OPTIONS.map((d) => ({ value: d, label: d })), { placeholder: "Select" }),
        fieldPresets.select("status", "Status", QUOTATION_STATUSES.map(([value, label]) => ({ value, label })), { required: true }),
      ], 3),
    ], []);

    const defaultValues: Partial<FormValues> = editing ? {
      quotation_number: editing.quotationNumber,
      quotation_date: toInputDate(editing.quotationDate),
      delivery_timeline: editing.deliveryTimeline,
      status: editing.status,
      tax_type: editing.taxType,
      tax_percentage: editing.taxPercentage,
      discount: editing.discount,
      packing_charges: editing.packingCharges,
      terms_conditions: editing.termsConditions,
      modules: editing.items.map((i) => ({
        module: i.module,
        module_name: i.moduleName,
        description: i.description,
        requirements: i.requirements,
        estimated_cost: i.estimatedCost ?? 0,
        estimated_days: i.estimatedDays ?? 0,
        priority: i.priority,
        remarks: i.remarks,
        amount: i.amount,
      })),
    } : {
      quotation_number: "",
      quotation_date: "",
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
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5" disabled={foMutation.isPending} onClick={() => setFoModalOpen(true)}>
              <FileCheck2 className="size-4" />
              {foMutation.isPending ? "Creating FO..." : editing.finalOfferGenerated ? "Regenerate FO" : "Create FO"}
            </Button>
          ) : undefined}
          onSubmit={async (v) => { await saveMutation.mutateAsync(v); }}
        >
          <QuotationModulesTable opportunities={[]} disabled={saveMutation.isPending} />
        </EntityForm>

        <Modal open={foModalOpen} onClose={() => setFoModalOpen(false)} title="Generate Final Offer — GST Configuration" wide>
          <div className="space-y-6 p-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Sale Type / GST Scheme *</label>
              <select
                value={foScheme}
                onChange={(event) => setFoScheme(event.target.value)}
                className="h-11 w-full rounded-xl border border-brand bg-transparent px-3 text-base text-foreground outline-none transition focus:border-brand"
              >
                {GST_SCHEMES.map((scheme) => (
                  <option key={scheme.value} value={scheme.value}>{scheme.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold text-foreground">Additional Charges</h4>
                <span className="text-xs text-muted-foreground">Added only when a price is entered</span>
              </div>

              <div className="overflow-hidden rounded-xl border border-line bg-background">
                {foCharges.map((charge) => (
                  <div key={charge.key} className="grid grid-cols-[20px_minmax(0,1fr)_140px] items-center gap-3 border-b border-line px-3 py-3 last:border-b-0">
                    <input
                      type="checkbox"
                      checked={charge.selected}
                      onChange={() => {
                        const nextSelected = !charge.selected;
                        updateFoCharge(charge.key, { selected: nextSelected, amount: nextSelected ? charge.amount : 0 });
                      }}
                      className="h-4 w-4 rounded border-line text-brand"
                    />
                    <label className="text-sm font-medium text-foreground">{charge.label}</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={charge.amount}
                      disabled={!charge.selected}
                      onChange={(event) => {
                        const nextAmount = Number(event.target.value) || 0;
                        updateFoCharge(charge.key, { amount: nextAmount, selected: nextAmount > 0 || charge.selected });
                      }}
                      className="h-9 rounded-md border-line bg-background text-right"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-muted/20 p-4">
              <div className="space-y-2 text-sm text-foreground">
                <div className="flex items-center justify-between">
                  <span>Item Total</span>
                  <span className="font-medium">₹{money(baseQuotationTotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Additional Charges</span>
                  <span className="font-medium">₹{money(additionalChargesTotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Taxable Amount</span>
                  <span className="font-medium">₹{money(taxableWithCharges)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>CGST @ 9%</span>
                  <span className="font-medium">₹{money(gstAmount / 2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>SGST @ 9%</span>
                  <span className="font-medium">₹{money(gstAmount / 2)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-line pt-2 text-base font-semibold">
                  <span>Grand Total</span>
                  <span>₹{money(grandTotalWithCharges)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setFoModalOpen(false)}>Cancel</Button>
              <Button
                type="button"
                className="px-6"
                disabled={!editing || foMutation.isPending}
                onClick={async () => {
                  if (!editing) return;
                  setFoModalOpen(false);
                  await foMutation.mutateAsync(editing);
                }}
              >
                {foMutation.isPending ? "Creating FO..." : "Generate & Download"}
              </Button>
            </div>
          </div>
        </Modal>

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
