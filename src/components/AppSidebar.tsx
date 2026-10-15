import { Link, useRouterState } from "@tanstack/react-router";
import {
  BriefcaseBusiness,
  CalendarCheck2,
  ChevronDown,
  FileText,
  LayoutDashboard,
  ListChecks,
  Mail,
  UserRound,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

type MenuItem = {
  key: string;
  label: string;
  icon: React.ElementType;
  to?: string;
  items?: {
    to: string;
    label: string;
  }[];
};

const MENU_ITEMS: MenuItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, to: "/" },
  { key: "applications", label: "Applications", icon: BriefcaseBusiness, to: "/applications" },
  { key: "interviews", label: "Interview pipeline", icon: CalendarCheck2, to: "/interviews" },
  { key: "campaigns", label: "Job email campaigns", icon: Mail, to: "/marketing/email-campaign" },
  {
    key: "templates",
    label: "Email templates",
    icon: FileText,
    to: "/marketing/email-campaign/templates",
  },
  { key: "follow-ups", label: "Follow-ups", icon: ListChecks, to: "/follow-ups" },
  { key: "documents", label: "Resume & documents", icon: FileText, to: "/documents" },
  { key: "profile", label: "Profile & settings", icon: UserRound, to: "/user" },
];

export function AppSidebar() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);

  const isParentActive = (items?: readonly { to: string }[]) =>
    items?.some(({ to }) => isActive(to)) ?? false;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="h-16 justify-center border-b border-white/10 px-5 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-brand font-display text-lg font-bold text-white">
            V
          </div>

          <div className="leading-none group-data-[collapsible=icon]:hidden">
            <div className="font-display text-[15px] font-bold text-white">CareerOS</div>

            <div className="mt-1 font-mono text-[10px] text-white/40">JOB SEARCH</div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {MENU_ITEMS.map((item) => {
                const hasChildren = !!item.items && item.items.length > 0;

                // -------------------------
                // Normal menu item
                // -------------------------
                if (!hasChildren) {
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.label}
                        isActive={item.to ? isActive(item.to) : false}
                      >
                        <Link to={item.to ?? "/"}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                // -------------------------
                // Grouped menu item
                // -------------------------
                const parentActive = isParentActive(item.items);

                return (
                  <Collapsible
                    key={item.key}
                    defaultOpen={parentActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.label} isActive={parentActive}>
                          <item.icon />

                          <span>{item.label}</span>

                          <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items?.map((child) => (
                            <SidebarMenuSubItem key={child.to}>
                              <SidebarMenuSubButton asChild isActive={isActive(child.to)}>
                                <Link to={child.to}>{child.label}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
