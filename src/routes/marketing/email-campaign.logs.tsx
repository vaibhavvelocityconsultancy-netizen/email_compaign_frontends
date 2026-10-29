import { ModuleHero } from "@/components/ModuleHero";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { getBatches, getEmailLogs, getLeads, type LogStatus } from "@/lib/api";

export const Route = createFileRoute("/marketing/email-campaign/logs")({
  head: () => ({
    meta: [
      { title: "Email Logs — Vantage CRM" },
      { name: "description", content: "Track all outgoing campaign emails and delivery statuses." },
    ],
  }),
  component: EmailLogsPage,
});

type LogRow = {
  id: string;
  batchId: string;
  batchName: string;
  leadId: string;
  leadName: string;
  subject: string;
  status: LogStatus;
  step: number;
  sentAt: string;
  templateName: string;
};

function EmailLogsPage() {
  const campaignsQuery = useQuery({ queryKey: ["campaigns"], queryFn: getBatches });
  const leadsQuery = useQuery({ queryKey: ["leads"], queryFn: getLeads });
  const logsQuery = useQuery({ queryKey: ["logs"], queryFn: getEmailLogs });

  const rows = useMemo<LogRow[]>(() => {
    const batchMap = new Map((campaignsQuery.data ?? []).map((campaign) => [campaign.id, campaign.name]));
    const leadMap = new Map((leadsQuery.data ?? []).map((lead) => [lead.id, `Enquiry #${lead.srNo} · ${lead.enquiryFor}`]));

    return (logsQuery.data ?? []).map((log) => ({
      id: log.id,
      batchId: log.batchId,
      batchName: batchMap.get(log.batchId) ?? "Unknown campaign",
      leadId: log.leadId,
      leadName: leadMap.get(log.leadId) ?? "Unknown lead",
      subject: log.subject,
      status: log.status,
      step: log.step,
      sentAt: log.sentAt,
      templateName: log.templateName || "—",
    }));
  }, [campaignsQuery.data, leadsQuery.data, logsQuery.data]);

  const columns = useMemo<Column<LogRow>[]>(
    () => [
      {
        key: "batchName",
        header: "Campaign",
        cell: (row) => <span className="font-medium">{row.batchName}</span>,
      },
      {
        key: "leadName",
        header: "Lead",
        cell: (row) => <span className="text-muted-foreground">{row.leadName}</span>,
      },
      {
        key: "subject",
        header: "Subject",
        cell: (row) => <span className="text-muted-foreground">{row.subject}</span>,
      },
      {
        key: "templateName",
        header: "Template",
        cell: (row) => <span className="font-mono text-[11px]">{row.templateName}</span>,
      },
      {
        key: "step",
        header: "Step",
        cell: (row) => <span className="font-mono text-[11px]">#{row.step}</span>,
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: "sentAt",
        header: "Sent At",
        filterType: "date",
        filterValue: (row) => row.sentAt,
        cell: (row) => (
          <span className="font-mono text-[11px] text-muted-foreground">
            {new Date(row.sentAt).toLocaleString()}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="rise flex flex-wrap items-end justify-between gap-3 rounded-xl border border-line bg-card/60 p-5 shadow-sm">
        <div>
          <div className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground">COMMUNICATION</div>
          <ModuleHero eyebrow="Delivery activity" title="Email Logs" description="Understand delivery, opens, clicks, and failures across your outreach." icon={<span aria-hidden="true">•</span>} />
          <p className="mt-2 text-sm text-muted-foreground">Review delivery activity, recipients, and campaign performance.</p>
        </div>
        <div className="rounded-lg border border-line bg-background/60 px-3 py-2 text-right">
          <div className="font-mono text-lg font-semibold">{rows.length}</div>
          <div className="text-[11px] text-muted-foreground">messages tracked</div>
        </div>
      </div>

      <div className="rise" style={{ animationDelay: "80ms" }}>
        <DataTable<LogRow>
          data={rows}
          columns={columns}
          searchKeys={["batchName", "leadName", "subject", "templateName"]}
          searchPlaceholder="Search logs..."
          storageKey="email-logs"
          emptyMessage={logsQuery.isLoading ? "Loading email logs…" : "No emails have been sent yet."}
        />
      </div>
    </div>
  );
}
