import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Users, Mail, ListOrdered, Megaphone, ScrollText, Search, Plus } from "lucide-react";
import { Toaster } from "sonner";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/templates", label: "Email Templates", icon: Mail },
  { to: "/sequences", label: "Sequences", icon: ListOrdered },
  { to: "/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/email-logs", label: "Email Logs", icon: ScrollText },
] as const;

export function AppLayout() {
  const navigate = useNavigate();
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
        <nav className="space-y-0.5 px-3 py-4 text-sm">
          {NAV.map(({ to, label, icon: Icon, ...rest }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: "exact" in rest }}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-white/5"
              activeProps={{ className: "bg-white/10 text-white font-medium" }}
              inactiveProps={{ className: "text-white/70" }}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto p-3">
          <div className="rounded-xl bg-white/5 p-3">
            <div className="font-mono text-[10px] text-white/40">MONTH TO DATE</div>
            <div className="mt-1 font-display text-xl font-bold text-white">48,210</div>
            <div className="mt-0.5 font-mono text-[11px] text-good">+12.4% vs last</div>
          </div>
        </div>
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
          <div className="hidden items-center gap-2 font-mono text-[11px] text-muted-foreground md:flex">
            <span className="size-2 rounded-full bg-good" /> All systems normal
          </div>
          <button
            onClick={() => navigate({ to: "/campaigns", search: { create: true } })}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand/90"
          >
            <Plus className="size-4" /> New campaign
          </button>
          <div className="grid size-9 place-items-center rounded-full bg-brand-soft font-display text-sm font-bold text-brand">AR</div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
