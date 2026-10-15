import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
export const Route = createFileRoute("/documents")({ component: Documents });
const docs = [
  { name: "Product design resume", type: "Resume", updated: "Updated Oct 12", status: "Current" },
  {
    name: "Senior UX cover letter",
    type: "Cover letter",
    updated: "Updated Oct 09",
    status: "Draft",
  },
  {
    name: "Portfolio · 2026",
    type: "Portfolio link",
    updated: "Updated Sep 28",
    status: "Published",
  },
  {
    name: "Design systems case study",
    type: "Case study",
    updated: "Updated Sep 14",
    status: "Ready",
  },
];
function Documents() {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] tracking-wide text-muted-foreground">
            JOB SEARCH / LIBRARY
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold">Resume & documents</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A tidy home for the materials that support your next move.
          </p>
        </div>
        <Button>
          <Plus data-icon="inline-start" />
          Add document
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your library</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {docs.map((doc) => (
              <div key={doc.name} className="flex flex-wrap items-center gap-4 p-4">
                <div className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-[200px] flex-1">
                  <div className="font-semibold">{doc.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {doc.type} · {doc.updated}
                  </div>
                </div>
                <Badge variant={doc.status === "Current" ? "default" : "secondary"}>
                  {doc.status}
                </Badge>
                <Button variant="ghost" size="icon" aria-label={`Open ${doc.name}`}>
                  <ExternalLink className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
export default Documents;
