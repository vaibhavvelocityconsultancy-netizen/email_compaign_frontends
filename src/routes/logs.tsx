import * as React from "react";
import { ModuleHero } from "@/components/ModuleHero";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, ChevronLeft, ChevronRight, LoaderCircle, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { request } from "@/lib/api";

export const Route = createFileRoute("/logs")({ component: LogsPage });

const PAGE_SIZE = 20;
const SELECT_CLASS = "h-10 rounded-md border border-input bg-background px-3 text-sm";

interface SystemLog {
  id: number;
  tenant_id: number | null;
  tenant_name: string | null;
  level: string;
  logger_name: string;
  module: string;
  message: string;
  source: string;
  is_notification: boolean;
  is_read: boolean;
  is_acknowledged: boolean;
  created_at: string;
}

interface LogsResponse {
  results: SystemLog[];
  unread_notifications: number;
}

function getLogFields(message: string) {
  return Object.fromEntries(
    Array.from(message.matchAll(/(?:^|\s)([a-z_]+)=([^\s]+)/g), ([, key, value]) => [key, value]),
  );
}

// Example: current=5, total=12 -> [1, "…", 4, 5, 6, "…", 12]
function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const wanted = new Set([1, total, current - 1, current, current + 1]);
  const sorted = Array.from(wanted)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push("…");
    result.push(p);
  });
  return result;
}

function LogsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [moduleFilter, setModuleFilter] = React.useState("all");
  const [readFilter, setReadFilter] = React.useState("all");
  const [dateFilter, setDateFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [expandedId, setExpandedId] = React.useState<number | null>(null);

  const logs = useQuery({
    queryKey: ["system-logs", search],
    queryFn: () => request<LogsResponse>(`/auth/system-logs/?search=${encodeURIComponent(search)}`),
    enabled: Boolean(user?.is_superuser),
    refetchInterval: 15000,
  });
  const markAllRead = useMutation({
    mutationFn: () =>
      request<{ updated: number }>("/auth/system-logs/read-all/", { method: "POST" }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["system-logs"] });
      void queryClient.invalidateQueries({ queryKey: ["system-notification-count"] });
      toast.success(`${result.updated} log${result.updated === 1 ? "" : "s"} marked as read.`);
    },
    onError: () => toast.error("Could not mark logs as read."),
  });

  const action = useMutation({
    mutationFn: (args: { id: number; action: "acknowledge" | "dismiss" }) =>
      request(`/auth/system-logs/${args.id}/action/`, {
        method: "POST",
        body: JSON.stringify({ action: args.action }),
      }),
    onSuccess: (_data, args) => {
      void queryClient.invalidateQueries({ queryKey: ["system-logs"] });
      void queryClient.invalidateQueries({ queryKey: ["system-notification-count"] });
      if (args.action === "acknowledge") toast.success("Log acknowledged.");
      if (args.action === "dismiss") toast.success("Log dismissed.");
    },
    onError: () => toast.error("Could not update this log."),
  });

  // Module dropdown options are built from the real data
  const logModules = React.useMemo(
    () =>
      Array.from(
        new Set((logs.data?.results ?? []).map((log) => log.module).filter(Boolean)),
      ).sort(),
    [logs.data?.results],
  );

  const visibleLogs = React.useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return (logs.data?.results ?? [])
      .filter((log) => {
        // Module
        if (moduleFilter !== "all" && log.module !== moduleFilter) return false;

        // Read status
        if (readFilter === "unread" && log.is_read) return false;
        if (readFilter === "read" && !log.is_read) return false;

        // Date range
        const createdAt = new Date(log.created_at).getTime();
        if (dateFilter === "today" && createdAt < startOfToday.getTime()) return false;
        if (dateFilter === "24h" && createdAt < now - 24 * 60 * 60 * 1000) return false;
        if (dateFilter === "7d" && createdAt < now - 7 * 24 * 60 * 60 * 1000) return false;

        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [logs.data?.results, moduleFilter, readFilter, dateFilter]);

  const hasActiveFilters = [moduleFilter, readFilter, dateFilter].some((value) => value !== "all");

  function clearFilters() {
    setModuleFilter("all");
    setReadFilter("all");
    setDateFilter("all");
  }

  // When search or any filter changes, go back to page 1
  React.useEffect(() => {
    setPage(1);
    setExpandedId(null);
  }, [search, moduleFilter, readFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleLogs.length / PAGE_SIZE));
  // Safe if the list gets shorter after the 15 second auto-refresh
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedLogs = visibleLogs.slice(pageStart, pageStart + PAGE_SIZE);

  if (!user?.is_superuser)
    return <div className="p-6">Only super administrators can view system logs.</div>;

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between gap-4">
        <ModuleHero
          eyebrow="System health"
          title="System Logs"
          description="Review API requests and backend activity across application modules."
          icon={<span aria-hidden="true">•</span>}
        />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Input
            className="max-w-xs"
            placeholder="Search logs..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button
            variant="outline"
            disabled={markAllRead.isPending || !logs.data?.results.some((log) => !log.is_read)}
            onClick={() => markAllRead.mutate()}
          >
            {markAllRead.isPending ? (
              <LoaderCircle className="mr-1 size-4 animate-spin" />
            ) : (
              <CheckCheck className="mr-1 size-4" />
            )}
            Mark all as read
          </Button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Filter log module"
          className={`${SELECT_CLASS} max-w-48`}
          value={moduleFilter}
          onChange={(event) => setModuleFilter(event.target.value)}
        >
          <option value="all">All modules</option>
          {logModules.map((module) => (
            <option key={module} value={module}>
              {module}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter read status"
          className={SELECT_CLASS}
          value={readFilter}
          onChange={(event) => setReadFilter(event.target.value)}
        >
          <option value="all">Read + Unread</option>
          <option value="unread">Unread only</option>
          <option value="read">Read only</option>
        </select>
        <select
          aria-label="Filter date range"
          className={SELECT_CLASS}
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
        >
          <option value="all">All time</option>
          <option value="today">Today</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
        </select>
        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            <X className="mr-1 size-4" />
            Clear filters
          </Button>
        )}
      </div>

      {logs.isError && (
        <p className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">
          {logs.error.message}
        </p>
      )}

      {visibleLogs.length > 0 && (
        <div className="rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Time</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Module</th>
                  <th className="px-3 py-2 font-medium">Tenant</th>
                  <th className="px-3 py-2 font-medium">Message</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedLogs.map((log) => {
                  const fields = getLogFields(log.message);
                  const isRequest = fields.event?.startsWith("api.request") ?? false;
                  const isOpen = expandedId === log.id;
                  const isBusy = action.isPending && action.variables?.id === log.id;
                  const statusCode = Number(fields.status);
                  const shortText = isRequest && fields.endpoint ? fields.endpoint : log.message;

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        className={`cursor-pointer border-t hover:bg-muted/40 ${
                          log.is_read ? "text-muted-foreground" : "font-medium"
                        }`}
                        onClick={() => setExpandedId(isOpen ? null : log.id)}
                      >
                        <td className="whitespace-nowrap px-3 py-2 text-xs">
                          {!log.is_read && (
                            <span className="mr-1.5 inline-block size-2 rounded-full bg-destructive" />
                          )}
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          {isRequest ? (fields.method ?? "API") : log.level}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">{log.module}</td>
                        <td className="whitespace-nowrap px-3 py-2">
                          {log.tenant_name || "System"}
                        </td>
                        <td className="max-w-md px-3 py-2">
                          <div className="truncate font-mono text-xs" title={shortText}>
                            {shortText}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            {fields.status && (
                              <span
                                className={`rounded-full border px-2 py-0.5 text-xs ${
                                  statusCode >= 400 ? "border-destructive/50 text-destructive" : ""
                                }`}
                              >
                                {fields.status}
                              </span>
                            )}
                            {fields.duration_ms && (
                              <span className="text-xs">{fields.duration_ms} ms</span>
                            )}
                            {log.is_acknowledged && (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                Acknowledged
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <div className="flex items-center justify-end gap-1">
                            {!log.is_acknowledged && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isBusy}
                                onClick={(event) => {
                                  event.stopPropagation(); // do not open/close the row
                                  action.mutate({ id: log.id, action: "acknowledge" });
                                }}
                              >
                                {isBusy && action.variables?.action === "acknowledge" ? (
                                  <LoaderCircle className="mr-1 size-4 animate-spin" />
                                ) : (
                                  <CheckCheck className="mr-1 size-4" />
                                )}
                                Acknowledge
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={`Dismiss log ${log.id}`}
                              disabled={isBusy}
                              onClick={(event) => {
                                event.stopPropagation();
                                action.mutate({ id: log.id, action: "dismiss" });
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-t bg-muted/30">
                          <td colSpan={7} className="px-3 py-3">
                            <div className="mb-2 text-xs text-muted-foreground">
                              {log.logger_name} · {log.source} · {log.level}
                            </div>
                            <pre className="whitespace-pre-wrap break-words font-mono text-xs">
                              {log.message}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, visibleLogs.length)} of{" "}
              {visibleLogs.length} logs
            </p>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft className="mr-1 size-4" />
                Previous
              </Button>
              {getPageNumbers(currentPage, totalPages).map((p, index) =>
                p === "…" ? (
                  <span key={`gap-${index}`} className="px-2 text-sm text-muted-foreground">
                    …
                  </span>
                ) : (
                  <Button
                    key={p}
                    size="sm"
                    variant={p === currentPage ? "default" : "outline"}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                ),
              )}
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {!logs.isLoading && !logs.isError && !visibleLogs.length && (
        <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
          {logs.data?.results.length ? "No logs match these filters." : "No system logs found."}
        </div>
      )}
      {logs.isLoading && (
        <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
          Loading system logs…
        </div>
      )}
    </div>
  );
}
