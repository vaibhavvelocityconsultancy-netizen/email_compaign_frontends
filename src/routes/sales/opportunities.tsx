import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/common/ComingSoon";

export const Route = createFileRoute("/sales/opportunities")({
  head: () => ({
    meta: [
      { title: "Opportunities — Vantage CRM" },
      { name: "description", content: "Track and manage sales opportunities." },
      { property: "og:title", content: "Opportunities — Vantage CRM" },
      { property: "og:description", content: "Track and manage sales opportunities." },
    ],
  }),
  component: () => <ComingSoon eyebrow="SALES" title="Opportunities" hint="Your opportunities list will appear here." />,
});
