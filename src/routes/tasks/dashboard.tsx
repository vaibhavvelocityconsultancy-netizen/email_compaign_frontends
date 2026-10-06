import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Layers,
  ListChecks,
  PieChart,
  RefreshCw,
  Repeat,
  Star,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getTaskDashboard, type TaskDashboard } from "@/lib/task-api";

export const Route = createFileRoute("/tasks/dashboard")({
  validateSearch: (search: Record<string, unknown>) => ({
    userId: typeof search.userId === "string" && search.userId ? search.userId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Task Dashboard — Vantage CRM" },
      { name: "description", content: "Task workload, deadlines and breakdowns." },
    ],
  }),
  component: TaskDashboardPage,
});

const label = (value: string | null | undefined) =>
  value
    ? value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/^\w/, (c) => c.toUpperCase())
    : "None";

/* ---------- KPI cards ---------- */

type KpiTone = "blue" | "amber" | "sky" | "emerald" | "red" | "orange" | "teal" | "violet" | "pink";

const KPI_TONES: Record<KpiTone, { card: string; icon: string }> = {
  blue: {
    card: "border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10",
    icon: "bg-blue-500",
  },
  amber: {
    card: "border-amber-100 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10",
    icon: "bg-amber-500",
  },
  sky: {
    card: "border-sky-100 bg-sky-50 dark:border-sky-500/20 dark:bg-sky-500/10",
    icon: "bg-sky-500",
  },
  emerald: {
    card: "border-emerald-100 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10",
    icon: "bg-emerald-500",
  },
  red: {
    card: "border-red-100 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10",
    icon: "bg-red-500",
  },
  orange: {
    card: "border-orange-100 bg-orange-50 dark:border-orange-500/20 dark:bg-orange-500/10",
    icon: "bg-orange-500",
  },
  teal: {
    card: "border-teal-100 bg-teal-50 dark:border-teal-500/20 dark:bg-teal-500/10",
    icon: "bg-teal-500",
  },
  violet: {
    card: "border-violet-100 bg-violet-50 dark:border-violet-500/20 dark:bg-violet-500/10",
    icon: "bg-violet-500",
  },
  pink: {
    card: "border-pink-100 bg-pink-50 dark:border-pink-500/20 dark:bg-pink-500/10",
    icon: "bg-pink-500",
  },
};

function KpiCard({
  title,
  value,
  icon: Icon,
  tone,
  loading,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  tone: KpiTone;
  loading: boolean;
}) {
  const styles = KPI_TONES[tone];
  return (
    <div className={`flex items-center justify-between rounded-xl border p-4 ${styles.card}`}>
      <div>
        <div className="text-xs text-muted-foreground">{title}</div>
        <div className="mt-1 text-2xl font-bold tabular-nums">{loading ? "—" : value}</div>
      </div>
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-full text-white ${styles.icon}`}
        aria-hidden="true"
      >
        <Icon className="size-5" />
      </span>
    </div>
  );
}

/* ---------- Breakdown cards ---------- */

interface RowMeta {
  icon: LucideIcon;
  /** classes for the small icon / badge */
  chip: string;
  bar: string;
  badge?: boolean;
}

const STATUS_META: Record<string, RowMeta> = {
  COMPLETED: {
    icon: CheckCircle2,
    chip: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10",
    bar: "bg-emerald-500",
  },
  PENDING: {
    icon: Clock,
    chip: "text-amber-600 bg-amber-50 dark:bg-amber-500/10",
    bar: "bg-amber-500",
  },
  IN_PROGRESS: {
    icon: Activity,
    chip: "text-blue-600 bg-blue-50 dark:bg-blue-500/10",
    bar: "bg-blue-500",
  },
};
const STATUS_FALLBACK: RowMeta = {
  icon: Circle,
  chip: "text-slate-600 bg-slate-100 dark:bg-slate-500/10",
  bar: "bg-slate-400",
};

const PRIORITY_META: Record<string, RowMeta> = {
  HIGH: {
    icon: AlertTriangle,
    chip: "text-orange-700 bg-orange-100 dark:bg-orange-500/15",
    bar: "bg-orange-500",
    badge: true,
  },
  MEDIUM: {
    icon: Target,
    chip: "text-blue-700 bg-blue-100 dark:bg-blue-500/15",
    bar: "bg-blue-500",
    badge: true,
  },
  LOW: {
    icon: Circle,
    chip: "text-slate-700 bg-slate-100 dark:bg-slate-500/15",
    bar: "bg-slate-400",
    badge: true,
  },
};
const PRIORITY_FALLBACK: RowMeta = { ...STATUS_FALLBACK, badge: true };

const MODULE_META: Record<string, RowMeta> = {
  LEAD: {
    icon: ListChecks,
    chip: "text-teal-600 bg-teal-50 dark:bg-teal-500/10",
    bar: "bg-teal-500",
  },
  QUOTATION: {
    icon: BarChart3,
    chip: "text-teal-600 bg-teal-50 dark:bg-teal-500/10",
    bar: "bg-teal-500",
  },
};
const MODULE_FALLBACK: RowMeta = {
  icon: Layers,
  chip: "text-teal-600 bg-teal-50 dark:bg-teal-500/10",
  bar: "bg-teal-500",
};

interface BreakdownRow {
  key: string;
  name: string;
  count: number;
  meta: RowMeta;
}

function BreakdownCard({
  title,
  icon: Icon,
  headerTone,
  rows,
  total,
  loading,
}: {
  title: string;
  icon: LucideIcon;
  headerTone: string;
  rows: BreakdownRow[];
  total: number;
  loading: boolean;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span
          className={`flex size-8 items-center justify-center rounded-md ${headerTone}`}
          aria-hidden="true"
        >
          <Icon className="size-4" />
        </span>
        <h2 className="font-semibold">{title}</h2>
      </header>
      <div className="space-y-4 p-4">
        {rows.map((row) => {
          const percent = total ? Math.round((row.count / total) * 100) : 0;
          const RowIcon = row.meta.icon;
          return (
            <div key={row.key}>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  {row.meta.badge ? (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold uppercase ${row.meta.chip}`}
                    >
                      <RowIcon className="size-3" aria-hidden="true" />
                      {row.name}
                    </span>
                  ) : (
                    <>
                      <span
                        className={`flex size-6 items-center justify-center rounded-md ${row.meta.chip}`}
                        aria-hidden="true"
                      >
                        <RowIcon className="size-3.5" />
                      </span>
                      <span className="font-medium">{row.name}</span>
                    </>
                  )}
                </span>
                <span className="font-semibold tabular-nums">{row.count}</span>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label={`${row.name}: ${percent}% of tasks`}
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`h-full rounded-full ${row.meta.bar}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
        {!rows.length && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {loading ? "Loading…" : "No tasks to show."}
          </p>
        )}
      </div>
    </section>
  );
}

/* ---------- Page ---------- */

function TaskDashboardPage() {
  const navigate = useNavigate();
  const { userId } = Route.useSearch();

  const dashboardQuery = useQuery<TaskDashboard>({
    queryKey: ["task-dashboard", userId ?? "all"],
    queryFn: () => getTaskDashboard(userId),
  });

  const data = dashboardQuery.data;
  const loading = dashboardQuery.isLoading;
  const total = data?.total ?? 0;
  const completionRate = total ? Math.round(((data?.completed ?? 0) / total) * 100) : 0;

  const statusRows: BreakdownRow[] = (data?.by_status ?? []).map((r) => ({
    key: r.status,
    name: label(r.status),
    count: r.count,
    meta: STATUS_META[r.status?.toUpperCase()] ?? STATUS_FALLBACK,
  }));
  const priorityRows: BreakdownRow[] = (data?.by_priority ?? []).map((r) => ({
    key: r.priority,
    name: (r.priority ?? "None").toString(),
    count: r.count,
    meta: PRIORITY_META[r.priority?.toUpperCase()] ?? PRIORITY_FALLBACK,
  }));
  const moduleRows: BreakdownRow[] = (data?.by_module ?? []).map((r) => ({
    key: r.module ?? "none",
    name: (r.module ?? "None").toString(),
    count: r.count,
    meta: MODULE_META[r.module?.toUpperCase() ?? ""] ?? MODULE_FALLBACK,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] tracking-wide text-muted-foreground">TASKS</div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Task Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Workload, deadlines and completion across your tasks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            aria-label="Filter by assignee user ID"
            placeholder="Assignee user ID"
            className="w-44"
            defaultValue={userId ?? ""}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              const value = event.currentTarget.value.trim();
              navigate({ to: "/tasks/dashboard", search: { userId: value || undefined } });
            }}
          />
          {userId && (
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: "/tasks/dashboard", search: {} })}
            >
              Clear
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => dashboardQuery.refetch()}
            disabled={dashboardQuery.isFetching}
          >
            <RefreshCw
              className={`mr-2 size-4 ${dashboardQuery.isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {dashboardQuery.isError && (
        <p role="alert" className="text-sm text-destructive">
          {dashboardQuery.error.message || "Could not load the task dashboard."}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          title="Total Tasks"
          value={data?.total ?? 0}
          icon={ListChecks}
          tone="blue"
          loading={loading}
        />
        <KpiCard
          title="Pending"
          value={data?.pending ?? 0}
          icon={Clock}
          tone="amber"
          loading={loading}
        />
        <KpiCard
          title="In Progress"
          value={data?.in_progress ?? 0}
          icon={Activity}
          tone="sky"
          loading={loading}
        />
        <KpiCard
          title="Completed"
          value={data?.completed ?? 0}
          icon={CheckCircle2}
          tone="emerald"
          loading={loading}
        />
        <KpiCard
          title="Overdue"
          value={data?.overdue ?? 0}
          icon={AlertTriangle}
          tone="red"
          loading={loading}
        />
        <KpiCard
          title="Due Today"
          value={data?.due_today ?? 0}
          icon={CalendarDays}
          tone="orange"
          loading={loading}
        />
        <KpiCard
          title="Upcoming"
          value={data?.upcoming ?? 0}
          icon={TrendingUp}
          tone="teal"
          loading={loading}
        />
        <KpiCard
          title="Recurring"
          value={data?.recurring ?? 0}
          icon={Repeat}
          tone="violet"
          loading={loading}
        />
        <KpiCard
          title="Miscellaneous"
          value={data?.miscellaneous ?? 0}
          icon={Star}
          tone="pink"
          loading={loading}
        />
        <KpiCard
          title="Completion Rate"
          value={`${completionRate}%`}
          icon={PieChart}
          tone="emerald"
          loading={loading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <BreakdownCard
          title="By Status"
          icon={Clock}
          headerTone="bg-blue-50 text-blue-600 dark:bg-blue-500/10"
          rows={statusRows}
          total={total}
          loading={loading}
        />
        <BreakdownCard
          title="By Priority"
          icon={AlertCircle}
          headerTone="bg-orange-50 text-orange-600 dark:bg-orange-500/10"
          rows={priorityRows}
          total={total}
          loading={loading}
        />
        <BreakdownCard
          title="By Module"
          icon={Layers}
          headerTone="bg-teal-50 text-teal-600 dark:bg-teal-500/10"
          rows={moduleRows}
          total={total}
          loading={loading}
        />
      </div>
    </div>
  );
}
