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
  { to: "/email-campaign/campaigns", label: "Campaigns", search: { create: false } },
  { to: "/email-campaign/templates", label: "Templates" },
  { to: "/email-campaign/sequences", label: "Sequences" },
  { to: "/email-campaign/logs", label: "Email Logs" },
] as const;

function EmailCampaignLayout() {
  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            search={"search" in t ? t.search : undefined}
            className="-mb-px border-b-2 px-4 py-2.5 text-sm transition-colors"
            activeProps={{ className: "border-brand font-medium text-foreground" }}
            inactiveProps={{ className: "border-transparent text-muted-foreground hover:text-foreground" }}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
