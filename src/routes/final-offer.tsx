import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Download, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/common/Modal";
import { DataTable, type Column } from "@/components/common/DataTable";
import {
  getQuotations,
  generateFinalOffer,
  updateFinalOffer,
  getQuotationById,
  createCpo,
} from "@/lib/quotation-api";

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);

const dateLabel = (value: string | null | undefined) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

export const Route = createFileRoute("/final-offer")({
  head: () => ({
    meta: [
      { title: "Final Offer — Vantage CRM" },
      {
        name: "description",
        content: "Review and manage final offers generated from approved quotations.",
      },
      { property: "og:title", content: "Final Offer — Vantage CRM" },
      {
        property: "og:description",
        content: "Review and manage final offers generated from approved quotations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FinalOfferPage,
});

type Quotation = Awaited<ReturnType<typeof getQuotations>>[number];

type FinalOfferItemDraft = {
  module: string | null;
  moduleName: string;
  description: string;
  requirements: string;
  estimatedCost: number | null;
  estimatedDays: number | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  remarks: string;
  amount: number;
};

function inputDate(value: string | null | undefined): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return match ? `${match[3]}-${match[1]}-${match[2]}` : "";
}

function finalOfferColumns(
  onEdit: (offer: Quotation) => void,
  onGenerate: (offer: Quotation) => void,
  isGenerating: boolean,
): Column<Quotation>[] {
  return [
    {
      key: "companyName",
      header: "Company",
      cell: (offer) => <span className="font-medium">{offer.companyName || "—"}</span>,
      filterValue: (offer) => offer.companyName || "",
    },
    {
      key: "quotationNumber",
      header: "Quo. No.",
      cell: (offer) => <span className="font-mono text-xs">{offer.quotationNumber || "—"}</span>,
      filterValue: (offer) => offer.quotationNumber || "",
    },
    {
      key: "foDate",
      header: "FO Date",
      filterType: "date",
      cell: (offer) => dateLabel(offer.foDate ?? offer.quotationDate),
      filterValue: (offer) => offer.foDate ?? offer.quotationDate,
    },
    {
      key: "city",
      header: "City",
      cell: (offer) => offer.city || "—",
      filterValue: (offer) => offer.city || "",
    },
    {
      key: "totalAmount",
      header: "Total",
      filterable: false,
      cell: (offer) => <span className="font-medium text-brand">{money(offer.totalAmount)}</span>,
      filterValue: (offer) => offer.totalAmount,
    },
    {
      key: "docs",
      header: "Docs",
      sortable: false,
      filterable: false,
      cell: (offer) =>
        offer.finalOfferPdf ? (
          <a
            href={offer.finalOfferPdf}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
          >
            <Download className="size-3.5" />
            PDF
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "actions",
      header: "Action",
      sortable: false,
      filterable: false,
      cell: (offer) => (
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant="outline" onClick={() => onEdit(offer)}>
            <Pencil className="mr-1 size-3.5" /> Edit
          </Button>
        </div>
      ),
    },
  ];
}

function FinalOfferPage() {
  const queryClient = useQueryClient();
  const quotationsQuery = useQuery({
    queryKey: ["quotations"],
    queryFn: getQuotations,
  });
  const [editingOffer, setEditingOffer] = useState<Quotation | null>(null);
  const [foDate, setFoDate] = useState("");
  const [items, setItems] = useState<FinalOfferItemDraft[]>([]);

  const generateMutation = useMutation({
    mutationFn: (quotationId: string) => generateFinalOffer(quotationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast.success("Final offer generated");
    },
    onError: (error: Error) => toast.error(error.message || "Could not generate final offer"),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingOffer) throw new Error("Select a final offer to edit.");
      return updateFinalOffer(editingOffer.id, {
        fo_date: foDate,
        items: items.map((item) => ({
          module: item.module,
          module_name: item.moduleName,
          description: item.description,
          requirements: item.requirements,
          estimated_cost: item.estimatedCost,
          estimated_days: item.estimatedDays,
          priority: item.priority,
          remarks: item.remarks,
          amount: item.amount,
        })),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["quotations"] });
      setEditingOffer(null);
      toast.success("Final offer updated");
    },
    onError: (error: Error) => toast.error(error.message || "Could not update final offer"),
  });

  const cpoMutation = useMutation({
    mutationFn: (quotationId: string) => createCpo(quotationId),
    onSuccess: async (response) => {
      setEditingOffer((current) =>
        current ? { ...current, cpoCreated: response.cpo_created } : current,
      );
      await queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast.success(response.message);
    },
    onError: (error: Error) => toast.error(error.message || "Could not create CPO"),
  });

  const openEdit = async (offer: Quotation) => {
    try {
      const quotation = await getQuotationById(offer.id);

      setEditingOffer(quotation);
      setFoDate(inputDate(quotation.foDate ?? quotation.quotationDate));
      setItems(
        quotation.items.map((item) => ({
          ...item,
        })),
      );
    } catch {
      toast.error("Could not load final offer");
    }
  };
  const columns = finalOfferColumns(
    openEdit,
    (offer) => generateMutation.mutate(offer.id),
    generateMutation.isPending,
  );

  const finalOffers = (quotationsQuery.data ?? []).filter(
    (quotation) => quotation.finalOfferGenerated || quotation.status === "APPROVED",
  );

  const isEmpty = !quotationsQuery.isLoading && finalOffers.length === 0;

  return (
    <div className="space-y-6">
      <div className="rise">
        <div className="font-mono text-[11px] tracking-wide text-muted-foreground">ORDER FLOW</div>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Final Offer</h1>
      </div>

      <div className="rise" style={{ animationDelay: "90ms" }}>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-line bg-surface/80 py-12 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
              <FileText className="size-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold">No final offers generated yet</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a quotation and generate the final offer from the sales workflow.
              </p>
            </div>
            <Button asChild className="gap-2">
              <Link to="/sales/quotations">
                <ArrowRight className="size-4" />
                Open quotations
              </Link>
            </Button>
          </div>
        ) : (
          <DataTable<Quotation>
            data={finalOffers}
            columns={columns}
            searchKeys={["companyName", "quotationNumber", "city"]}
            searchPlaceholder="Search final offers"
            emptyMessage={
              quotationsQuery.isLoading ? "Loading final offers…" : "No final offers found."
            }
            storageKey="final-offers-table"
          />
        )}
      </div>

      <Modal
        open={Boolean(editingOffer)}
        onClose={() => !updateMutation.isPending && setEditingOffer(null)}
        title={`Edit Final Offer${editingOffer ? ` - ${editingOffer.quotationNumber}` : ""}`}
        eyebrow="FINAL OFFER"
        wide
      >

        {/* offer form sd*/}
        {editingOffer && (
          <form
            className="space-y-5 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              updateMutation.mutate();
            }}
          >
            <dl className="grid gap-x-6 gap-y-3 rounded-md border border-line bg-background p-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">Company</dt>
                <dd className="mt-1 text-sm font-medium">{editingOffer.companyName || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">
                  Quotation No.
                </dt>
                <dd className="mt-1 font-mono text-sm">{editingOffer.quotationNumber}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">
                  City / State
                </dt>
                <dd className="mt-1 text-sm">
                  {[editingOffer.city, editingOffer.state].filter(Boolean).join(", ") || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">Status</dt>
                <dd className="mt-1 text-sm">{editingOffer.status}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">
                  Current Total
                </dt>
                <dd className="mt-1 text-sm font-medium">{money(editingOffer.totalAmount)}</dd>
              </div>
            </dl>

            <label className="block max-w-xs space-y-1.5 text-sm font-medium">
              <span>Final Offer Date</span>
              <Input
                type="date"
                required
                value={foDate}
                onChange={(event) => setFoDate(event.target.value)}
              />
            </label>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Items</h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setItems((current) => [
                      ...current,
                      {
                        module: null,
                        moduleName: "",
                        description: "",
                        requirements: "",
                        estimatedCost: 0,
                        estimatedDays: 0,
                        priority: "MEDIUM",
                        remarks: "",
                        amount: 0,
                      },
                    ])
                  }
                >
                  <Plus className="mr-1 size-4" /> Add Item
                </Button>
              </div>

              <div className="overflow-x-auto rounded-md border border-line">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="bg-background text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 font-medium">Type</th>
                      <th className="px-2 py-2 font-medium">Description</th>
                      <th className="px-2 py-2 font-medium">Requirements</th>
                      <th className="px-2 py-2 font-medium">Remarks</th>
                      <th className="px-2 py-2 font-medium">Days</th>
                      <th className="px-2 py-2 font-medium">Unit Cost</th>
                      <th className="px-2 py-2 font-medium">Amount</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr
                        key={`new-${index}`}
                        className="border-t border-line align-top"
                      >
                        <td className="p-2">
                          <Input
                            value={item.moduleName}
                            onChange={(event) =>
                              setItems((current) =>
                                current.map((row, rowIndex) =>
                                  rowIndex === index
                                    ? { ...row, moduleName: event.target.value }
                                    : row,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={item.description}
                            onChange={(event) =>
                              setItems((current) =>
                                current.map((row, rowIndex) =>
                                  rowIndex === index
                                    ? { ...row, description: event.target.value }
                                    : row,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={item.requirements}
                            onChange={(event) =>
                              setItems((current) =>
                                current.map((row, rowIndex) =>
                                  rowIndex === index
                                    ? { ...row, requirements: event.target.value }
                                    : row,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={item.remarks}
                            onChange={(event) =>
                              setItems((current) =>
                                current.map((row, rowIndex) =>
                                  rowIndex === index
                                    ? { ...row, remarks: event.target.value }
                                    : row,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min="0"
                            value={item.estimatedDays ?? ""}
                            onChange={(event) =>
                              setItems((current) =>
                                current.map((row, rowIndex) =>
                                  rowIndex === index
                                    ? {
                                        ...row,
                                        estimatedDays:
                                          event.target.value === ""
                                            ? null
                                            : Number(event.target.value),
                                      }
                                    : row,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.estimatedCost ?? ""}
                            onChange={(event) =>
                              setItems((current) =>
                                current.map((row, rowIndex) =>
                                  rowIndex === index
                                    ? {
                                        ...row,
                                        estimatedCost:
                                          event.target.value === ""
                                            ? null
                                            : Number(event.target.value),
                                      }
                                    : row,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.amount}
                            onChange={(event) =>
                              setItems((current) =>
                                current.map((row, rowIndex) =>
                                  rowIndex === index
                                    ? { ...row, amount: Number(event.target.value) || 0 }
                                    : row,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="p-2">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`Remove item ${index + 1}`}
                            onClick={() =>
                              setItems((current) =>
                                current.filter((_, rowIndex) => rowIndex !== index),
                              )
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                          No items. Add an item to this final offer.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between gap-2 border-t border-line pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={editingOffer.cpoCreated || cpoMutation.isPending}
                onClick={() => cpoMutation.mutate(editingOffer.id)}
              >
                {editingOffer.cpoCreated
                  ? "CPO Already Created"
                  : cpoMutation.isPending
                    ? "Creating CPO..."
                    : "CREATE CPO"}
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={updateMutation.isPending}
                  onClick={() => setEditingOffer(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending || !foDate}>
                  {updateMutation.isPending ? "Updating..." : "Update Final Offer"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
