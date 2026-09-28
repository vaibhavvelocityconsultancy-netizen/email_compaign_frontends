import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getBatches, getLeads, getEmailLogs, getSequences } from "../lib/mock-api";
import { StatCard } from "../components/common/StatCard";
import { StatusBadge } from "../components/common/StatusBadge";
import { EmptyState, LoadingRows } from "../components/common/EmptyState";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Vantage CRM" },
      { name: "description", content: "Campaign statistics and recent campaign activity." },
      { property: "og:title", content: "Dashboard — Vantage CRM" },
      { property: "og:description", content: "Campaign statistics and recent campaign activity." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const leads = useQuery({ queryKey: ["leads"], queryFn: getLeads });
  const campaigns = useQuery({ queryKey: ["campaigns"], queryFn: getBatches });
  const logs = useQuery({ queryKey: ["logs"], queryFn: getEmailLogs });
  const sequences = useQuery({ queryKey: ["sequences"], queryFn: getSequences });

  const seqName = (id: string) => sequences.data?.find((s) => s.id === id)?.name ?? "—";
  const activeCount = campaigns.data?.filter((c) => c.status === "active").length ?? 0;
  const sentTotal = campaigns.data?.reduce((n, c) => n + c.emailsSent, 0) ?? 0;
  const failedTotal = logs.data?.filter((l) => l.status === "failed").length ?? 0;
  const replyTotal = campaigns.data?.reduce((n, c) => n + c.replies, 0) ?? 0;
  const completedTotal = leads.data?.filter((l) => l.status === "completed").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="rise flex items-end justify-between">
        <div>
          <div className="font-mono text-[11px] tracking-wide text-muted-foreground">OVERVIEW</div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Campaign dashboard</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="TOTAL LEADS" value={leads.data?.length ?? "…"} sub="across all sources" delay={0} />
        <StatCard label="ACTIVE CAMPAIGNS" value={activeCount} sub={`${campaigns.data?.filter((c) => c.status === "paused").length ?? 0} paused`} delay={40} />
        <StatCard label="EMAILS SENT" value={sentTotal.toLocaleString()} sub="all campaigns" tone="good" delay={80} />
        <StatCard label="EMAILS FAILED" value={failedTotal} sub="delivery errors" tone="bad" delay={120} />
        <StatCard label="REPLIES" value={replyTotal.toLocaleString()} sub="from campaign leads" tone="good" delay={160} />
        <StatCard label="COMPLETED LEADS" value={completedTotal} sub="finished sequences" delay={200} />
      </div>

      <div className="rise overflow-hidden rounded-xl border border-line bg-surface" style={{ animationDelay: "240ms" }}>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-base font-semibold tracking-tight">Recent campaigns</h2>
            <span className="font-mono text-[11px] text-muted-foreground">{campaigns.data?.length ?? 0} total</span>
          </div>
          <Link
            to="/campaigns"
            className="h-8 rounded-md border border-line px-3 py-1.5 text-xs transition-colors hover:bg-background"
          >
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2.5 font-medium">Campaign</th>
                <th className="px-4 py-2.5 font-medium">Sequence</th>
                <th className="px-4 py-2.5 text-right font-medium">Leads</th>
                <th className="px-4 py-2.5 text-right font-medium">Emails Sent</th>
                <th className="px-4 py-2.5 text-right font-medium">Replies</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {campaigns.isLoading ? (
                <LoadingRows cols={7} />
              ) : !campaigns.data?.length ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState title="No campaigns yet" hint="Create your first campaign to start sending." />
                  </td>
                </tr>
              ) : (
                campaigns.data.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-background/60">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{seqName(c.sequenceId)}</td>
                    <td className="px-4 py-3 text-right font-mono text-[13px]">{c.leadIds.length}</td>
                    <td className="px-4 py-3 text-right font-mono text-[13px]">{c.emailsSent.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-[13px]">{c.replies}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/campaigns/$campaignId"
                        params={{ campaignId: c.id }}
                        className="text-xs font-medium text-brand hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
