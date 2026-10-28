import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Eye, LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { request } from "@/lib/api";

export const Route = createFileRoute("/logs")({ component: LogsPage });

interface SystemLog {
  id: number;
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

interface LogsResponse { results: SystemLog[]; unread_notifications: number }

function LogsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const logs = useQuery({
    queryKey: ["system-logs", search],
    queryFn: () => request<LogsResponse>(`/auth/system-logs/?search=${encodeURIComponent(search)}`),
    enabled: Boolean(user?.is_superuser),
    refetchInterval: 15000,
  });
  const action = useMutation({
    mutationFn: (args: { id: number; action: "read" | "acknowledge" | "dismiss" }) =>
      request(`/auth/system-logs/${args.id}/action/`, { method: "POST", body: JSON.stringify({ action: args.action }) }),
    onSuccess: (_data, args) => {
      void queryClient.invalidateQueries({ queryKey: ["system-logs"] });
      void queryClient.invalidateQueries({ queryKey: ["system-notification-count"] });
      if (args.action === "acknowledge") toast.success("Log acknowledged.");
      if (args.action === "read") toast.success("Log marked as read.");
      if (args.action === "dismiss") toast.success("Log dismissed.");
    },
    onError: () => toast.error("Could not update this log."),
  });

  if (!user?.is_superuser) return <div className="p-6">Only super administrators can view system logs.</div>;

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between gap-4">
        <div><h1 className="text-2xl font-semibold">System Logs</h1><p className="text-sm text-muted-foreground">Backend and cron errors recorded by the CRM.</p></div>
        <Input className="max-w-xs" placeholder="Search logs..." value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      {logs.data?.results.map((log) => (
        <Card key={log.id} className={log.is_read ? "opacity-75" : "border-destructive/50"}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{log.level} · {log.logger_name}</CardTitle>
                <div className="mt-1 text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()} · {log.tenant_name || "System"} · {log.module}</div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {log.is_acknowledged ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Acknowledged</span>
                ) : (
                  !log.is_read && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={action.isPending && action.variables?.id === log.id}
                      onClick={() => action.mutate({ id: log.id, action: "read" })}
                    >
                      {action.isPending && action.variables?.id === log.id && action.variables.action === "read" ? (
                        <LoaderCircle className="mr-1 size-4 animate-spin" />
                      ) : (
                        <Eye className="mr-1 size-4" />
                      )}
                      Mark as read
                    </Button>
                  )
                )}
                {!log.is_acknowledged && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={action.isPending && action.variables?.id === log.id}
                    onClick={() => action.mutate({ id: log.id, action: "acknowledge" })}
                  >
                    {action.isPending && action.variables?.id === log.id && action.variables.action === "acknowledge" ? (
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
                  disabled={action.isPending && action.variables?.id === log.id}
                  onClick={() => action.mutate({ id: log.id, action: "dismiss" })}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent><pre className="whitespace-pre-wrap break-words text-sm">{log.message}</pre></CardContent>
        </Card>
      ))}
      {!logs.isLoading && !logs.data?.results.length && <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">No system logs found.</div>}
    </div>
  );
}
