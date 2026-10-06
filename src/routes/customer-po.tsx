import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ExternalLink, FileText, ShoppingCart, Upload } from "lucide-react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/common/DataTable";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  attachCpoDocument,
  createSalesOrder,
  getCpos,
  updateQuotationCpo,
  type Quotation,
} from "@/lib/quotation-api";

export const Route = createFileRoute("/customer-po")({
  head: () => ({
    meta: [
      { title: "Customer Purchase Orders — Vantage CRM" },
      {
        name: "description",
        content: "Review quotations marked for customer purchase order processing.",
      },
    ],
  }),
  component: CustomerPurchaseOrdersPage,
});

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);

function displayDate(value: string | null) {
  if (!value) return "—";
  const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (match) return `${match[2]}/${match[1]}/${match[3]}`;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB").format(date);
}

function inputDate(value: string | null) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}

function CustomerPurchaseOrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cposQuery = useQuery({ queryKey: ["cpos"], queryFn: getCpos });
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [cpoDate, setCpoDate] = useState("");
  const cpoFileInput = useRef<HTMLInputElement>(null);

  const updateDateMutation = useMutation({
    mutationFn: () => {
      if (!selectedQuotation) throw new Error("Choose a quotation first.");
      return updateQuotationCpo(selectedQuotation.id, {
        cpo_date: cpoDate || null,
      });
    },
    onSuccess: async (quotation) => {
      setSelectedQuotation(quotation);
      setCpoDate(inputDate(quotation.cpoDate));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cpos"] }),
        queryClient.invalidateQueries({ queryKey: ["quotations"] }),
      ]);
      toast.success("CPO date updated");
    },
    onError: (error: Error) => toast.error(error.message || "Could not update CPO date"),
  });

  const attachCpoMutation = useMutation({
    mutationFn: (document: File) => {
      if (!selectedQuotation) throw new Error("Choose a quotation first.");
      return attachCpoDocument(selectedQuotation.id, document);
    },
    onSuccess: async (quotation) => {
      setSelectedQuotation(quotation);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cpos"] }),
        queryClient.invalidateQueries({ queryKey: ["quotations"] }),
      ]);
      toast.success("CPO document attached");
    },
    onError: (error: Error) => toast.error(error.message || "Could not attach CPO document"),
  });

  const createSalesOrderMutation = useMutation({
    mutationFn: () => {
      if (!selectedQuotation) throw new Error("Choose a quotation first.");
      return createSalesOrder(selectedQuotation.id);
    },
    onSuccess: async (salesOrder) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["quotations"] }),
        queryClient.invalidateQueries({ queryKey: ["cpos"] }),
        queryClient.invalidateQueries({ queryKey: ["sales-orders"] }),
      ]);
      setSelectedQuotation(null);
      toast.success(`Sales order ${salesOrder.soNumber} created`);
      await navigate({
        to: "/sales/orders",
        search: { soId: salesOrder.id },
      });
    },
    onError: (error: Error) => toast.error(error.message || "Could not create sales order"),
  });

  const openDetails = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setCpoDate(inputDate(quotation.cpoDate));
  };

  const columns = useMemo<Column<Quotation>[]>(
    () => [
      {
        key: "companyName",
        header: "Customer / Company",
        cell: (quotation) => quotation.companyName || "—",
        filterValue: (quotation) => quotation.companyName,
      },
      {
        key: "quotationNumber",
        header: "Quotation",
        cell: (quotation) => (
          <span className="font-mono text-xs">{quotation.quotationNumber}</span>
        ),
      },
      {
        key: "quotationDate",
        header: "Quotation date",
        filterType: "date",
        cell: (quotation) => displayDate(quotation.quotationDate),
        filterValue: (quotation) => quotation.quotationDate,
      },
      {
        key: "totalAmount",
        header: "Quotation total",
        cell: (quotation) => money(quotation.totalAmount),
        filterable: false,
      },
      {
        key: "cpoDate",
        header: "CPO date",
        cell: (quotation) => displayDate(quotation.cpoDate),
        filterType: "date",
        filterValue: (quotation) => quotation.cpoDate,
      },
      {
        key: "actions",
        header: "Details",
        sortable: false,
        filterable: false,
        cell: (quotation) => (
          <Button type="button" size="sm" variant="outline" onClick={() => openDetails(quotation)}>
            <FileText className="mr-1 size-3.5" />
            Update CPO date
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-[11px] tracking-wide text-muted-foreground">ORDER FLOW</div>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
          Customer Purchase Orders
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Quotations marked for CPO processing appear here. Only the CPO date can be updated here.
        </p>
      </div>

      <div>
        {cposQuery.isError && (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {cposQuery.error.message || "Could not load customer purchase orders."}
          </p>
        )}
        <DataTable
          data={cposQuery.data ?? []}
          columns={columns}
          searchKeys={["quotationNumber", "companyName"]}
          searchPlaceholder="Search quotations or companies"
          storageKey="customer-purchase-orders"
          emptyMessage={
            cposQuery.isLoading
              ? "Loading CPO quotations…"
              : "No quotations have been marked for CPO processing."
          }
        />
      </div>

      <Modal
        open={Boolean(selectedQuotation)}
        onClose={() =>
          !updateDateMutation.isPending &&
          !attachCpoMutation.isPending &&
          !createSalesOrderMutation.isPending &&
          setSelectedQuotation(null)
        }
        title={
          selectedQuotation ? `CPO details · ${selectedQuotation.quotationNumber}` : "CPO details"
        }
        eyebrow="CUSTOMER PURCHASE ORDER"
        wide
      >
        {selectedQuotation && (
          <form
            className="max-h-[75vh] space-y-5 overflow-y-auto p-5"
            onSubmit={(event) => {
              event.preventDefault();
              updateDateMutation.mutate();
            }}
          >
            <section className="grid gap-4 rounded-md border border-line bg-muted/20 p-4 md:grid-cols-2">
              <div>
                <h2 className="font-semibold uppercase">{selectedQuotation.companyName || "Company"}</h2>
                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                  {selectedQuotation.companyAddress || "No address on file"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[selectedQuotation.city, selectedQuotation.state, selectedQuotation.companyPincode]
                    .filter(Boolean)
                    .join(", ") || "Location not set"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">Contacts</h3>
                {selectedQuotation.companyContacts.length ? (
                  <ul className="mt-2 space-y-2">
                    {selectedQuotation.companyContacts.map((contact, index) => (
                      <li key={`${contact.name}-${contact.phone}-${index}`} className="text-sm">
                        <span className="font-medium">
                          {index + 1}. {contact.name}
                          {contact.isPrimary ? " · Primary" : ""}
                        </span>
                        {contact.designation && (
                          <span className="text-muted-foreground"> · {contact.designation}</span>
                        )}
                        {(contact.phone || contact.email) && (
                          <span className="block text-muted-foreground">
                            {[contact.phone, contact.email].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No contacts on file.</p>
                )}
              </div>
            </section>

            <dl className="grid gap-x-6 gap-y-3 rounded-md bg-muted/20 p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Project</dt>
                <dd className="mt-0.5 font-medium">{selectedQuotation.projectName || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Quotation date</dt>
                <dd className="mt-0.5 font-medium">
                  {displayDate(selectedQuotation.quotationDate)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">CPO date</dt>
                <dd className="mt-1">
                  <Input
                    type="date"
                    value={cpoDate}
                    onChange={(event) => setCpoDate(event.target.value)}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Quotation status</dt>
                <dd className="mt-0.5 font-medium">{selectedQuotation.statusDisplay}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Delivery timeline</dt>
                <dd className="mt-0.5 font-medium">
                  {selectedQuotation.deliveryTimeline || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Quotation total</dt>
                <dd className="mt-0.5 font-semibold">{money(selectedQuotation.totalAmount)}</dd>
              </div>
            </dl>

            {(selectedQuotation.quotationPdf || selectedQuotation.finalOfferPdf) && (
              <div className="flex flex-wrap gap-4 text-sm">
                {selectedQuotation.quotationPdf && (
                  <a
                    href={selectedQuotation.quotationPdf}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                  >
                    Quotation PDF <ExternalLink className="size-3.5" />
                  </a>
                )}
                {selectedQuotation.finalOfferPdf && (
                  <a
                    href={selectedQuotation.finalOfferPdf}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                  >
                    Final offer PDF <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>
            )}

            {selectedQuotation.cpoDocument && (
              <a
                href={selectedQuotation.cpoDocument}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
              >
                View attached CPO <ExternalLink className="size-3.5" />
              </a>
            )}

            <section className="overflow-hidden rounded-md border border-line">
              <h2 className="px-4 py-3 text-sm font-semibold">Quotation items</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
                  <thead className="border-y border-line bg-muted/30 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Type / Module</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2">Requirements</th>
                      <th className="px-3 py-2">Est. days</th>
                      <th className="px-3 py-2">Priority</th>
                      <th className="px-3 py-2 text-right">Est. cost</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {selectedQuotation.items.map((item, index) => (
                      <tr key={item.id ?? `${item.moduleName}-${index}`}>
                        <td className="px-3 py-3">{index + 1}</td>
                        <td className="px-3 py-3 font-medium">{item.moduleName || "—"}</td>
                        <td className="max-w-48 whitespace-pre-wrap px-3 py-3">
                          {item.description || "—"}
                        </td>
                        <td className="max-w-56 whitespace-pre-wrap px-3 py-3">
                          {item.requirements || "—"}
                        </td>
                        <td className="px-3 py-3">{item.estimatedDays ?? "—"}</td>
                        <td className="px-3 py-3">{item.priority}</td>
                        <td className="px-3 py-3 text-right">
                          {item.estimatedCost == null ? "—" : money(item.estimatedCost)}
                        </td>
                        <td className="px-3 py-3 text-right font-medium">{money(item.amount)}</td>
                        <td className="max-w-48 whitespace-pre-wrap px-3 py-3">
                          {item.remarks || "—"}
                        </td>
                      </tr>
                    ))}
                    {!selectedQuotation.items.length && (
                      <tr>
                        <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                          No quotation items.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <dl className="grid gap-x-6 gap-y-2 border-t border-line bg-muted/20 p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>{money(selectedQuotation.subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd>{money(selectedQuotation.discount)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">
                    {selectedQuotation.taxTypeDisplay || "Tax"}
                  </dt>
                  <dd>{money(selectedQuotation.taxAmount)}</dd>
                </div>
                {selectedQuotation.cgstAmount > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">CGST</dt>
                    <dd>{money(selectedQuotation.cgstAmount)}</dd>
                  </div>
                )}
                {selectedQuotation.sgstAmount > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">SGST</dt>
                    <dd>{money(selectedQuotation.sgstAmount)}</dd>
                  </div>
                )}
                {selectedQuotation.igstAmount > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">IGST</dt>
                    <dd>{money(selectedQuotation.igstAmount)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Taxable amount</dt>
                  <dd>{money(selectedQuotation.taxableAmount)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Packing charges</dt>
                  <dd>{money(selectedQuotation.packingCharges)}</dd>
                </div>
                <div className="flex justify-between gap-3 font-semibold">
                  <dt>Total</dt>
                  <dd>{money(selectedQuotation.totalAmount)}</dd>
                </div>
              </dl>
            </section>

            {selectedQuotation.termsConditions && (
              <section className="rounded-md border border-line p-4">
                <h2 className="text-sm font-semibold">Terms and conditions</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {selectedQuotation.termsConditions}
                </p>
              </section>
            )}

            <input
              ref={cpoFileInput}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) attachCpoMutation.mutate(file);
                event.currentTarget.value = "";
              }}
            />
            <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
              <Button
                type="button"
                disabled={createSalesOrderMutation.isPending}
                onClick={() => createSalesOrderMutation.mutate()}
              >
                <ShoppingCart className="mr-2 size-4" />
                {createSalesOrderMutation.isPending ? "Creating SO…" : "Create SO"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={attachCpoMutation.isPending}
                onClick={() => cpoFileInput.current?.click()}
              >
                <Upload className="mr-2 size-4" />
                {attachCpoMutation.isPending
                  ? "Attaching…"
                  : selectedQuotation.cpoDocument
                    ? "Replace CPO"
                    : "Attach CPO"}
              </Button>
              <Button type="submit" disabled={updateDateMutation.isPending}>
                {updateDateMutation.isPending ? "Updating…" : "Update CPO date"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
