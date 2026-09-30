import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/common/ComingSoon";

export const Route = createFileRoute("/sales/quotations")({
  head: () => ({
    meta: [
      { title: "Quotations — Vantage CRM" },
      { name: "description", content: "Create and send quotations to customers." },
      { property: "og:title", content: "Quotations — Vantage CRM" },
      { property: "og:description", content: "Create and send quotations to customers." },
    ],
  }),
  component: () => <ComingSoon eyebrow="SALES" title="Quotations" hint="Your quotations will appear here." />,
});
