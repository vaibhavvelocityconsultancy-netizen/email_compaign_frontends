import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "../components/common/StatCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — CareerOS" },
      {
        name: "description",
        content: "Your focused workspace for finding the next right opportunity.",
      },
    ],
  }),
  component: Dashboard,
});
const recent = [
  { company: "Northstar Labs", role: "Product Designer", status: "Interview" },
  { company: "Fieldnote", role: "Senior UX Designer", status: "Applied" },
  { company: "Orbit Health", role: "Design Systems Lead", status: "Screening" },
];
function Dashboard() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] tracking-wide text-muted-foreground">
            WEDNESDAY, OCTOBER 15, 2026
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold">Good morning, Alex.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A clear view of your search, so you can focus on the next best move.
          </p>
        </div>
        <Button asChild>
          <Link to="/applications">
            <Plus data-icon="inline-start" />
            Add application
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="TOTAL APPLICATIONS" value="24" sub="3 added this month" />
        <StatCard
          label="ACTIVE PROCESSES"
          value="8"
          sub="across 6 companies"
          tone="good"
          delay={40}
        />
        <StatCard label="UPCOMING INTERVIEWS" value="4" sub="next one today" delay={80} />
        <StatCard label="FOLLOW-UPS DUE" value="2" sub="keep momentum" tone="warn" delay={120} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent applications</CardTitle>
            <Link to="/applications" className="text-sm font-medium text-brand hover:underline">
              View all <ArrowUpRight className="inline size-4" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recent.map((item) => (
                <div key={item.company} className="flex items-center gap-3 p-4">
                  <div className="grid size-9 place-items-center rounded-lg bg-brand-soft text-brand">
                    <BriefcaseBusiness className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{item.role}</div>
                    <div className="text-xs text-muted-foreground">{item.company}</div>
                  </div>
                  <Badge variant={item.status === "Interview" ? "default" : "secondary"}>
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s focus</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Link
              to="/interviews"
              className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50"
            >
              <CalendarCheck2 className="mt-0.5 size-4 text-brand" />
              <span className="text-sm">
                <strong>Portfolio review</strong>
                <span className="block text-muted-foreground">Northstar Labs · 2:00 PM</span>
              </span>
            </Link>
            <Link
              to="/follow-ups"
              className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50"
            >
              <Clock3 className="mt-0.5 size-4 text-warn" />
              <span className="text-sm">
                <strong>Send thank-you note</strong>
                <span className="block text-muted-foreground">Due by end of day</span>
              </span>
            </Link>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="size-4 text-good" />
              You&apos;ve completed 18 follow-ups this month
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
export default Dashboard;
