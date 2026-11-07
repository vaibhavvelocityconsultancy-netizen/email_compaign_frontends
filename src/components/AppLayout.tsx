import { Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Bell, Check, LogOut } from "lucide-react";
import { toast, Toaster } from "sonner";
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
import { getRecentEmailLogs, request, type EmailLog } from "@/lib/api";

interface CampaignNotification {
  id: string;
  title: string;
  message: string;
  sentAt: string;
}

export function AppLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<CampaignNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const seenLogIds = useRef<Set<string> | null>(null);
  const systemNotificationQuery = useQuery({
    queryKey: ["system-notification-count"],
    queryFn: () => request<{ unread_notifications: number }>("/auth/system-logs/?status=unread"),
    enabled: Boolean(user?.is_superuser),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
  const systemUnreadCount = systemNotificationQuery.data?.unread_notifications ?? 0;
  const totalUnreadCount = unreadCount + systemUnreadCount;
  const notificationQuery = useQuery({
    queryKey: ["email-notifications"],
    queryFn: getRecentEmailLogs,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "Account";
  const initials = displayName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

  useEffect(() => {
    const logs = notificationQuery.data;
    if (!logs) return;

    if (seenLogIds.current === null) {
      seenLogIds.current = new Set(logs.map((log) => log.id));
      return;
    }

    const newLogs = logs.filter((log) => !seenLogIds.current?.has(log.id));
    newLogs.forEach((log) => seenLogIds.current?.add(log.id));
    const campaignLogs = newLogs.filter((log) =>
      ["accepted", "sent", "delivered", "failed"].includes(log.status),
    );
    if (!campaignLogs.length) return;

    const newNotifications = campaignLogs.map((log) => ({
      id: log.id,
      title: log.status === "failed" ? "Campaign email failed" : "Campaign email sent",
      message: `${log.status === "failed" ? "Could not send" : "Sent"} step ${log.step} to lead #${log.leadId}${log.subject ? `: ${log.subject}` : ""}`,
      sentAt: log.sentAt,
    }));
    setNotifications((current) => [...newNotifications.reverse(), ...current].slice(0, 20));
    setUnreadCount((current) => current + newNotifications.length);

    if ("Notification" in window && window.Notification.permission === "granted") {
      campaignLogs.forEach((log) => {
        const title = log.status === "failed" ? "Campaign email failed" : "Campaign email sent";
        const message = `${log.status === "failed" ? "Could not send" : "Sent"} step ${log.step} to lead #${log.leadId}`;
        const browserNotification = new window.Notification(title, {
          body: message,
          tag: `email-campaign-${log.id}`,
        });
        browserNotification.onclick = () => {
          window.focus();
          void navigate({ to: "/marketing/email-campaign/logs" });
          browserNotification.close();
        };
      });
    }
  }, [navigate, notificationQuery.data]);

  const enableBrowserNotifications = async () => {
    if (!("Notification" in window)) {
      toast.error("Browser notifications are not supported here; in-app notifications will still appear.");
      return;
    }
    if (window.Notification.permission === "granted") {
      toast.success("Browser notifications are enabled.");
      return;
    }
    if (window.Notification.permission === "denied") {
      toast.error("Browser notifications are blocked. Allow them in your browser's site settings.");
      return;
    }

    const permission = await window.Notification.requestPermission();
    if (permission === "granted") {
      toast.success("Browser notifications enabled for campaign emails.");
    } else {
      toast.error("Browser notification permission was not granted.");
    }
  };

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
              <DropdownMenu onOpenChange={(open) => open && setUnreadCount(0)}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative size-10 rounded-full p-0 text-muted-foreground hover:bg-surface hover:text-foreground"
                    aria-label={`Open notifications${totalUnreadCount ? `, ${totalUnreadCount} unread` : ""}`}
                  >
                    <Bell className="size-[18px]" />
                    {totalUnreadCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white">
                        {totalUnreadCount > 9 ? "9+" : totalUnreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  {user?.is_superuser && systemUnreadCount > 0 && (
                    <DropdownMenuItem className="items-start whitespace-normal text-destructive" onClick={() => void navigate({ to: "/logs" })}>
                      <Bell data-icon="inline-start" className="mt-0.5" />
                      <span>{systemUnreadCount} persistent system error notification{systemUnreadCount === 1 ? "" : "s"}</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuLabel>Email campaign notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={enableBrowserNotifications}>
                    <Bell data-icon="inline-start" />
                    {typeof window !== "undefined" &&
                    "Notification" in window &&
                    window.Notification.permission === "granted"
                      ? "Browser alerts enabled"
                      : "Enable browser alerts"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {notificationQuery.isError && (
                    <DropdownMenuItem
                      className="whitespace-normal text-destructive"
                      onClick={() => void notificationQuery.refetch()}
                    >
                      {notificationQuery.error.message || "Could not check notifications. Click to retry."}
                    </DropdownMenuItem>
                  )}
                  {notifications.length ? notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="items-start whitespace-normal py-2"
                      onClick={() => void navigate({ to: "/marketing/email-campaign/logs" })}
                    >
                      <Check data-icon="inline-start" className="mt-0.5" />
                      <span className="grid gap-1">
                        <span className="font-medium">{notification.title}</span>
                        <span className="text-xs text-muted-foreground">{notification.message}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(notification.sentAt).toLocaleString()}
                        </span>
                      </span>
                    </DropdownMenuItem>
                  )) : (
                    <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                      No new campaign email notifications.
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
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
