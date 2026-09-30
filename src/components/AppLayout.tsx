import { Outlet, useNavigate } from "@tanstack/react-router";
import { LogOut, Plus, Search, User } from "lucide-react";
import { Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/AppSidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export function AppLayout() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-background font-body text-foreground antialiased">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-line bg-background/90 px-6 backdrop-blur">
            <SidebarTrigger />
            <div className="flex items-center gap-2.5 pr-2">
              <div className="grid size-8 place-items-center rounded-lg bg-brand font-display text-lg font-bold text-white">
                V
              </div>
              <div className="hidden leading-none sm:block">
                <div className="font-display text-sm font-bold text-foreground">Vantage</div>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground">CRM · OPS</div>
              </div>
            </div>
            <div className="max-w-md flex-1">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="w-full rounded-lg border border-line bg-surface py-2 pr-3 pl-9 text-sm placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
                  placeholder="Search leads, campaigns, templates…"
                />
              </div>
            </div>
            <Button
              onClick={() =>
                navigate({ to: "/email-campaign/campaigns", search: { create: true } })
              }
              className="bg-brand text-primary-foreground hover:bg-brand/90"
            >
              <Plus className="size-4" /> New campaign
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="size-10 rounded-full p-0 hover:bg-surface"
                  aria-label="Open profile menu"
                >
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-brand/15 text-sm font-semibold text-brand">
                      <User className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-medium">Vantage user</div>
                  <div className="text-xs font-normal text-muted-foreground">Account settings</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/" })}>
                  <LogOut data-icon="inline-start" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </SidebarInset>
        <Toaster position="bottom-right" richColors />
      </SidebarProvider>
    </div>
  );
}
