import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Mail,
  Megaphone,
  Search,
  Plus,
  ChevronDown,
  Briefcase,
  Target,
  FileText,
} from "lucide-react";
import { Toaster } from "sonner";

const GROUPS = [
  {
    key: "marketing",
    label: "Marketing",
    icon: Megaphone,
    prefixes: ["/", "/leads", "/email-campaign"],
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { to: "/leads", label: "Leads", icon: Users, exact: false },
      { to: "/email-campaign", label: "Email Campaign", icon: Mail, exact: false },
    ],
  },
  {
    key: "sales",
    label: "Sales",
    icon: Briefcase,
    prefixes: ["/sales"],
    items: [
      { to: "/sales", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { to: "/sales/opportunities", label: "Opportunity", icon: Target, exact: false },
      { to: "/sales/quotations", label: "Quotation", icon: FileText, exact: false },
    ],
  },
] as const;

export function AppLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeGroup = pathname.startsWith("/sales") ? "sales" : "marketing";
  const [open, setOpen] = useState<Record<string, boolean>>({ [activeGroup]: true });

  return (
    <div className="flex min-h-screen bg-background font-body text-foreground antialiased">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-60 shrink-0 flex-col bg-ink text-white/85">
        <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
          <div className="grid size-8 place-items-center rounded-lg bg-brand font-display text-lg font-bold text-white">V</div>
          <div className="leading-none">
            <div className="font-display text-[15px] font-bold tracking-tight text-white">Vantage</div>
            <div className="mt-1 font-mono text-[10px] text-white/40">CRM · OPS</div>
          </div>
        </div>
        <nav className="space-y-2 px-3 py-4 text-sm">
          {GROUPS.map((g) => {
            const isOpen = open[g.key] ?? false;
            const GIcon = g.icon;
            return (
              <div key={g.key}>
                <button
                  onClick={() => setOpen((o) => ({ ...o, [g.key]: !isOpen }))}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium transition-colors hover:bg-white/5 ${
                    activeGroup === g.key ? "text-white" : "text-white/70"
                  }`}
                  aria-expanded={isOpen}
                >
                  <GIcon className="size-4" />
                  <span className="flex-1">{g.label}</span>
                  <ChevronDown className={`size-4 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                </button>
                {isOpen && (
                  <div className="mt-0.5 ml-4 space-y-0.5 border-l border-white/10 pl-2">
                    {g.items.map(({ to, label, icon: Icon, exact }) => (
                      <Link
                        key={to}
                        to={to}
                        activeOptions={{ exact }}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-white/5"
                        activeProps={{ className: "bg-white/10 text-white font-medium" }}
                        inactiveProps={{ className: "text-white/70" }}
                      >
                        <Icon className="size-4" />
                        {label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="ml-60 flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-line bg-background/90 px-6 backdrop-blur">
          <div className="max-w-md flex-1">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-full rounded-lg border border-line bg-surface py-2 pr-3 pl-9 text-sm placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
                placeholder="Search leads, campaigns, templates…"
              />
            </div>
          </div>
          <button
            onClick={() => navigate({ to: "/email-campaign/campaigns", search: { create: true } })}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand/90"
          >
            <Plus className="size-4" /> New campaign
          </button>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
