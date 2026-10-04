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

export interface Quotation {
  id: string;
  quotationNumber: string;
  quotationDate: string | null;
  foDate: string | null;
  opportunity: string;
  companyName: string;
  city: string;
  status: QuotationStatus;
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
  finalOfferGenerated: boolean;
  finalOfferPdf: string | null;
  items: QuotationItem[];
}

export interface QuotationInput {
  quotation_number: string;
  quotation_date: string | null;
  opportunity: string | null;
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

  return {
    id: String(raw.id),
    quotationNumber: String(raw.quotation_number ?? ""),
    quotationDate: (raw.quotation_date as string | null) ?? null,
    foDate: (raw.fo_date as string | null) ?? (raw.quotation_date as string | null) ?? null,
    opportunity: String(oppObj ? oppObj.id : opp ?? ""),
    companyName: String(raw.company_name ?? oppObj?.company_name ?? companyObj?.name ?? ""),
    city: String(companyObj?.city_name ?? cityObj?.name ?? ""),
    status: String(raw.status ?? "DRAFT") as QuotationStatus,
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

export async function createQuotation(data: QuotationInput): Promise<Quotation> {
  return mapQuotation(await request<Record<string, unknown>>("/quotations/", { method: "POST", body: JSON.stringify(data) }));
}

export async function updateQuotation(id: string, data: QuotationInput): Promise<Quotation> {
  return mapQuotation(await request<Record<string, unknown>>(`/quotations/${id}/`, { method: "PATCH", body: JSON.stringify(data) }));
}

export async function deleteQuotation(id: string): Promise<void> {
  await request<void>(`/quotations/${id}/`, { method: "DELETE" });
}

export async function generateFinalOffer(id: string): Promise<Quotation> {
  return mapQuotation(await request<Record<string, unknown>>(`/quotations/${id}/generate-final-offer/`, { method: "POST" }));
}
