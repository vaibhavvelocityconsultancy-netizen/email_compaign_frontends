import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/marketing/email-campaign")({
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
  // { to: "/marketing/email-campaign/replies", label: "Incoming Replies" },
  { to: "/marketing/email-campaign/templates", label: "Templates" },
  { to: "/marketing/email-campaign/sequences", label: "Sequences" },
] as const;

const tabCls = "-mb-px border-b-2 px-4 py-2.5 text-sm transition-colors";
const activeCls = { className: "border-brand font-medium text-foreground" };
const inactiveCls = { className: "border-transparent text-muted-foreground hover:text-foreground" };

function EmailCampaignLayout() {
  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-line">
        <Link
          to="/marketing/email-campaign/campaigns"
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
