import { Outlet, useNavigate } from "@tanstack/react-router";
import { Bell, LogOut } from "lucide-react";
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
import { useAuth } from "@/lib/auth";

export function AppLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "Account";
  const initials = displayName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex min-h-screen bg-background font-body text-foreground antialiased">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <header className="sticky top-0 z-10 flex h-[74px] items-center justify-between border-b border-line bg-background/95 px-5 backdrop-blur sm:px-7">
            <div className="flex min-w-0 items-center gap-4">
              <SidebarTrigger className="size-8 shrink-0 rounded-md text-foreground hover:bg-surface" />
              <div className="h-7 w-px bg-line" aria-hidden="true" />
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-brand font-display text-xl font-bold text-white shadow-sm">
                  V
                </div>
                <div className="hidden min-w-0 leading-none sm:block">
                  <div className="truncate font-display text-sm font-bold tracking-tight text-foreground">Vantage</div>
                  <div className="mt-1 font-mono text-[10px] font-medium tracking-[0.16em] text-muted-foreground">CRM · OPS</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="relative size-10 rounded-full p-0 text-muted-foreground hover:bg-surface hover:text-foreground"
                aria-label="Open notifications"
              >
                <Bell className="size-[18px]" />
                <span className="absolute right-2 top-2 size-1.5 rounded-full bg-brand" aria-hidden="true" />
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
                      {initials || "A"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-medium">{displayName}</div>
                  <div className="text-xs font-normal text-muted-foreground">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  void logout();
                  navigate({ to: "/login" });
                }}>
                  <LogOut data-icon="inline-start" />
                  Sign out
                </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
