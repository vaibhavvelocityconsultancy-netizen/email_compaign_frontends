import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Briefcase, Megaphone } from "lucide-react";
import { getBatches, getLeads, getEmailLogs } from "../lib/api";
import { StatCard } from "../components/common/StatCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Vantage CRM" },
      { name: "description", content: "Overall overview of marketing and sales in Vantage CRM." },
      { property: "og:title", content: "Dashboard — Vantage CRM" },
      { property: "og:description", content: "Overall overview of marketing and sales in Vantage CRM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const leads = useQuery({ queryKey: ["leads"], queryFn: getLeads });
  const campaigns = useQuery({ queryKey: ["campaigns"], queryFn: getBatches });
  const logs = useQuery({ queryKey: ["logs"], queryFn: getEmailLogs });

  return (
    <div className="space-y-8">
      <div className="rise">
        <div className="font-mono text-[11px] tracking-wide text-muted-foreground">OVERVIEW</div>
        <h1 className="mt-1 font-display text-3xl font-bold">Dashboard</h1>
      </div>

      <section aria-labelledby="marketing-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="marketing-heading" className="flex items-center gap-2 font-display text-lg font-semibold"><Megaphone className="size-5 text-brand" /> Marketing</h2>
          <Link to="/marketing" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">View dashboard <ArrowUpRight className="size-4" /></Link>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard label="TOTAL LEADS" value={leads.data?.length ?? "…"} sub="across all sources" />
          <StatCard label="ACTIVE CAMPAIGNS" value={campaigns.data?.filter((c) => c.status === "active").length ?? "…"} sub="currently running" delay={40} />
          <StatCard label="EMAILS DELIVERED" value={logs.data?.filter((l) => l.status === "delivered").length ?? "…"} sub="all campaigns" tone="good" delay={80} />
        </div>
      </section>

      <section aria-labelledby="sales-heading" className="border-t border-line pt-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="sales-heading" className="flex items-center gap-2 font-display text-lg font-semibold"><Briefcase className="size-5 text-brand" /> Sales</h2>
          <Link to="/sales" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">View dashboard <ArrowUpRight className="size-4" /></Link>
        </div>
        <p className="text-sm text-muted-foreground">Sales data isn’t connected yet. Opportunities and quotations will appear here when available.</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link to="/sales/opportunities" className="text-brand hover:underline">Opportunities <ArrowUpRight className="inline size-4" /></Link>
          <Link to="/sales/quotations" className="text-brand hover:underline">Quotations <ArrowUpRight className="inline size-4" /></Link>
        </div>
      </section>
    </div>
  );
}
