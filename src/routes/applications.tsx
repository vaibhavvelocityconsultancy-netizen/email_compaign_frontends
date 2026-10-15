import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/applications")({ component: Applications });

const applications = [
  {
    company: "Northstar Labs",
    role: "Product Designer",
    location: "Remote · US",
    date: "Oct 14, 2026",
    status: "Interview",
    source: "Referral",
  },
  {
    company: "Fieldnote",
    role: "Senior UX Designer",
    location: "New York, NY",
    date: "Oct 11, 2026",
    status: "Applied",
    source: "Company site",
  },
  {
    company: "Orbit Health",
    role: "Design Systems Lead",
    location: "Remote · US",
    date: "Oct 08, 2026",
    status: "Screening",
    source: "LinkedIn",
  },
  {
    company: "Monument",
    role: "Product Designer",
    location: "Austin, TX",
    date: "Oct 03, 2026",
    status: "Saved",
    source: "Job board",
  },
];

function statusTone(status: string) {
  return status === "Interview"
    ? "default"
    : status === "Screening"
      ? "secondary"
      : status === "Applied"
        ? "outline"
        : "muted";
}

function Applications() {
  const [query, setQuery] = useState("");
  const visible = useMemo(
    () =>
      applications.filter((item) =>
        `${item.company} ${item.role}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] tracking-wide text-muted-foreground">
            JOB SEARCH / TRACKER
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold">Job applications</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Keep every opportunity, contact, and next step in one place.
          </p>
        </div>
        <Button>
          <Plus data-icon="inline-start" />
          Add application
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["24", "Total tracked"],
          ["8", "Active this month"],
          ["4", "In interview"],
          ["3", "Offers"],
        ].map(([value, label]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="font-display text-2xl font-bold">{value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-3 border-b p-4">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search companies or roles"
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <SlidersHorizontal data-icon="inline-start" />
              Filters
            </Button>
          </div>
          <div className="divide-y">
            {visible.map((item) => (
              <div
                key={`${item.company}-${item.role}`}
                className="flex flex-wrap items-center gap-4 p-4 transition-colors hover:bg-muted/40"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                  <BriefcaseBusiness className="size-5" />
                </div>
                <div className="min-w-[180px] flex-1">
                  <div className="font-semibold">{item.role}</div>
                  <div className="text-sm text-muted-foreground">{item.company}</div>
                </div>
                <div className="hidden min-w-[150px] items-center gap-2 text-sm text-muted-foreground md:flex">
                  <MapPin className="size-4" />
                  {item.location}
                </div>
                <div className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
                  <CalendarDays className="size-4" />
                  {item.date}
                </div>
                <Badge
                  variant={statusTone(item.status) as "default" | "secondary" | "outline" | "muted"}
                >
                  {item.status}
                </Badge>
              </div>
            ))}
            {visible.length === 0 && (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No applications match your search.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Applications;
