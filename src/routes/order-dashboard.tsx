import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getOrderDashboard,
  type OrderDashboardFilters,
  type OrderDashboardPeriod,
} from "@/lib/order-dashboard-api";

export const Route = createFileRoute("/order-dashboard")({
  head: () => ({
    meta: [
      { title: "Order Dashboard — Vantage CRM" },
      { name: "description", content: "Track quotation-to-sales-order performance." },
    ],
  }),
  component: OrderDashboardPage,
});

const currentYear = new Date().getFullYear();
const initialFilters: OrderDashboardFilters = {
  period: "yearly",
  year: currentYear,
  quarter: 1,
  half: 1,
  start_date: `${currentYear}-01-01`,
  end_date: `${currentYear}-12-31`,
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function MetricCard({
  title,
  count,
  amount,
  loading,
}: {
  title: string;
  count: number | undefined;
  amount: number | undefined;
  loading: boolean;
}) {
  return (
    <section className="rounded-md border border-line bg-surface p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-2 font-display text-3xl font-bold tabular-nums">
        {loading ? "—" : (count ?? 0)}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">
        {loading ? " " : currency.format(amount ?? 0)}
      </div>
    </section>
  );
}

function OrderDashboardPage() {
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const dashboardQuery = useQuery({
    queryKey: ["order-dashboard", filters],
    queryFn: () => getOrderDashboard(filters),
  });
  const data = dashboardQuery.data;
  const summary = data?.summary;

  const updateDraft = <K extends keyof OrderDashboardFilters>(
    key: K,
    value: OrderDashboardFilters[K],
  ) => {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  };

  const applyFilters = () => {
    setFilters({ ...draftFilters, year: Number(draftFilters.year) });
  };

  const resetFilters = () => {
    const reset = { ...initialFilters, year: currentYear };
    setDraftFilters(reset);
    setFilters(reset);
  };

  const monthlyData = data?.monthly_history ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] tracking-wide text-muted-foreground">ORDERS</div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Order Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {data
              ? `${data.period} · ${data.start_date} to ${data.end_date}`
              : "Quotation through sales order"}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1 text-sm">
            <span className="block text-xs font-medium text-muted-foreground">Period</span>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={draftFilters.period}
              onChange={(event) =>
                updateDraft("period", event.target.value as OrderDashboardPeriod)
              }
            >
              <option value="yearly">Yearly</option>
              <option value="quarterly">Quarterly</option>
              <option value="half_yearly">Half-yearly</option>
              <option value="custom">Custom range</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="block text-xs font-medium text-muted-foreground">Year</span>
            <Input
              type="number"
              min={1}
              max={9998}
              className="w-28"
              value={draftFilters.year}
              onChange={(event) => updateDraft("year", Number(event.target.value))}
            />
          </label>
          {draftFilters.period === "quarterly" && (
            <label className="space-y-1 text-sm">
              <span className="block text-xs font-medium text-muted-foreground">Quarter</span>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={draftFilters.quarter}
                onChange={(event) => updateDraft("quarter", Number(event.target.value))}
              >
                {[1, 2, 3, 4].map((quarter) => (
                  <option key={quarter} value={quarter}>
                    Q{quarter}
                  </option>
                ))}
              </select>
            </label>
          )}
          {draftFilters.period === "half_yearly" && (
            <label className="space-y-1 text-sm">
              <span className="block text-xs font-medium text-muted-foreground">Half</span>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={draftFilters.half}
                onChange={(event) => updateDraft("half", Number(event.target.value))}
              >
                <option value={1}>First half</option>
                <option value={2}>Second half</option>
              </select>
            </label>
          )}
          {draftFilters.period === "custom" && (
            <>
              <label className="space-y-1 text-sm">
                <span className="block text-xs font-medium text-muted-foreground">Start date</span>
                <Input
                  type="date"
                  className="w-auto"
                  value={draftFilters.start_date ?? ""}
                  onChange={(event) => updateDraft("start_date", event.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="block text-xs font-medium text-muted-foreground">End date</span>
                <Input
                  type="date"
                  className="w-auto"
                  value={draftFilters.end_date ?? ""}
                  onChange={(event) => updateDraft("end_date", event.target.value)}
                />
              </label>
            </>
          )}
          <Button
            type="button"
            onClick={applyFilters}
            disabled={dashboardQuery.isFetching || !draftFilters.year}
          >
            Apply
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void dashboardQuery.refetch()}
            disabled={dashboardQuery.isFetching}
            aria-label="Refresh order dashboard"
          >
            <RefreshCw className={`size-4 ${dashboardQuery.isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button type="button" variant="outline" onClick={resetFilters}>
            Reset
          </Button>
        </div>
      </div>

      {dashboardQuery.isError && (
        <p role="alert" className="text-sm text-destructive">
          {dashboardQuery.error.message || "Could not load the order dashboard."}
        </p>
      )}

      <section aria-label="Order stages" className="space-y-3">
        <h2 className="font-semibold">Commercial stages</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Quotations"
            count={summary?.total_quotations}
            amount={summary?.quotations_amount}
            loading={dashboardQuery.isLoading}
          />
          <MetricCard
            title="Final offers"
            count={summary?.fo_generated}
            amount={summary?.fo_amount}
            loading={dashboardQuery.isLoading}
          />
          <MetricCard
            title="Customer POs"
            count={summary?.cpo_received}
            amount={summary?.cpo_amount}
            loading={dashboardQuery.isLoading}
          />
          <MetricCard
            title="Sales orders"
            count={summary?.total_so}
            amount={summary?.so_amount}
            loading={dashboardQuery.isLoading}
          />
        </div>
      </section>

      <section aria-label="Conversion rates" className="space-y-3">
        <h2 className="font-semibold">Conversion rates</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <ConversionCard
            title="Quotation → Final Offer"
            value={summary?.conversion_rates.quotation_to_fo}
            loading={dashboardQuery.isLoading}
          />
          <ConversionCard
            title="Quotation → Customer PO"
            value={summary?.conversion_rates.quotation_to_cpo}
            loading={dashboardQuery.isLoading}
          />
          <ConversionCard
            title="Customer PO → Sales Order"
            value={summary?.conversion_rates.cpo_to_sales_order}
            loading={dashboardQuery.isLoading}
          />
        </div>
      </section>

      <section className="rounded-md border border-line bg-surface p-4">
        <div className="mb-4">
          <h2 className="font-semibold">Monthly order pipeline</h2>
          <p className="mt-1 text-sm text-muted-foreground">Document counts by month</p>
        </div>
        <div className="h-[340px] w-full">
          {monthlyData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="quotations" name="Quotations" fill="#4f46e5" radius={[3, 3, 0, 0]} />
                <Bar dataKey="fo" name="Final offers" fill="#0f766e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="cpo" name="Customer POs" fill="#d97706" radius={[3, 3, 0, 0]} />
                <Bar dataKey="so" name="Sales orders" fill="#2563eb" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              {dashboardQuery.isLoading
                ? "Loading monthly history…"
                : "No order history for this period."}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ConversionCard({
  title,
  value,
  loading,
}: {
  title: string;
  value: number | undefined;
  loading: boolean;
}) {
  return (
    <section className="rounded-md border border-line bg-surface p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-2 font-display text-3xl font-bold tabular-nums">
        {loading ? "—" : `${value ?? 0}%`}
      </div>
    </section>
  );
}
