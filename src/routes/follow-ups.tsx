import { createFileRoute } from "@tanstack/react-router";
import { Check, Circle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export const Route = createFileRoute("/follow-ups")({ component: FollowUps });
const items = [
  { label: "Send thank-you note to Northstar Labs", meta: "Today · Northstar Labs", done: false },
  { label: "Review Fieldnote case study prompt", meta: "Today · Fieldnote", done: false },
  { label: "Follow up with Orbit Health recruiter", meta: "Tomorrow · Orbit Health", done: false },
  { label: "Refresh product design portfolio", meta: "Completed yesterday", done: true },
];
function FollowUps() {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] tracking-wide text-muted-foreground">
            JOB SEARCH / MOMENTUM
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold">Follow-ups</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Small actions that keep your search moving forward.
          </p>
        </div>
        <Button>
          <Plus data-icon="inline-start" />
          Add follow-up
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">TODAY</div>
            <div className="mt-1 font-display text-3xl font-bold">2</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">UPCOMING</div>
            <div className="mt-1 font-display text-3xl font-bold">1</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">COMPLETED</div>
            <div className="mt-1 font-display text-3xl font-bold">18</div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>My action list</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {items.map((item) => (
              <div key={item.label} className="flex items-center gap-4 p-4">
                <div
                  className={`grid size-8 place-items-center rounded-full ${item.done ? "bg-good/15 text-good" : "border border-line text-muted-foreground"}`}
                >
                  {item.done ? <Check className="size-4" /> : <Circle className="size-4" />}
                </div>
                <div className="flex-1">
                  <div
                    className={
                      item.done
                        ? "text-sm text-muted-foreground line-through"
                        : "text-sm font-medium"
                    }
                  >
                    {item.label}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{item.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
export default FollowUps;
