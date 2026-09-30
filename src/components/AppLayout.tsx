import { Outlet, useNavigate } from "@tanstack/react-router";
import { LogOut, User } from "lucide-react";
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
          <header className="sticky top-0 z-10 flex h-[74px] items-center gap-5 border-b border-line bg-background/95 px-7 backdrop-blur">
            <SidebarTrigger className="size-7 rounded-md text-foreground hover:bg-surface" />
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-[14px] bg-brand font-display text-xl font-bold text-white">
                V
              </div>
              <div className="hidden leading-none sm:block">
                <div className="font-display text-sm font-bold text-foreground">Vantage</div>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground">CRM · OPS</div>
              </div>
            </div>
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
