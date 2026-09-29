import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/email-campaign/")({
  beforeLoad: () => {
    throw redirect({ to: "/email-campaign/campaigns", search: { create: false } });
  },
});
