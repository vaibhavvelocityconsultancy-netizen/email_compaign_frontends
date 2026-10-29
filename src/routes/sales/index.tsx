import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, FileText, ShoppingCart, Target } from "lucide-react";

export const Route = createFileRoute("/sales/")({
  head: () => ({
    meta: [
      { title: "Sales Dashboard — Vantage CRM" },
      {
        name: "description",
        content: "Overview of sales opportunities and quotations in Vantage CRM.",
      },
      { property: "og:title", content: "Sales Dashboard — Vantage CRM" },
      {
        property: "og:description",
        content: "Overview of sales opportunities and quotations in Vantage CRM.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SalesDashboard,
});

function SalesDashboard() {
  return (
    <div className="space-y-6">
      <div className="rise rounded-2xl border border-line bg-surface/70 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] font-semibold tracking-[0.18em] text-brand">SALES WORKSPACE</div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Sales dashboard</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">Keep your pipeline, quotations, and orders moving from one focused workspace.</p>
          </div>
          <div className="rounded-full border border-line bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">Workspace overview</div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          to="/sales/opportunities"
          className="group flex items-center gap-4 rounded-md border border-line bg-surface p-4 transition-colors hover:border-brand"
        >
          <div className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-soft text-brand">
            <Target className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display font-semibold">Opportunities</div>
            <div className="text-xs text-muted-foreground">View sales pipeline</div>
          </div>
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand" />
        </Link>
        <Link
          to="/sales/quotations"
          className="group flex items-center gap-4 rounded-md border border-line bg-surface p-4 transition-colors hover:border-brand"
        >
          <div className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-soft text-brand">
            <FileText className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display font-semibold">Quotations</div>
            <div className="text-xs text-muted-foreground">View quotations</div>
          </div>
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand" />
        </Link>
        <Link
          to="/sales/orders"
          className="group flex items-center gap-4 rounded-md border border-line bg-surface p-4 transition-colors hover:border-brand"
        >
          <div className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-soft text-brand">
            <ShoppingCart className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display font-semibold">Sales Orders</div>
            <div className="text-xs text-muted-foreground">View created sales orders</div>
          </div>
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand" />
        </Link>
      </div>
    </div>
  );
}
