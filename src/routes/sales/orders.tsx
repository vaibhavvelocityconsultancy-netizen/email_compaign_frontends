import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/common/DataTable";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCompanyContact,
  listCities,
  listCountries,
  listStates,
  updateCompany,
  updateCompanyContact,
  type CompanyContactInput,
} from "@/lib/company-api";
import { getSalesOrders, updateSalesOrder, type SalesOrder } from "@/lib/quotation-api";

export const Route = createFileRoute("/sales/orders")({
  validateSearch: (search: Record<string, unknown>) => ({
    soId: typeof search.soId === "string" ? search.soId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sales Orders — Vantage CRM" },
      { name: "description", content: "Review sales orders created from quotations." },
    ],
  }),
  component: SalesOrdersPage,
});

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);

function dateLabel(value: string) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB").format(date);
}

function DocumentLinks({ order }: { order: SalesOrder }) {
  const documents = [
    ["Quotation", order.quotationPdf],
    ["FO", order.finalOfferPdf],
    ["CPO", order.cpoDocument],
    ["SO", order.soPdf],
  ] as const;
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs">
      {documents.map(([label, url]) =>
        url ? (
          <a
            key={label}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {label}
          </a>
        ) : (
          <span key={label} className="text-muted-foreground" title={`${label} document unavailable`}>
            {label} —
          </span>
        ),
      )}
    </div>
  );
}

function SalesOrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { soId } = Route.useSearch();
  const [editing, setEditing] = useState(false);
  const salesOrdersQuery = useQuery({
    queryKey: ["sales-orders"],
    queryFn: getSalesOrders,
  });
  const salesOrders = salesOrdersQuery.data ?? [];
  const selectedOrder = salesOrders.find((order) => order.id === soId);

  const columns = useMemo<Column<SalesOrder>[]>(
    () => [
       {
        key: "companyName",
        header: "Customer / Company",
        cell: (order) => order.companyName || "—",
        filterValue: (order) => order.companyName,
      },
      {
        key: "soNumber",
        header: "Sales order",
        cell: (order) => <span className="font-mono text-xs">{order.soNumber}</span>,
        filterValue: (order) => order.soNumber,
      },
     
      // {
      //   key: "quotationNumber",
      //   header: "Quotation",
      //   cell: (order) => order.quotationNumber || "—",
      //   filterValue: (order) => order.quotationNumber,
      // },
      {
        key: "soDate",
        header: "SO date",
        filterType: "date",
        cell: (order) => dateLabel(order.soDate),
        filterValue: (order) => order.soDate,
      },
      {
        key: "totalAmount",
        header: "Total",
        filterable: false,
        cell: (order) => <span className="font-medium">{money(order.totalAmount)}</span>,
      },
      {
        key: "status",
        header: "Status",
        cell: (order) => order.status.replaceAll("_", " "),
        filterValue: (order) => order.status,
      },
      {
        key: "documents",
        header: "Docs",
        sortable: false,
        filterable: false,
        cell: (order) => <DocumentLinks order={order} />,
      },
      {
        key: "actions",
        header: "Details",
        sortable: false,
        filterable: false,
        cell: (order) => (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              navigate({ to: "/sales/orders", search: { soId: order.id } })
            }
          >
            <FileText className="mr-1 size-3.5" />
            View
          </Button>
        ),
      },
    ],
    [navigate],
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-[11px] tracking-wide text-muted-foreground">ORDER FLOW</div>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Sales Orders</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sales orders created from customer purchase order quotations.
        </p>
      </div>

      {salesOrdersQuery.isError && (
        <p role="alert" className="text-sm text-destructive">
          {salesOrdersQuery.error.message || "Could not load sales orders."}
        </p>
      )}

      <DataTable
        data={salesOrders}
        columns={columns}
        searchKeys={["soNumber", "quotationNumber", "companyName"]}
        searchPlaceholder="Search sales orders, quotations, or companies"
        storageKey="sales-orders"
        emptyMessage={
          salesOrdersQuery.isLoading ? "Loading sales orders…" : "No sales orders created yet."
        }
      />

      {selectedOrder && (
        <section className="space-y-5 rounded-md border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Sales Order
              </div>
              <h2 className="mt-1 font-display text-2xl font-bold">{selectedOrder.soNumber}</h2>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="mr-2 size-4" />
                Edit Sales Order
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: "/sales/orders", search: {} })}
              >
                <ArrowLeft className="mr-2 size-4" />
                All Sales Orders
              </Button>
            </div>
          </div>

          <dl className="grid gap-4 rounded-md bg-muted/20 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Company</dt>
              <dd className="mt-1 font-medium">{selectedOrder.companyName || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Address</dt>
              <dd className="mt-1 whitespace-pre-wrap font-medium">
                {[selectedOrder.companyAddress, selectedOrder.companyCityName, selectedOrder.companyStateName, selectedOrder.companyPincode]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Quotation</dt>
              <dd className="mt-1 font-medium">{selectedOrder.quotationNumber || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Project</dt>
              <dd className="mt-1 font-medium">{selectedOrder.projectName || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">SO date</dt>
              <dd className="mt-1 font-medium">{dateLabel(selectedOrder.soDate)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="mt-1 font-medium">{selectedOrder.status.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Payment terms</dt>
              <dd className="mt-1 whitespace-pre-wrap">{selectedOrder.paymentTerms || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Delivery terms</dt>
              <dd className="mt-1 whitespace-pre-wrap">{selectedOrder.deliveryTerms || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Remarks</dt>
              <dd className="mt-1 whitespace-pre-wrap">{selectedOrder.remarks || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Documents</dt>
              <dd className="mt-1"><DocumentLinks order={selectedOrder} /></dd>
            </div>
          </dl>

          <div className="overflow-x-auto rounded-md border border-line">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="border-b border-line bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Module</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Requirements</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {selectedOrder.items.map((item, index) => (
                  <tr key={item.id ?? `${item.moduleName}-${index}`}>
                    <td className="px-3 py-3">{index + 1}</td>
                    <td className="px-3 py-3 font-medium">{item.moduleName || "—"}</td>
                    <td className="max-w-64 whitespace-pre-wrap px-3 py-3">
                      {item.description || "—"}
                    </td>
                    <td className="max-w-64 whitespace-pre-wrap px-3 py-3">
                      {item.requirements || "—"}
                    </td>
                    <td className="px-3 py-3 text-right">{money(item.amount)}</td>
                  </tr>
                ))}
                {!selectedOrder.items.length && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                      No line items on the source quotation.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-5 border-t border-line pt-4 text-sm">
            <span>Subtotal: {money(selectedOrder.subtotal)}</span>
            <span>Discount: {money(selectedOrder.discountAmount)}</span>
            <span>Tax: {money(selectedOrder.taxAmount)}</span>
            <strong>Total: {money(selectedOrder.totalAmount)}</strong>
          </div>
          <SalesOrderEditDialog
            open={editing}
            order={selectedOrder}
            onClose={() => setEditing(false)}
            onSaved={async () => {
              await queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
              setEditing(false);
            }}
          />
        </section>
      )}
    </div>
  );
}

interface ContactDraft {
  key: string;
  id?: number;
  name: string;
  designation: string;
  phone: string;
  email: string;
  is_primary: boolean;
}

interface SalesOrderEditDialogProps {
  open: boolean;
  order: SalesOrder;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

function SalesOrderEditDialog({ open, order, onClose, onSaved }: SalesOrderEditDialogProps) {
  const countriesQuery = useQuery({ queryKey: ["countries"], queryFn: listCountries, enabled: open });
  const statesQuery = useQuery({ queryKey: ["states"], queryFn: listStates, enabled: open });
  const citiesQuery = useQuery({ queryKey: ["cities"], queryFn: listCities, enabled: open });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [contacts, setContacts] = useState<ContactDraft[]>([]);

  useEffect(() => {
    if (!open) return;
    setError("");
    setCountry(order.companyCountryId == null ? "" : String(order.companyCountryId));
    setState(order.companyStateId == null ? "" : String(order.companyStateId));
    setCity(order.companyCityId == null ? "" : String(order.companyCityId));
    setContacts(order.companyContacts.map((contact) => ({ ...contact, key: String(contact.id) })));
  }, [open, order]);

  const filteredStates = (statesQuery.data ?? []).filter(
    (option) => !country || option.country === Number(country),
  );
  const filteredCities = (citiesQuery.data ?? []).filter(
    (option) => !state || option.state === Number(state),
  );
  const locationsLoading = countriesQuery.isLoading || statesQuery.isLoading || citiesQuery.isLoading;

  function updateContact(index: number, field: keyof Omit<ContactDraft, "key" | "id">, value: string | boolean) {
    setContacts((current) =>
      current.map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, [field]: value } : contact,
      ),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order.companyId) {
      setError("This sales order has no linked company.");
      return;
    }
    const data = new FormData(event.currentTarget);
    const companyName = String(data.get("company_name") ?? "").trim();
    if (!companyName) {
      setError("Company name is required.");
      return;
    }
    if (contacts.some((contact) => !contact.name.trim())) {
      setError("Every contact needs a name.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await updateCompany(order.companyId, {
        name: companyName,
        address: String(data.get("company_address") ?? "").trim(),
        city: city ? Number(city) : null,
        state: state ? Number(state) : null,
        country: country ? Number(country) : null,
        pincode: String(data.get("company_pincode") ?? "").trim(),
        gst_number: String(data.get("company_gst_number") ?? "").trim(),
      });
      for (const contact of contacts) {
        const contactData: CompanyContactInput = {
          name: contact.name.trim(),
          designation: contact.designation.trim(),
          phone: contact.phone.trim(),
          email: contact.email.trim(),
          is_primary: contact.is_primary,
        };
        if (contact.id) {
          await updateCompanyContact(order.companyId, contact.id, contactData);
        } else {
          await createCompanyContact(order.companyId, contactData);
        }
      }
      await updateSalesOrder(order.id, {
        so_number: String(data.get("so_number") ?? "").trim(),
        so_date: String(data.get("so_date") ?? ""),
        payment_terms: String(data.get("payment_terms") ?? "").trim(),
        delivery_terms: String(data.get("delivery_terms") ?? "").trim(),
        remarks: String(data.get("remarks") ?? "").trim(),
        status: String(data.get("status") ?? order.status),
      });
      await onSaved();
      toast.success("Sales order and shared company details updated.");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Could not update sales order.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Sales Order" eyebrow={order.soNumber} wide>
      <form onSubmit={handleSubmit} className="space-y-5 p-5">
        <section className="space-y-3">
          <h4 className="font-semibold">Company details</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm sm:col-span-2">
              Company name
              <Input name="company_name" defaultValue={order.companyName} required />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              Address
              <Input name="company_address" defaultValue={order.companyAddress} />
            </label>
            <label className="space-y-1 text-sm">
              Country
              <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={country} disabled={locationsLoading} onChange={(event) => { setCountry(event.target.value); setState(""); setCity(""); }}>
                <option value="">Select country</option>
                {(countriesQuery.data ?? []).map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              State
              <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={state} disabled={locationsLoading} onChange={(event) => { setState(event.target.value); setCity(""); }}>
                <option value="">Select state</option>
                {filteredStates.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              City
              <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={city} disabled={locationsLoading} onChange={(event) => setCity(event.target.value)}>
                <option value="">Select city</option>
                {filteredCities.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              Pincode
              <Input name="company_pincode" defaultValue={order.companyPincode} />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              GST number
              <Input name="company_gst_number" defaultValue={order.companyGstNumber} />
            </label>
          </div>
        </section>

        <section className="space-y-3 border-t border-line pt-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Company contacts</h4>
            <Button type="button" size="sm" variant="outline" onClick={() => setContacts((current) => [...current, { key: `new-${Date.now()}`, name: "", designation: "", phone: "", email: "", is_primary: false }])}>
              <Plus className="mr-1 size-4" /> Add Contact
            </Button>
          </div>
          {contacts.map((contact, index) => (
            <div key={contact.key} className="grid gap-2 rounded-md border border-line p-3 sm:grid-cols-2">
              <Input aria-label="Contact name" placeholder="Name" value={contact.name} onChange={(event) => updateContact(index, "name", event.target.value)} required />
              <Input aria-label="Designation" placeholder="Designation" value={contact.designation} onChange={(event) => updateContact(index, "designation", event.target.value)} />
              <Input aria-label="Contact email" type="email" placeholder="Email" value={contact.email} onChange={(event) => updateContact(index, "email", event.target.value)} />
              <Input aria-label="Contact phone" type="tel" placeholder="Phone" value={contact.phone} onChange={(event) => updateContact(index, "phone", event.target.value)} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={contact.is_primary} onChange={(event) => updateContact(index, "is_primary", event.target.checked)} />
                Primary contact
              </label>
              {!contact.id && (
                <button type="button" aria-label="Remove new contact" className="justify-self-end text-muted-foreground hover:text-destructive" onClick={() => setContacts((current) => current.filter((item) => item.key !== contact.key))}>
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}
        </section>

        <section className="space-y-3 border-t border-line pt-4">
          <h4 className="font-semibold">Sales order</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">SO number<Input name="so_number" defaultValue={order.soNumber} required /></label>
            <label className="space-y-1 text-sm">SO date<Input name="so_date" type="date" defaultValue={order.soDate} required /></label>
            <label className="space-y-1 text-sm">Quotation<Input value={order.quotationNumber} readOnly /></label>
            <label className="space-y-1 text-sm">Created by<Input value={order.createdByName} readOnly /></label>
            <label className="space-y-1 text-sm">Status
              <select name="status" defaultValue={order.status} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                {["DRAFT", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">Delivery terms<textarea name="delivery_terms" defaultValue={order.deliveryTerms} rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></label>
            <label className="space-y-1 text-sm sm:col-span-2">Payment terms<textarea name="payment_terms" defaultValue={order.paymentTerms} rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></label>
            <label className="space-y-1 text-sm sm:col-span-2">Remarks<textarea name="remarks" defaultValue={order.remarks} rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></label>
          </div>
        </section>

        <section className="space-y-2 border-t border-line pt-4">
          <h4 className="font-semibold">Documents</h4>
          <DocumentLinks order={order} />
        </section>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Update SO"}</Button>
        </div>
      </form>
    </Modal>
  );
}
