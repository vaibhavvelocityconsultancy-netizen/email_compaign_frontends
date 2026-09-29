import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/common/ComingSoon";

export const Route = createFileRoute("/sales/")({
  head: () => ({
    meta: [
      { title: "Sales Dashboard — Vantage CRM" },
      { name: "description", content: "Overview of your sales pipeline, opportunities and quotations." },
      { property: "og:title", content: "Sales Dashboard — Vantage CRM" },
      { property: "og:description", content: "Overview of your sales pipeline, opportunities and quotations." },
    ],
  }),
  component: () => <ComingSoon eyebrow="SALES" title="Sales Dashboard" hint="Pipeline stats will appear here." />,
});
