import { request } from "@/lib/api";

export type OrderDashboardPeriod = "yearly" | "quarterly" | "half_yearly" | "custom";

export interface OrderDashboardFilters {
  period: OrderDashboardPeriod;
  year: number;
  quarter?: number;
  half?: number;
  start_date?: string;
  end_date?: string;
}

export interface OrderDashboardSummary {
  total_quotations: number;
  quotations_amount: number;
  fo_generated: number;
  fo_amount: number;
  cpo_received: number;
  cpo_amount: number;
  total_so: number;
  so_amount: number;
  conversion_rates: {
    quotation_to_fo: number;
    quotation_to_cpo: number;
    cpo_to_sales_order: number;
  };
}

export interface OrderDashboardMonth {
  month: string;
  quotations: number;
  quotations_amount: number;
  fo: number;
  fo_amount: number;
  cpo: number;
  cpo_amount: number;
  so: number;
  so_amount: number;
}

export interface OrderDashboard {
  period: string;
  start_date: string;
  end_date: string;
  summary: OrderDashboardSummary;
  monthly_history: OrderDashboardMonth[];
}

export function getOrderDashboard(filters: OrderDashboardFilters): Promise<OrderDashboard> {
  const params = new URLSearchParams({
    period: filters.period,
    year: String(filters.year),
  });
  if (filters.quarter !== undefined) params.set("quarter", String(filters.quarter));
  if (filters.half !== undefined) params.set("half", String(filters.half));
  if (filters.start_date) params.set("start_date", filters.start_date);
  if (filters.end_date) params.set("end_date", filters.end_date);
  return request<OrderDashboard>(`/order-dashboard/?${params.toString()}`);
}
