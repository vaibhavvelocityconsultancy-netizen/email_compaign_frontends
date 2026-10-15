import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Clock3, MapPin, Plus, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/interviews")({ component: Interviews });
const rounds = [
  {
    company: "Northstar Labs",
    role: "Product Designer",
    round: "Portfolio review",
    date: "Today · 2:00 PM",
    mode: "Video call",
    tone: "default",
  },
  {
    company: "Orbit Health",
    role: "Design Systems Lead",
    round: "Hiring manager",
    date: "Tomorrow · 11:30 AM",
    mode: "Video call",
    tone: "secondary",
  },
  {
    company: "Fieldnote",
    role: "Senior UX Designer",
    round: "Recruiter screen",
    date: "Oct 20 · 4:00 PM",
    mode: "Phone",
    tone: "outline",
  },
];
function Interviews() {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] tracking-wide text-muted-foreground">
            JOB SEARCH / PIPELINE
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold">Interview pipeline</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Stay ready for every conversation and keep momentum moving.
          </p>
        </div>
        <Button>
          <Plus data-icon="inline-start" />
          Log interview
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Next up</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-bold">2h 14m</div>
            <div className="mt-1 text-sm">Northstar Labs · Portfolio review</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Active processes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-bold">4</div>
            <div className="mt-1 text-sm text-muted-foreground">Across 3 companies</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Preparation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-bold">82%</div>
            <div className="mt-1 text-sm text-muted-foreground">Your weekly readiness</div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Upcoming rounds</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {rounds.map((item) => (
              <div
                key={`${item.company}-${item.round}`}
                className="flex flex-wrap items-center gap-4 p-4"
              >
                <div className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                  <CalendarDays className="size-5" />
                </div>
                <div className="min-w-[200px] flex-1">
                  <div className="font-semibold">{item.round}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.company} · {item.role}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock3 className="size-4" />
                  {item.date}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Video className="size-4" />
                  {item.mode}
                </div>
                <Badge variant={item.tone as "default" | "secondary" | "outline"}>
                  {item.tone === "default" ? "Prepare" : "Scheduled"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
export default Interviews;
