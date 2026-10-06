import { createFileRoute } from "@tanstack/react-router";
import { MoreHorizontal, Plus, Search, ShieldCheck, UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable, type Column } from "@/components/common/DataTable";

export const Route = createFileRoute("/user")({
  head: () => ({
    meta: [
      { title: "Users — Vantage CRM" },
      { name: "description", content: "Manage Vantage CRM users and roles." },
    ],
  }),
  component: UsersPage,
});

type User = {
  name: string;
  email: string;
  role: string;
  team: string;
  status: string;
  lastActive: string;
};
const users: User[] = [
  {
    name: "Aarav Mehta",
    email: "aarav@vantage.io",
    role: "Administrator",
    team: "Operations",
    status: "active",
    lastActive: "Just now",
  },
  {
    name: "Maya Patel",
    email: "maya@vantage.io",
    role: "Marketing Manager",
    team: "Marketing",
    status: "active",
    lastActive: "12 min ago",
  },
  {
    name: "Noah Williams",
    email: "noah@vantage.io",
    role: "Sales Manager",
    team: "Sales",
    status: "active",
    lastActive: "1 hour ago",
  },
  {
    name: "Sophia Chen",
    email: "sophia@vantage.io",
    role: "Sales Representative",
    team: "Sales",
    status: "pending",
    lastActive: "Invitation sent",
  },
  {
    name: "Liam Johnson",
    email: "liam@vantage.io",
    role: "Viewer",
    team: "Finance",
    status: "active",
    lastActive: "Yesterday",
  },
];

const columns: Column<User>[] = [
  {
    key: "name",
    header: "User",
    sortable: true,
    cell: (user) => (
      <div className="flex items-center gap-3">
        <Avatar className="size-9">
          <AvatarFallback className="bg-brand-soft text-xs font-semibold text-brand">
            {user.name
              .split(" ")
              .map((part) => part[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium">{user.name}</div>
          <div className="text-xs text-muted-foreground">{user.email}</div>
        </div>
      </div>
    ),
  },
  {
    key: "role",
    header: "Role",
    sortable: true,
    filterable: true,
    cell: (user) => (
      <Badge variant="outline" className="font-normal">
        {user.role}
      </Badge>
    ),
  },
  {
    key: "team",
    header: "Team",
    filterable: true,
    cell: (user) => <span className="text-sm">{user.team}</span>,
  },
  {
    key: "status",
    header: "Status",
    filterable: true,
    cell: (user) => <StatusBadge status={user.status} />,
  },
  {
    key: "lastActive",
    header: "Last active",
    cell: (user) => <span className="text-sm text-muted-foreground">{user.lastActive}</span>,
  },
  {
    key: "actions",
    header: "",
    cell: () => (
      <Button variant="ghost" size="icon" aria-label="More user actions">
        <MoreHorizontal />
      </Button>
    ),
  },
];

function UsersPage() {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="font-mono text-[11px] tracking-wide text-muted-foreground">
            USER & ROLES
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold">Users</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage people, roles, and workspace access.
          </p>
        </div>
        <Button>
          <Plus data-icon="inline-start" /> Invite user
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
              <UserRound />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">TOTAL USERS</p>
              <p className="font-display text-2xl font-bold">24</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-good/10 text-good">
              <ShieldCheck />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ACTIVE USERS</p>
              <p className="font-display text-2xl font-bold">21</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-warn/10 text-warn">
              <Search />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">PENDING INVITES</p>
              <p className="font-display text-2xl font-bold">3</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Workspace users</CardTitle>
              <CardDescription>Review account status and assigned roles.</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search users" aria-label="Search users" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={users}
            columns={columns}
            searchKeys={["name", "email", "role", "team"]}
            searchPlaceholder="Search users"
            pageSize={10}
            storageKey="vantage-users"
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default UsersPage;
