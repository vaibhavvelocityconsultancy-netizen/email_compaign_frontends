import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/marketing/email-campaign/")({
  beforeLoad: () => {
    throw redirect({ to: "/marketing/email-campaign/campaigns", search: { create: false } });
  },
});
