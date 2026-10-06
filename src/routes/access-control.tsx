import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronDown, LockKeyhole, Shield, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/access-control")({
  head: () => ({
    meta: [
      { title: "Access Control — Vantage CRM" },
      { name: "description", content: "Configure role permissions in Vantage CRM." },
    ],
  }),
  component: AccessControlPage,
});

const permissions = [
  {
    label: "View dashboard",
    description: "See workspace overview and performance metrics.",
    values: [true, true, true, true],
  },
  {
    label: "Manage users",
    description: "Invite, edit, suspend, and remove workspace users.",
    values: [true, false, false, false],
  },
  {
    label: "Manage campaigns",
    description: "Create and edit marketing campaigns and sequences.",
    values: [true, true, false, false],
  },
  {
    label: "View sales pipeline",
    description: "Access opportunities, quotations, and order data.",
    values: [true, false, true, true],
  },
  {
    label: "Edit sales pipeline",
    description: "Create and update sales records and stages.",
    values: [true, false, true, false],
  },
  {
    label: "Export data",
    description: "Download workspace records and reports.",
    values: [true, true, true, false],
  },
];

function AccessControlPage() {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="font-mono text-[11px] tracking-wide text-muted-foreground">
            USER & ROLES
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold">Access control</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Define what each role can see and do across Vantage.
          </p>
        </div>
        <Button>Save changes</Button>
      </div>
      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Roles</CardTitle>
            <CardDescription>Choose a role to configure.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <RoleButton icon={Shield} label="Administrator" count="Full access" active />
            <RoleButton icon={Users} label="Marketing Manager" count="6 permissions" />
            <RoleButton icon={Users} label="Sales Manager" count="5 permissions" />
            <RoleButton icon={Users} label="Sales Representative" count="3 permissions" />
            <RoleButton icon={LockKeyhole} label="Viewer" count="2 permissions" />
            <Separator className="my-2" />
            <Button variant="outline" className="justify-start">
              + Create custom role
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>Administrator</CardTitle>
                  <Badge>System role</Badge>
                </div>
                <CardDescription className="mt-1">
                  Full access to every workspace area and setting.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                Duplicate role
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[620px]">
                <div className="grid grid-cols-[minmax(250px,1fr)_repeat(4,92px)] items-center border-b bg-muted/30 px-4 py-3 text-xs font-medium text-muted-foreground">
                  <span>Permission</span>
                  <span className="text-center">Admin</span>
                  <span className="text-center">Marketing</span>
                  <span className="text-center">Sales</span>
                  <span className="text-center">Viewer</span>
                </div>
                {permissions.map((permission) => (
                  <div
                    key={permission.label}
                    className="grid grid-cols-[minmax(250px,1fr)_repeat(4,92px)] items-center border-b px-4 py-4 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{permission.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{permission.description}</p>
                    </div>
                    {permission.values.map((enabled, index) => (
                      <div key={`${permission.label}-${index}`} className="flex justify-center">
                        {enabled ? (
                          <span
                            className="grid size-7 place-items-center rounded-full bg-good/10 text-good"
                            aria-label="Enabled"
                          >
                            <Check />
                          </span>
                        ) : (
                          <Switch checked={false} aria-label={`${permission.label} disabled`} />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between rounded-lg bg-brand-soft px-4 py-3 text-sm">
              <span>
                <strong>4 roles</strong> share this permission policy
              </span>
              <Button variant="ghost" size="sm">
                View audit log <ChevronDown data-icon="inline-end" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RoleButton({
  icon: Icon,
  label,
  count,
  active = false,
}: {
  icon: typeof Shield;
  label: string;
  count: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${active ? "bg-brand-soft text-brand" : "hover:bg-muted"}`}
    >
      <Icon />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{count}</span>
      </span>
      {active && <span className="size-2 rounded-full bg-brand" aria-hidden="true" />}
    </button>
  );
}

export default AccessControlPage;
