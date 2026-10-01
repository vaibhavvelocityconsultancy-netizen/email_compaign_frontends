import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bell, CalendarDays, CheckCircle2, Clock3, Filter, ListTodo, Plus, Search, SlidersHorizontal, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/tasks")({
  head: () => ({ meta: [{ title: "Tasks — Vantage CRM" }, { name: "description", content: "Manage CRM follow-ups and operational tasks." }] }),
  component: TasksPage,
});

type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type Task = { id: number; title: string; description: string; module: string; regarding: string; assignee: string; followupDate: string; priority: Priority; status: TaskStatus };

const initialTasks: Task[] = [
  { id: 1, title: "Follow up on proposal", description: "Check if the revised quotation was received.", module: "OPPORTUNITY", regarding: "Follow Up", assignee: "Aarav Mehta", followupDate: "2026-10-02", priority: "HIGH", status: "IN_PROGRESS" },
  { id: 2, title: "Confirm payment schedule", description: "Discuss milestone payment dates with the finance team.", module: "QUOTATION", regarding: "Payment", assignee: "Nisha Shah", followupDate: "2026-10-03", priority: "URGENT", status: "PENDING" },
  { id: 3, title: "Review incoming lead", description: "Qualify the new enterprise enquiry.", module: "LEAD", regarding: "Follow Up", assignee: "Rohan Kapoor", followupDate: "2026-10-04", priority: "MEDIUM", status: "PENDING" },
  { id: 4, title: "QC checklist review", description: "Complete the final quality review before dispatch.", module: "QC", regarding: "Miscellaneous", assignee: "Aarav Mehta", followupDate: "2026-10-01", priority: "LOW", status: "COMPLETED" },
];

const priorityClass: Record<Priority, string> = { LOW: "bg-muted text-muted-foreground", MEDIUM: "bg-blue-500/12 text-blue-600 dark:text-blue-300", HIGH: "bg-amber-500/15 text-amber-700 dark:text-amber-300", URGENT: "bg-red-500/15 text-red-600 dark:text-red-300" };
const statusClass: Record<TaskStatus, string> = { PENDING: "bg-muted text-muted-foreground", IN_PROGRESS: "bg-brand/12 text-brand", COMPLETED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", CANCELLED: "bg-red-500/15 text-red-600" };

function TasksPage() {
  const [tasks, setTasks] = useState(initialTasks);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const matchesStatus = statusFilter === "ALL" || task.status === statusFilter;
    const matchesQuery = `${task.title} ${task.module} ${task.regarding} ${task.assignee}`.toLowerCase().includes(query.toLowerCase());
    return matchesStatus && matchesQuery;
  }), [query, statusFilter, tasks]);

  const addTask = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const regarding = String(form.get("regarding") || "Miscellaneous");
    if (regarding !== "Miscellaneous" && !form.get("reference")) return;
    setTasks((current) => [{ id: Date.now(), title: String(form.get("title")), description: String(form.get("description") || ""), module: String(form.get("module")), regarding, assignee: "Unassigned", followupDate: String(form.get("date")), priority: String(form.get("priority")) as Priority, status: "PENDING" }, ...current]);
    setOpen(false);
    event.currentTarget.reset();
  };

  const counts = { all: tasks.length, pending: tasks.filter((task) => task.status === "PENDING").length, progress: tasks.filter((task) => task.status === "IN_PROGRESS").length, completed: tasks.filter((task) => task.status === "COMPLETED").length };

  return (
    <div className="space-y-6">
      <div className="rise flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><div className="font-mono text-[11px] tracking-wide text-muted-foreground">WORK MANAGEMENT</div><h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Tasks</h1><p className="mt-2 max-w-xl text-sm text-muted-foreground">Keep every follow-up, handoff, and operational reminder in one place.</p></div>
        <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button className="gap-2"><Plus data-icon="inline-start" /> Create task</Button></DialogTrigger><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Create task</DialogTitle><DialogDescription>Add a follow-up or operational task for your team.</DialogDescription></DialogHeader><form onSubmit={addTask} className="grid gap-4 py-2"><div className="grid gap-2"><Label htmlFor="title">Task title</Label><Input id="title" name="title" placeholder="e.g. Follow up on proposal" required /></div><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label>Module</Label><Select name="module" defaultValue="LEAD"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["LEAD", "OPPORTUNITY", "QUOTATION", "PURCHASE_INDENT", "PURCHASE_ORDER", "PRODUCTION", "QC", "DISPATCH"].map((item) => <SelectItem key={item} value={item}>{item.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label>Task regarding</Label><Select name="regarding" defaultValue="Follow Up"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Follow Up", "Payment", "Miscellaneous"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div></div><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="reference">Reference ID <span className="text-muted-foreground">(optional for miscellaneous)</span></Label><Input id="reference" name="reference" placeholder="Opportunity or quotation ID" /></div><div className="grid gap-2"><Label htmlFor="date">Follow-up date</Label><Input id="date" name="date" type="date" required /></div></div><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label>Priority</Label><Select name="priority" defaultValue="MEDIUM"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["LOW", "MEDIUM", "HIGH", "URGENT"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label htmlFor="description">Description</Label><Input id="description" name="description" placeholder="Add context for the assignee" /></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Create task</Button></DialogFooter></form></DialogContent></Dialog>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><SummaryCard label="All tasks" value={counts.all} icon={ListTodo} /><SummaryCard label="Pending" value={counts.pending} icon={Clock3} /><SummaryCard label="In progress" value={counts.progress} icon={Bell} /><SummaryCard label="Completed" value={counts.completed} icon={CheckCircle2} /></div>

      <Card className="overflow-hidden"><CardHeader className="gap-4 border-b border-line pb-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><CardTitle className="font-display text-lg">Task list</CardTitle><div className="flex flex-wrap gap-2"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" className="h-9 w-full pl-9 sm:w-56" /></div><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="h-9 w-[145px]"><Filter className="mr-2 size-3.5" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All statuses</SelectItem><SelectItem value="PENDING">Pending</SelectItem><SelectItem value="IN_PROGRESS">In progress</SelectItem><SelectItem value="COMPLETED">Completed</SelectItem><SelectItem value="CANCELLED">Cancelled</SelectItem></SelectContent></Select><Button variant="outline" size="icon" className="size-9" aria-label="More filters"><SlidersHorizontal /></Button></div></div><div className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="size-3.5" /> Showing {filteredTasks.length} of {tasks.length} tasks</div></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-wide text-muted-foreground"><th className="px-5 py-3 font-medium">Task</th><th className="px-4 py-3 font-medium">Module</th><th className="px-4 py-3 font-medium">Assigned to</th><th className="px-4 py-3 font-medium">Follow-up</th><th className="px-4 py-3 font-medium">Priority</th><th className="px-4 py-3 font-medium">Status</th></tr></thead><tbody className="divide-y divide-line">{filteredTasks.map((task) => <tr key={task.id} className="transition-colors hover:bg-muted/30"><td className="px-5 py-4"><div className="font-medium">{task.title}</div><div className="mt-1 text-xs text-muted-foreground">{task.regarding} · {task.description}</div></td><td className="px-4 py-4"><Badge variant="outline" className="font-mono text-[10px]">{task.module.replaceAll("_", " ")}</Badge></td><td className="px-4 py-4 text-muted-foreground"><span className="inline-flex items-center gap-2"><UserRound className="size-3.5" />{task.assignee}</span></td><td className="px-4 py-4 font-mono text-xs">{new Date(task.followupDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td><td className="px-4 py-4"><Badge className={`border-0 ${priorityClass[task.priority]}`}>{task.priority}</Badge></td><td className="px-4 py-4"><Badge className={`border-0 ${statusClass[task.status]}`}>{task.status.replaceAll("_", " ")}</Badge></td></tr>)}{!filteredTasks.length && <tr><td colSpan={6} className="px-5 py-14 text-center text-sm text-muted-foreground">No tasks match your filters.</td></tr>}</tbody></table></div></CardContent></Card>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof ListTodo }) { return <Card><CardContent className="flex items-center justify-between p-4"><div><div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-2 font-display text-2xl font-bold">{value}</div></div><div className="grid size-9 place-items-center rounded-lg bg-brand/10 text-brand"><Icon className="size-4" /></div></CardContent></Card>; }
