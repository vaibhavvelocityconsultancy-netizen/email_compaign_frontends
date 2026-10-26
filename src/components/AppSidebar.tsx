import { Link, useRouterState } from "@tanstack/react-router";
import {
  Briefcase,
  ChevronDown,
  ClipboardList,
  Database,
  LayoutDashboard,
  ShieldCheck,
  ListChecks,
  Megaphone,
  ShoppingCart,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/lib/auth";
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
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    to: "/",
  },

  {
    key: "marketing",
    label: "Marketing",
    icon: Megaphone,
    items: [
      {
        to: "/marketing",
        label: "Marketing Dashboard",
      },
      {
        to: "/marketing/leads",
        label: "Leads",
      },
      {
        to: "/marketing/email-campaign",
        label: "Email Campaign",
      },
    ],
  },

  // {
  //   key: "sales",
  //   label: "Sales",
  //   icon: Briefcase,
  //   items: [
  //     {
  //       to: "/sales",
  //       label: "Sales Dashboard",
  //     },
  //     {
  //       to: "/sales/opportunities",
  //       label: "Opportunity",
  //     },
  //     {
  //       to: "/sales/quotations",
  //       label: "Quotation",
  //     },
  //   ],
  // },
  // {
  //   key: "Order",
  //   label: "Order",
  //   icon: ClipboardList,
  //   items: [
  //     {
  //       to: "/order-dashboard",
  //       label: "Order Dashboard",
  //     },
  //     {
  //       to: "/final-offer",
  //       label: "Final Offer - FO",
  //     },
  //     {
  //       to: "/customer-po",
  //       label: "Customer PO - CPO",
  //     },
  //     {
  //       to: "/sales/orders",
  //       label: "Sales Order - SO",
  //     },
  //     // {
  //     //   to: "/work-order",
  //     //   label: "Works Order - WO"
  //     // }
  //   ],
  // },
  // {
  //   key: "Tasks",
  //   label: "Tasks",
  //   icon: ListChecks,
  //   items: [
  //     {
  //       to: "/tasks/dashboard",
  //       label: "Task Dashboard",
  //     },
  //     {
  //       to: "/tasks",
  //       label: "Task List",
  //     },
  //   ],
  // },
  {
    key: "Masters",
    label: "Masters",
    icon: Database,
    items: [
      {
        to: "/company",
        label: "Company",
      },
      {
        to: "/location",
        label: "Location",
      },
    ],
  },
  // {
  //   key: "User & Roles",
  //   label: "User & Roles",
  //   icon: ShieldCheck,
  //   items: [
  //     {
  //       to: "/user",
  //       label: "User",
  //     },
  //     {
  //       to: "/roles",
  //       label: "Roles",
  //     },
  //     {
  //       to: "/access-control",
  //       label: "Access Control",
  //     },
  //   ],
  // },
];

export function AppSidebar() {
  const { user } = useAuth();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const menuItems: MenuItem[] = user?.is_superuser
    ? [
        ...MENU_ITEMS,
        {
          key: "email-settings",
          label: "Email settings",
          icon: ShieldCheck,
          to: "/email-settings",
        },
      ]
    : MENU_ITEMS;

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
            <div className="font-display text-[15px] font-bold text-white">Vantage</div>

            <div className="mt-1 font-mono text-[10px] text-white/40">CRM · OPS</div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
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
