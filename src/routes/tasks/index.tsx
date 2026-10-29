import { ModuleHero } from "@/components/ModuleHero";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DataTable, type Column } from "@/components/common/DataTable";
import { useDeleteTask, useTasks, type Task } from "@/lib/task-api";

export const Route = createFileRoute("/tasks/")({
  component: TasksPage,
});

// ---------- constants ----------
const MODULE_OPTIONS = [
  { value: "LEAD", label: "Lead" },
  { value: "OPPORTUNITY", label: "Opportunity" },
  { value: "QUOTATION", label: "Quotation" },
];
const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];
const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const label = (opts: { value: string; label: string }[], v?: string | null) =>
  opts.find((o) => o.value === v)?.label ?? v ?? "-";

const formatTaskDate = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
};

// Local date (not UTC) so "Today" is correct in IST early morning
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const PRIORITY_STYLE: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-800",
  URGENT: "bg-red-100 text-red-700",
};
const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-slate-100 text-slate-600",
};

// ---------- filters ----------
type TaskFilter = "all" | "today" | "upcoming" | "recurring";

const FILTER_TABS: { value: TaskFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "recurring", label: "Recurring" },
];

const isOpen = (t: Task) => t.status === "PENDING" || t.status === "IN_PROGRESS";

const matchesFilter = (t: Task, filter: TaskFilter, today: string) => {
  switch (filter) {
    case "today":
      return t.followup_date === today;
    case "upcoming":
      return t.followup_date > today && isOpen(t);
    case "recurring":
      return t.is_recurring;
    default:
      return true;
  }
};

function Badge({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", className)}>
      {text}
    </span>
  );
}

// ---------- page ----------
export default function TasksPage() {
  const navigate = useNavigate();
  const { data: tasks = [], isLoading } = useTasks();
  const remove = useDeleteTask();

  const [toDelete, setToDelete] = React.useState<Task | null>(null);
  const [filter, setFilter] = React.useState<TaskFilter>("all");

  const today = localToday();

  const counts = React.useMemo(
    () => ({
      all: tasks.length,
      today: tasks.filter((t) => matchesFilter(t, "today", today)).length,
      upcoming: tasks.filter((t) => matchesFilter(t, "upcoming", today)).length,
      recurring: tasks.filter((t) => matchesFilter(t, "recurring", today)).length,
    }),
    [tasks, today],
  );

  const visibleTasks = React.useMemo(
    () => tasks.filter((t) => matchesFilter(t, filter, today)),
    [tasks, filter, today],
  );

  const columns: Column<Task>[] = [
    {
      key: "followup_date",
      header: "Date",
      filterType: "date",
      cell: (r) => formatTaskDate(r.followup_date),
      filterValue: (r) => r.followup_date,
    },
    { key: "module", header: "Module", cell: (r) => label(MODULE_OPTIONS, r.module) },
    {
      key: "company_name",
      header: "Company",
      cell: (r) => r.company_name || "-",
      filterValue: (r) => r.company_name || "",
    },
    {
      key: "task_regarding",
      header: "Task Regarding",
      cell: (r) => (
        <span className="inline-flex items-center gap-1.5">
          {r.task_regarding === "MISCELLANEOUS" ? "Miscellaneous" : r.task_regarding || "-"}
          {r.is_recurring && (
            <Repeat className="size-3.5 text-muted-foreground" aria-label="Recurring task" />
          )}
        </span>
      ),
      filterValue: (r) => r.task_regarding || "",
    },
    {
      key: "priority",
      header: "Priority",
      cell: (r) => (
        <Badge text={label(PRIORITY_OPTIONS, r.priority)} className={PRIORITY_STYLE[r.priority]} />
      ),
      filterValue: (r) => label(PRIORITY_OPTIONS, r.priority),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <Badge text={label(STATUS_OPTIONS, r.status)} className={STATUS_STYLE[r.status]} />
      ),
      filterValue: (r) => label(STATUS_OPTIONS, r.status),
    },
    {
      key: "assigned_to",
      header: "Assigned To",
      cell: (r) => r.assigned_to_name ?? "-",
      filterValue: (r) => r.assigned_to_name ?? "Unassigned",
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-24",
      cell: (r) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={`Edit ${r.title}`}
            onClick={() => navigate({ to: "/tasks/form", search: { taskId: String(r.id) } })}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
            aria-label={`Delete ${r.title}`}
            onClick={() => setToDelete(r)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="rounded-2xl border border-line bg-surface/70 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] font-semibold tracking-[0.18em] text-brand">WORK QUEUE</div>
            <ModuleHero eyebrow="Operations workspace" title="Tasks" description="Organize follow-ups, ownership, and deadlines without losing momentum." icon={<span aria-hidden="true">•</span>} />
            <p className="mt-2 text-sm text-muted-foreground">
              Follow-ups and reminders across leads, opportunities and quotations.
            </p>
          </div>
          <div className="rounded-full border border-line bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">{counts.all} total</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Task filters">
        {FILTER_TABS.map((tab) => {
          const active = filter === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(tab.value)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs",
                  active ? "bg-primary-foreground/20" : "bg-muted",
                )}
              >
                {counts[tab.value]}
              </span>
            </button>
          );
        })}
      </div>

      <DataTable<Task>
        data={visibleTasks}
        columns={columns}
        searchKeys={["title", "reference_id", "description"]}
        searchPlaceholder="Search tasks"
        emptyMessage={
          isLoading
            ? "Loading tasks..."
            : filter === "all"
              ? "No tasks found."
              : `No ${filter} tasks.`
        }
        storageKey="tasks-table"
        selectionResetKey={filter}
        getRowClassName={(r) => (r.followup_date < today && isOpen(r) ? "bg-red-50/60" : "")}
        toolbarActions={
            <Button
            size="sm"
            className="h-9 gap-1.5 rounded-lg px-4 shadow-sm"
            onClick={() => navigate({ to: "/tasks/form", search: { taskId: undefined } })}
          >
            <Plus className="size-4" />
            New Task
          </Button>
        }
      />

      <AlertDialog open={Boolean(toDelete)} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              “{toDelete?.title}” will be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                if (!toDelete) return;
                try {
                  await remove.mutateAsync(toDelete.id);
                  toast.success("Task deleted");
                  setToDelete(null);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not delete task");
                }
              }}
            >
              {remove.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
