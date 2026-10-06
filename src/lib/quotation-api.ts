import { request } from "@/lib/api";

export type QuotationStatus = "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "REVISION" | "CONVERTED";
export type TaxType = "" | "INTRA_STATE" | "INTER_STATE" | "INTER_STATE_LUT" | "SEZ_LUT" | "EXPORT";

export const QUOTATION_STATUSES: Array<[QuotationStatus, string]> = [
  ["DRAFT", "Draft"],
  ["SENT", "Sent"],
  ["APPROVED", "Approved"],
  ["REJECTED", "Rejected"],
  ["REVISION", "Revision"],
  ["CONVERTED", "Converted"],
];

export const TAX_TYPES: Array<[Exclude<TaxType, "">, string]> = [
  ["INTRA_STATE", "Intra State - CGST + SGST"],
  ["INTER_STATE", "Inter State - IGST"],
  ["INTER_STATE_LUT", "Inter State - IGST 0.1% (LUT Form)"],
  ["SEZ_LUT", "SEZ - 0% (LUT Form)"],
  ["EXPORT", "Export - 0% (Shipping Bill / Air Way Bill)"],
];

export interface QuotationItem {
  id?: string;
  module: string | null;
  moduleName: string;
  description: string;
  requirements: string;
  estimatedCost: number | null;
  estimatedDays: number | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  remarks: string;
  amount: number;
}

export interface QuotationCompanyContact {
  name: string;
  designation: string;
  phone: string;
  email: string;
  isPrimary: boolean;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  quotationDate: string | null;
  foDate: string | null;
  cpoDate: string | null;
  cpoCreated: boolean;
  cpoDocument: string | null;
  opportunity: string;
  projectName: string;
  companyId: number | null;
  companyName: string;
  companyAddress: string;
  companyPincode: string;
  companyContacts: QuotationCompanyContact[];
  city: string;
  state: string;
  status: QuotationStatus;
  statusDisplay: string;
  taxTypeDisplay: string;
  subtotal: number;
  discount: number;
  taxableAmount: number;
  taxType: TaxType;
  taxPercentage: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  packingCharges: number;
  totalAmount: number;
  termsConditions: string;
  deliveryTimeline: string;
  quotationPdf: string | null;
  finalOfferGenerated: boolean;
  finalOfferPdf: string | null;
  items: QuotationItem[];
}

export interface SalesOrder {
  id: string;
  soNumber: string;
  soDate: string;
  quotationId: string;
  quotationNumber: string;
  companyId: number;
  companyName: string;
  companyAddress: string;
  companyCityId: number | null;
  companyCityName: string;
  companyStateId: number | null;
  companyStateName: string;
  companyCountryId: number | null;
  companyCountryName: string;
  companyPincode: string;
  companyGstNumber: string;
  companyContacts: Array<{
    id: number;
    name: string;
    designation: string;
    phone: string;
    email: string;
    is_primary: boolean;
  }>;
  quotationPdf: string | null;
  finalOfferPdf: string | null;
  cpoDocument: string | null;
  soPdf: string | null;
  createdByName: string;
  projectName: string;
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  taxableAmount: number;
  taxPercentage: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  packingCharges: number;
  totalAmount: number;
  taxType: TaxType;
  paymentTerms: string;
  deliveryTerms: string;
  remarks: string;
  status: string;
  items: QuotationItem[];
}

export interface QuotationInput {
  quotation_number: string;
  quotation_date: string | null;
  opportunity: string | null;
  selected_company_id: number;
  status: QuotationStatus;
  subtotal: number;
  discount: number;
  taxable_amount: number;
  tax_type: TaxType;
  tax_percentage: number;
  tax_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  packing_charges: number;
  total_amount: number;
  terms_conditions: string;
  delivery_timeline: string;
  items: Array<{
    module: string | null;
    module_name: string;
    description: string;
    requirements: string;
    estimated_cost: number | null;
    estimated_days: number | null;
    priority: "LOW" | "MEDIUM" | "HIGH";
    remarks: string;
    amount: number;
  }>;
}

const num = (v: unknown) => (v == null || v === "" ? 0 : Number(v));

function mapQuotation(raw: Record<string, unknown>): Quotation {
  const opp = raw.opportunity;
  const oppObj = typeof opp === "object" && opp ? (opp as Record<string, unknown>) : null;
  const companyObj =
    typeof oppObj?.company === "object" && oppObj.company ? (oppObj.company as Record<string, unknown>) : null;
  const cityObj = typeof companyObj?.city === "object" && companyObj.city ? (companyObj.city as Record<string, unknown>) : null;
  const items = Array.isArray(raw.items) ? (raw.items as Record<string, unknown>[]) : [];
  const companyContacts = Array.isArray(raw.company_contacts)
    ? (raw.company_contacts as Record<string, unknown>[])
    : [];

  return {
    id: String(raw.id),
    quotationNumber: String(raw.quotation_number ?? ""),
    quotationDate: (raw.quotation_date as string | null) ?? null,
    foDate: (raw.fo_date as string | null) ?? (raw.quotation_date as string | null) ?? null,
    cpoDate: (raw.cpo_date as string | null) ?? null,
    cpoCreated: Boolean(raw.cpo_created),
    cpoDocument: (raw.cpo_document as string | null) ?? null,
    opportunity: String(oppObj ? oppObj.id : opp ?? ""),
    projectName: String(raw.project_name ?? ""),
    companyId: raw.company_id == null ? null : Number(raw.company_id),
    companyName: String(raw.company_name ?? oppObj?.company_name ?? companyObj?.name ?? ""),
    companyAddress: String(raw.company_address ?? ""),
    companyPincode: String(raw.company_pincode ?? ""),
    companyContacts: companyContacts.map((contact) => ({
      name: String(contact.name ?? ""),
      designation: String(contact.designation ?? ""),
      phone: String(contact.phone ?? ""),
      email: String(contact.email ?? ""),
      isPrimary: Boolean(contact.is_primary),
    })),
    city: String(raw.company_city ?? companyObj?.city_name ?? cityObj?.name ?? ""),
    state: String(raw.company_state ?? companyObj?.state_name ?? ""),
    status: String(raw.status ?? "DRAFT") as QuotationStatus,
    statusDisplay: String(raw.status_display ?? raw.status ?? ""),
    taxTypeDisplay: String(raw.tax_type_display ?? ""),
    subtotal: num(raw.subtotal),
    discount: num(raw.discount),
    taxableAmount: num(raw.taxable_amount),
    taxType: String(raw.tax_type ?? "") as TaxType,
    taxPercentage: num(raw.tax_percentage),
    taxAmount: num(raw.tax_amount),
    cgstAmount: num(raw.cgst_amount),
    sgstAmount: num(raw.sgst_amount),
    igstAmount: num(raw.igst_amount),
    packingCharges: num(raw.packing_charges),
    totalAmount: num(raw.total_amount),
    termsConditions: String(raw.terms_conditions ?? ""),
    deliveryTimeline: String(raw.delivery_timeline ?? ""),
    quotationPdf: (raw.quotation_pdf as string | null) ?? null,
    finalOfferGenerated: Boolean(raw.final_offer_generated),
    finalOfferPdf: (raw.final_offer_pdf as string | null) ?? null,
    items: items.map((it) => {
      const mod = it.module;
      const modObj = typeof mod === "object" && mod ? (mod as Record<string, unknown>) : null;
      return {
        id: it.id == null ? undefined : String(it.id),
        module: modObj ? String(modObj.id) : mod == null ? null : String(mod),
        moduleName: String(it.module_name ?? modObj?.module_name ?? ""),
        description: String(it.description ?? ""),
        requirements: String(it.requirements ?? ""),
        estimatedCost: it.estimated_cost == null ? null : Number(it.estimated_cost),
        estimatedDays: it.estimated_days == null ? null : Number(it.estimated_days),
        priority: String(it.priority ?? "MEDIUM") as "LOW" | "MEDIUM" | "HIGH",
        remarks: String(it.remarks ?? ""),
        amount: num(it.amount),
      };
    }),
  };
}

export async function getQuotations(): Promise<Quotation[]> {
  const list = await request<Record<string, unknown>[]>("/quotations/");
  return list.map(mapQuotation);
}

export async function getCpos(): Promise<Quotation[]> {
  const list = await request<Record<string, unknown>[]>(
    "/quotations/?cpo_created=true",
  );
  return list.map(mapQuotation);
}

export async function getNextQuotationNumber(): Promise<string> {
  const response = await request<{ quotation_number: string }>("/quotations/next-number/");
  return response.quotation_number;
}

export async function createQuotation(data: QuotationInput): Promise<Quotation> {
  return mapQuotation(
    await request<Record<string, unknown>>("/quotations/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  );
}

export async function updateQuotation(id: string, data: QuotationInput): Promise<Quotation> {
  return mapQuotation(await request<Record<string, unknown>>(`/quotations/${id}/`, { method: "PATCH", body: JSON.stringify(data) }));
}

export async function updateQuotationCpo(
  id: string,
  data: { cpo_created?: boolean; cpo_date?: string | null },
): Promise<Quotation> {
  return mapQuotation(
    await request<Record<string, unknown>>(`/quotations/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  );
}

function mapSalesOrder(raw: Record<string, unknown>): SalesOrder {
  const items = Array.isArray(raw.items) ? (raw.items as Record<string, unknown>[]) : [];
  const contacts = Array.isArray(raw.company_contacts)
    ? (raw.company_contacts as Record<string, unknown>[])
    : [];
  return {
    id: String(raw.id),
    soNumber: String(raw.so_number ?? ""),
    soDate: String(raw.so_date ?? ""),
    quotationId: String(raw.quotation ?? ""),
    quotationNumber: String(raw.quotation_number ?? ""),
    companyId: Number(raw.company ?? 0),
    companyName: String(raw.company_name ?? ""),
    companyAddress: String(raw.company_address ?? ""),
    companyCityId: raw.company_city == null ? null : Number(raw.company_city),
    companyCityName: String(raw.company_city_name ?? ""),
    companyStateId: raw.company_state == null ? null : Number(raw.company_state),
    companyStateName: String(raw.company_state_name ?? ""),
    companyCountryId: raw.company_country == null ? null : Number(raw.company_country),
    companyCountryName: String(raw.company_country_name ?? ""),
    companyPincode: String(raw.company_pincode ?? ""),
    companyGstNumber: String(raw.company_gst_number ?? ""),
    companyContacts: contacts.map((contact) => ({
      id: Number(contact.id),
      name: String(contact.name ?? ""),
      designation: String(contact.designation ?? ""),
      phone: String(contact.phone ?? ""),
      email: String(contact.email ?? ""),
      is_primary: Boolean(contact.is_primary),
    })),
    quotationPdf: (raw.quotation_pdf as string | null) ?? null,
    finalOfferPdf: (raw.final_offer_pdf as string | null) ?? null,
    cpoDocument: (raw.cpo_document as string | null) ?? null,
    soPdf: (raw.so_pdf as string | null) ?? null,
    createdByName: String(raw.created_by_name ?? ""),
    projectName: String(raw.project_name ?? ""),
    subtotal: num(raw.subtotal),
    discountPercentage: num(raw.discount_percentage),
    discountAmount: num(raw.discount_amount),
    taxableAmount: num(raw.taxable_amount),
    taxPercentage: num(raw.tax_percentage),
    taxAmount: num(raw.tax_amount),
    cgstAmount: num(raw.cgst_amount),
    sgstAmount: num(raw.sgst_amount),
    igstAmount: num(raw.igst_amount),
    packingCharges: num(raw.packing_charges),
    totalAmount: num(raw.total_amount),
    taxType: String(raw.tax_type ?? "") as TaxType,
    paymentTerms: String(raw.payment_terms ?? ""),
    deliveryTerms: String(raw.delivery_terms ?? ""),
    remarks: String(raw.remarks ?? ""),
    status: String(raw.status ?? "DRAFT"),
    items: items.map((item) => ({
      id: item.id == null ? undefined : String(item.id),
      module: item.module == null ? null : String(item.module),
      moduleName: String(item.module_name ?? ""),
      description: String(item.description ?? ""),
      requirements: String(item.requirements ?? ""),
      estimatedCost: item.estimated_cost == null ? null : Number(item.estimated_cost),
      estimatedDays: item.estimated_days == null ? null : Number(item.estimated_days),
      priority: String(item.priority ?? "MEDIUM") as QuotationItem["priority"],
      remarks: String(item.remarks ?? ""),
      amount: num(item.amount),
    })),
  };
}

export interface SalesOrderUpdate {
  so_number: string;
  so_date: string;
  payment_terms: string;
  delivery_terms: string;
  remarks: string;
  status: string;
}

export async function updateSalesOrder(id: string, data: SalesOrderUpdate): Promise<SalesOrder> {
  return mapSalesOrder(
    await request<Record<string, unknown>>(`/sales-orders/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  );
}

export async function createSalesOrder(
  quotationId: string,
): Promise<{ id: string; soNumber: string }> {
  const response = await request<{ id: number | string; so_number: string }>(
    `/create-sales/${quotationId}/`,
    { method: "POST" },
  );
  return { id: String(response.id), soNumber: response.so_number };
}

export async function getSalesOrders(): Promise<SalesOrder[]> {
  const response = await request<Record<string, unknown>[]>("/sales-orders/");
  return response.map(mapSalesOrder);
}

export async function attachCpoDocument(id: string, document: File): Promise<Quotation> {
  const formData = new FormData();
  formData.append("cpo_document", document);
  return mapQuotation(
    await request<Record<string, unknown>>(`/quotations/${id}/`, {
      method: "PATCH",
      body: formData,
    }),
  );
}

export async function deleteQuotation(id: string): Promise<void> {
  await request<void>(`/quotations/${id}/`, { method: "DELETE" });
}

export async function generateFinalOffer(id: string): Promise<Quotation> {
  return mapQuotation(await request<Record<string, unknown>>(`/quotations/${id}/generate-final-offer/`, { method: "POST" }));
}

export async function updateFinalOffer(
  id: string,
  data: {
    fo_date: string;
    items: Array<{
      module: string | null;
      module_name: string;
      description: string;
      requirements: string;
      estimated_cost: number | null;
      estimated_days: number | null;
      priority: "LOW" | "MEDIUM" | "HIGH";
      remarks: string;
      amount: number;
    }>;
  },
): Promise<Quotation> {
  return mapQuotation(await request<Record<string, unknown>>(`/quotations/${id}/final-offer/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }));
}

export async function getQuotationById(id: string): Promise<Quotation> {
  return mapQuotation(
    await request<Record<string, unknown>>(
      `/quotations/${id}/`
    )
  );
}
