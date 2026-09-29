import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/email-campaign")({
  head: () => ({
    meta: [
      { title: "Email Campaign — Vantage CRM" },
      { name: "description", content: "Campaigns, email templates, sequences and logs in one place." },
      { property: "og:title", content: "Email Campaign — Vantage CRM" },
      { property: "og:description", content: "Campaigns, email templates, sequences and logs in one place." },
    ],
  }),
  component: EmailCampaignLayout,
});

const TABS = [
  { to: "/email-campaign/templates", label: "Templates" },
  { to: "/email-campaign/sequences", label: "Sequences" },
  { to: "/email-campaign/logs", label: "Email Logs" },
] as const;

const tabCls = "-mb-px border-b-2 px-4 py-2.5 text-sm transition-colors";
const activeCls = { className: "border-brand font-medium text-foreground" };
const inactiveCls = { className: "border-transparent text-muted-foreground hover:text-foreground" };

function EmailCampaignLayout() {
  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-line">
        <Link
          to="/email-campaign/campaigns"
          search={{ create: false }}
          className={tabCls}
          activeProps={activeCls}
          inactiveProps={inactiveCls}
        >
          Campaigns
        </Link>
        {TABS.map((t) => (
          <Link key={t.to} to={t.to} className={tabCls} activeProps={activeCls} inactiveProps={inactiveCls}>
            {t.label}
          </Link>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
