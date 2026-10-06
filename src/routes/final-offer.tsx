import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Download, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Modal } from "@/components/common/Modal";
import { DataTable, type Column } from "@/components/common/DataTable";
import {
  getQuotations,
  generateFinalOffer,
  updateFinalOffer,
  getQuotationById,
  updateQuotationCpo,
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
  const [itemDrawerIndex, setItemDrawerIndex] = useState<number | null>(null);

  const updateItem = (index: number, changes: Partial<FinalOfferItemDraft>) => {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...changes } : item)),
    );
  };

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
    mutationFn: (quotationId: string) => updateQuotationCpo(quotationId, { cpo_created: true }),
    onSuccess: async (quotation) => {
      setEditingOffer((current) =>
        current ? { ...current, cpoCreated: quotation.cpoCreated } : current,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["quotations"] }),
        queryClient.invalidateQueries({ queryKey: ["cpos"] }),
      ]);
      toast.success("Quotation marked for CPO processing");
    },
    onError: (error: Error) => toast.error(error.message || "Could not mark quotation for CPO"),
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
              <section className="rounded-lg border border-line bg-surface">
                <div className="flex items-center justify-between gap-2 p-4">
                  <h3 className="text-sm font-semibold">Items</h3>
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      const nextIndex = items.length;
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
                      ]);
                      setItemDrawerIndex(nextIndex);
                    }}
                  >
                    <Plus className="size-4" /> Add Item
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1080px] text-sm">
                    <thead className="border-y border-line text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="w-10 px-4 py-2 font-medium">#</th>
                        <th className="w-56 px-2 py-2 font-medium">Item name</th>
                        <th className="w-56 px-2 py-2 font-medium">Description</th>
                        <th className="w-56 px-2 py-2 font-medium">Requirements</th>
                        <th className="w-28 px-2 py-2 font-medium">Cost</th>
                        <th className="w-24 px-2 py-2 font-medium">Days</th>
                        <th className="w-28 px-2 py-2 font-medium">Priority</th>
                        <th className="w-36 px-2 py-2 font-medium">Remarks</th>
                        <th className="w-36 px-2 py-2 text-right font-medium">Amount</th>
                        <th className="w-12 px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 && (
                        <tr>
                          <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                            No items added. Click "Add Item" to create a custom final offer item.
                          </td>
                        </tr>
                      )}
                      {items.map((item, index) => (
                        <tr
                          key={`new-${index}`}
                          className="border-b border-line last:border-0 align-top"
                        >
                          <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                          <td className="px-2 py-3 text-sm text-foreground">
                            {item.moduleName || "—"}
                          </td>
                          <td className="px-2 py-3 text-sm text-foreground">
                            {item.description || "—"}
                          </td>
                          <td className="px-2 py-3 text-sm text-foreground">
                            {item.requirements || "—"}
                          </td>
                          <td className="px-2 py-3 text-right text-sm font-medium text-foreground">
                            {money(Number(item.estimatedCost ?? 0))}
                          </td>
                          <td className="px-2 py-3 text-right text-sm text-foreground">
                            {item.estimatedDays ?? 0}
                          </td>
                          <td className="px-2 py-3 text-sm text-foreground">
                            {item.priority || "MEDIUM"}
                          </td>
                          <td className="px-2 py-3 text-sm text-foreground">
                            {item.remarks || "—"}
                          </td>
                          <td className="px-2 py-3 text-right text-sm font-medium text-foreground">
                            {money(Number(item.amount ?? 0))}
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex items-center justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setItemDrawerIndex(index)}
                                aria-label={`Edit item ${index + 1}`}
                                title="Edit item"
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                aria-label={`Remove item ${index + 1}`}
                                onClick={() =>
                                  setItems((current) =>
                                    current.filter((_, rowIndex) => rowIndex !== index),
                                  )
                                }
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            {itemDrawerIndex !== null && items[itemDrawerIndex] && (
              <Drawer
                open
                onOpenChange={(open) => !open && setItemDrawerIndex(null)}
                direction="right"
              >
                <DrawerContent className="inset-y-0 right-0 bottom-auto left-auto mt-0 h-full w-full max-w-xl rounded-none border-l">
                  <DrawerHeader className="border-b border-line text-left">
                    <DrawerTitle>
                      {items[itemDrawerIndex].moduleName || "New final offer item"}
                    </DrawerTitle>
                    <DrawerDescription>
                      Edit the details for this final offer item.
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="grid flex-1 gap-3 overflow-y-auto p-5 sm:grid-cols-2">
                    <label className="space-y-1.5 text-sm sm:col-span-2">
                      <span className="font-medium">Item name</span>
                      <Input
                        placeholder="Inventory Management"
                        value={items[itemDrawerIndex].moduleName}
                        onChange={(event) =>
                          updateItem(itemDrawerIndex, { moduleName: event.target.value })
                        }
                      />
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-medium">Description</span>
                      <textarea
                        className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={items[itemDrawerIndex].description}
                        onChange={(event) =>
                          updateItem(itemDrawerIndex, { description: event.target.value })
                        }
                      />
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-medium">Requirements</span>
                      <textarea
                        className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={items[itemDrawerIndex].requirements}
                        onChange={(event) =>
                          updateItem(itemDrawerIndex, { requirements: event.target.value })
                        }
                      />
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-medium">Estimated cost</span>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={items[itemDrawerIndex].estimatedCost ?? ""}
                        onChange={(event) =>
                          updateItem(itemDrawerIndex, {
                            estimatedCost:
                              event.target.value === "" ? null : Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-medium">Estimated days</span>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={items[itemDrawerIndex].estimatedDays ?? ""}
                        onChange={(event) =>
                          updateItem(itemDrawerIndex, {
                            estimatedDays:
                              event.target.value === "" ? null : Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-medium">Priority</span>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={items[itemDrawerIndex].priority}
                        onChange={(event) =>
                          updateItem(itemDrawerIndex, {
                            priority: event.target.value as FinalOfferItemDraft["priority"],
                          })
                        }
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-medium">Remarks</span>
                      <Input
                        value={items[itemDrawerIndex].remarks}
                        onChange={(event) =>
                          updateItem(itemDrawerIndex, { remarks: event.target.value })
                        }
                      />
                    </label>
                    <label className="space-y-1.5 text-sm sm:col-span-2">
                      <span className="font-medium">Final offer amount</span>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={items[itemDrawerIndex].amount}
                        onChange={(event) =>
                          updateItem(itemDrawerIndex, {
                            amount: Number(event.target.value) || 0,
                          })
                        }
                      />
                    </label>
                    <div className="flex justify-end sm:col-span-2">
                      <Button type="button" onClick={() => setItemDrawerIndex(null)}>
                        Done
                      </Button>
                    </div>
                  </div>
                </DrawerContent>
              </Drawer>
            )}

            <div className="flex justify-between gap-2 border-t border-line pt-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={editingOffer.cpoCreated || cpoMutation.isPending}
                  onClick={() => cpoMutation.mutate(editingOffer.id)}
                >
                  {editingOffer.cpoCreated
                    ? "Marked for CPO Processing"
                    : cpoMutation.isPending
                      ? "Marking..."
                      : "Mark for CPO Processing"}
                </Button>
                <Button asChild type="button" variant="outline">
                  <Link to="/customer-po">Open CPO list</Link>
                </Button>
              </div>
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
