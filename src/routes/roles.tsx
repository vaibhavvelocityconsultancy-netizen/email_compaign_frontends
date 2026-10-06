import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Plus, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/roles")({
  head: () => ({ meta: [{ title: "Roles — Vantage CRM" }] }),
  component: RolesPage,
});

const roles = [
  {
    name: "Administrator",
    description: "Full access to all workspace features and settings.",
    users: 2,
    permissions: "All permissions",
    system: true,
  },
  {
    name: "Marketing Manager",
    description: "Manage campaigns, leads, and marketing performance.",
    users: 4,
    permissions: "6 permissions",
    system: true,
  },
  {
    name: "Sales Manager",
    description: "Manage pipeline, quotations, and sales orders.",
    users: 3,
    permissions: "5 permissions",
    system: true,
  },
  {
    name: "Sales Representative",
    description: "Work assigned opportunities and customer records.",
    users: 12,
    permissions: "3 permissions",
    system: true,
  },
  {
    name: "Viewer",
    description: "Read-only access to shared workspace data.",
    users: 3,
    permissions: "2 permissions",
    system: true,
  },
];

function RolesPage() {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="font-mono text-[11px] tracking-wide text-muted-foreground">
            USER & ROLES
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold">Roles</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create reusable permission sets for your workspace.
          </p>
        </div>
        <Button>
          <Plus data-icon="inline-start" /> Create role
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.name} className="transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                  <ShieldCheck />
                </div>
                {role.system && <Badge variant="secondary">System role</Badge>}
              </div>
              <CardTitle className="pt-2">{role.name}</CardTitle>
              <CardDescription>{role.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between border-t pt-4 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Users /> {role.users} users
                </span>
                <Link
                  to="/access-control"
                  className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
                >
                  {role.permissions}
                  <ArrowRight />
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default RolesPage;
