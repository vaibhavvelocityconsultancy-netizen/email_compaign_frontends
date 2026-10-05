import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { ArrowLeft, Eye, Save } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/common/Modal";
import {
  toFormData,
  useCompanyOptions,
  useSaveTask,
  useTask,
  useTaskReferenceData,
  useUserOptions,
  type Task,
} from "@/lib/task-api";

export const Route = createFileRoute("/tasks/form")({
  validateSearch: (search: Record<string, unknown>) => ({
    taskId: typeof search.taskId === "string" ? search.taskId : undefined,
    module:
      search.module === "LEAD" || search.module === "OPPORTUNITY" || search.module === "QUOTATION"
        ? search.module
        : undefined,
    companyId: typeof search.companyId === "string" ? search.companyId : undefined,
    referenceId: typeof search.referenceId === "string" ? search.referenceId : undefined,
  }),
  component: TaskFormPage,
});

const MODULE_OPTIONS = [
  ["LEAD", "Lead"],
  ["OPPORTUNITY", "Opportunity"],
  ["QUOTATION", "Quotation"],
] as const;
const REGARDING_OPTIONS = ["Follow Up", "Payment", "MISCELLANEOUS"] as const;
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const STATUS_OPTIONS = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
const FREQUENCY_OPTIONS = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;

const taskSchema = z
  .object({
    description: z.string(),
    module: z.enum(["", "LEAD", "OPPORTUNITY", "QUOTATION"]),
    task_regarding: z.string().min(1, "Select what the task is regarding"),
    reference_id: z.string().min(1, "Select an enquiry date or quotation number"),
    company: z.string().min(1, "Select a company"),
    followup_date: z.string().min(1, "Follow-up date is required"),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
    status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
    assigned_to: z.string(),
    remarks: z.string(),
    is_recurring: z.boolean(),
    repeat_frequency: z.string(),
    repeat_interval: z.number().int().min(1, "Repeat interval must be at least 1"),
    repeat_end_date: z.string(),
  })
  .superRefine((values, context) => {
    if (!values.module) {
      context.addIssue({
        code: "custom",
        path: ["module"],
        message: "Select a module",
      });
    }
    if (values.is_recurring && !values.repeat_frequency) {
      context.addIssue({
        code: "custom",
        path: ["repeat_frequency"],
        message: "Select a repeat frequency",
      });
    }
  });

type TaskFormValues = z.infer<typeof taskSchema>;

function localDateValue() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function emptyTask(): TaskFormValues {
  return {
    description: "",
    module: "",
    task_regarding: "Follow Up",
    reference_id: "",
    company: "",
    followup_date: localDateValue(),
    priority: "MEDIUM",
    status: "PENDING",
    assigned_to: "",
    remarks: "",
    is_recurring: false,
    repeat_frequency: "",
    repeat_interval: 1,
    repeat_end_date: "",
  };
}

function taskToForm(task: Task): TaskFormValues {
  return {
    description: task.description ?? "",
    module: task.module as TaskFormValues["module"],
    task_regarding: task.task_regarding ?? "Follow Up",
    reference_id: task.reference_id ?? "",
    company: task.company == null ? "" : String(task.company),
    followup_date: task.followup_date ?? "",
    priority: task.priority as TaskFormValues["priority"],
    status: task.status as TaskFormValues["status"],
    assigned_to: task.assigned_to == null ? "" : String(task.assigned_to),
    remarks: task.remarks ?? "",
    is_recurring: task.is_recurring,
    repeat_frequency: task.repeat_frequency ?? "",
    repeat_interval: task.repeat_interval ?? 1,
    repeat_end_date: task.repeat_end_date ?? "",
  };
}

const fieldClassName =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const labelClassName = "mb-1.5 block text-sm font-medium";

function formatLeadDate(value?: string | null) {
  if (!value) return "—";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

function formatLeadLabel(value?: string | null) {
  if (!value) return "—";
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatMoney(value: number) {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function LeadDetail({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-medium uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm">{value || "—"}</dd>
    </div>
  );
}

function TaskFormPage() {
  const { taskId, module: modulePrefill, companyId: companyPrefill, referenceId: referencePrefill } = Route.useSearch();
  const navigate = useNavigate();
  const numericTaskId = taskId && /^\d+$/.test(taskId) ? Number(taskId) : undefined;
  const isEdit = numericTaskId !== undefined;
  const taskQuery = useTask(numericTaskId);
  const referenceQuery = useTaskReferenceData();
  const companyQuery = useCompanyOptions();
  const companies = companyQuery.data ?? [];
  const { data: users = [] } = useUserOptions();
  const save = useSaveTask();
  const [values, setValues] = React.useState<TaskFormValues>(emptyTask);
  const [files, setFiles] = React.useState<File[]>([]);
  type SavedAttachment = { id: number; file_name: string; file_url: string };

  const [savedAttachments, setSavedAttachments] = React.useState<SavedAttachment[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = React.useState<number[]>([]);
  const [leadDetailsOpen, setLeadDetailsOpen] = React.useState(false);
  const [quotationDetailsOpen, setQuotationDetailsOpen] = React.useState(false);

  React.useEffect(() => {
    if (isEdit || !modulePrefill) return;
    setValues((current) => ({
      ...current,
      module: modulePrefill,
      company: companyPrefill ?? "",
      reference_id: referencePrefill ?? "",
    }));
  }, [isEdit, modulePrefill, companyPrefill, referencePrefill]);

  React.useEffect(() => {
    if (taskQuery.data) {
      setValues(taskToForm(taskQuery.data));
      setSavedAttachments(
        (taskQuery.data as { attachments?: SavedAttachment[] }).attachments ?? [],
      );
      setRemovedAttachmentIds([]);
    }
  }, [taskQuery.data]);

  const selectedCompanyId = values.company ? Number(values.company) : null;
  const quotationCompanyIds = new Set(
    (referenceQuery.data?.quotations ?? [])
      .map((quotation) => quotation.companyId)
      .filter((companyId): companyId is number => companyId !== null),
  );
  const selectableCompanies =
    values.module === "QUOTATION"
      ? companies.filter((company) => quotationCompanyIds.has(company.value))
      : companies;
  const referenceOptions =
    !selectedCompanyId || !referenceQuery.data
      ? []
      : values.module === "LEAD"
        ? referenceQuery.data.leads.filter((option) => option.companyId === selectedCompanyId)
        : values.module === "OPPORTUNITY"
          ? referenceQuery.data.opportunities.filter(
              (option) => option.companyId === selectedCompanyId,
            )
          : values.module === "QUOTATION"
            ? referenceQuery.data.quotations.filter(
                (option) => option.companyId === selectedCompanyId,
              )
            : [];
  const selectedCompany = companies.find((company) => company.value === selectedCompanyId);
  const selectedReference = referenceOptions.find((option) => option.value === values.reference_id);
  const selectedLead = values.module === "LEAD" ? selectedReference?.lead : undefined;
  const selectedQuotation =
    values.module === "QUOTATION" ? selectedReference?.quotation : undefined;

  React.useEffect(() => {
    if (selectedCompanyId === null || referenceQuery.isLoading) {
      return;
    }
    if (!referenceOptions.some((option) => option.value === values.reference_id)) {
      setValues((current) => ({
        ...current,
        reference_id: referenceOptions[0]?.value ?? "",
      }));
    }
  }, [
    selectedCompanyId,
    values.module,
    values.reference_id,
    referenceOptions,
    referenceQuery.isLoading,
  ]);

  const generatedTitle = [values.task_regarding, selectedCompany?.label, selectedReference?.label]
    .filter(Boolean)
    .join(" - ")
    .slice(0, 255);

  const updateValue = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = taskSchema.safeParse(values);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Check the task details");
      return;
    }

    const payload: Record<string, unknown> = {
      ...result.data,
      title: generatedTitle || `${result.data.task_regarding} task`,
      company: Number(result.data.company),
      assigned_to: result.data.assigned_to ? Number(result.data.assigned_to) : null,
      repeat_frequency: result.data.is_recurring ? result.data.repeat_frequency : null,
      repeat_end_date: result.data.is_recurring ? result.data.repeat_end_date || null : null,
    };

    try {
      const body = toFormData(payload, files);
      removedAttachmentIds.forEach((id) =>
        body.append("remove_attachment_ids", String(id)),
      );
      await save.mutateAsync({
        id: numericTaskId,
        body,
      });
      toast.success(isEdit ? "Task updated" : "Task created");
      await navigate({ to: "/tasks/tasks" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save task");
    }
  };

  if (isEdit && taskQuery.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading task...</div>;
  }

  if (isEdit && (!numericTaskId || taskQuery.isError || !taskQuery.data)) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-sm text-destructive">Task not found.</p>
        <Button variant="outline" onClick={() => navigate({ to: "/tasks/tasks" })}>
          Back to tasks
        </Button>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Back to tasks"
          onClick={() => navigate({ to: "/tasks/tasks" })}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{isEdit ? "Edit Task" : "New Task"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEdit ? "Update task details and reminders." : "Add a follow-up or reminder."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <label>
            <span className={labelClassName}>Module *</span>
            <select
              className={fieldClassName}
              value={values.module}
              onChange={(event) => {
                const module = event.target.value as TaskFormValues["module"];
                setValues((current) => ({ ...current, module, company: "", reference_id: "" }));
              }}
              required
            >
              <option value="">Select module</option>
              {MODULE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          {values.module && (
            <label>
              <span className={labelClassName}>Company *</span>
              <select
                className={fieldClassName}
                value={values.company}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    company: event.target.value,
                    reference_id: "",
                  }))
                }
                disabled={
                  companyQuery.isLoading ||
                  (values.module === "QUOTATION" && referenceQuery.isLoading)
                }
                required
              >
                <option value="">
                  {values.module === "QUOTATION" && selectableCompanies.length === 0
                    ? "No companies with quotations"
                    : "Select company"}
                </option>
                {selectableCompanies.map((company) => (
                  <option key={company.value} value={company.value}>
                    {company.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {values.module && values.company && (
            <label>
              <span className={labelClassName}>
                {values.module === "QUOTATION" ? "Quotation Number" : "Enquiry Date"}
              </span>
              <Input
                value={
                  referenceQuery.isLoading
                    ? values.module === "QUOTATION"
                      ? "Loading quotation number..."
                      : "Loading enquiry date..."
                    : values.module === "QUOTATION"
                      ? (selectedReference?.label ?? "No quotation found")
                      : (selectedReference?.enquiryDate ?? "No enquiry date found")
                }
                readOnly
                aria-readonly="true"
              />
            </label>
          )}

          <label>
            <span className={labelClassName}>Regarding</span>
            <select
              className={fieldClassName}
              value={values.task_regarding}
              onChange={(event) => updateValue("task_regarding", event.target.value)}
            >
              {REGARDING_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "MISCELLANEOUS" ? "Miscellaneous" : option}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={labelClassName}>Follow-up date</span>
            <Input
              required
              type="date"
              value={values.followup_date}
              onChange={(event) => updateValue("followup_date", event.target.value)}
            />
          </label>

          <label>
            <span className={labelClassName}>Priority</span>
            <select
              className={fieldClassName}
              value={values.priority}
              onChange={(event) =>
                updateValue("priority", event.target.value as TaskFormValues["priority"])
              }
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={labelClassName}>Status</span>
            <select
              className={fieldClassName}
              value={values.status}
              onChange={(event) =>
                updateValue("status", event.target.value as TaskFormValues["status"])
              }
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={labelClassName}>Assigned to</span>
            <select
              className={fieldClassName}
              value={values.assigned_to}
              onChange={(event) => updateValue("assigned_to", event.target.value)}
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.value} value={user.value}>
                  {user.label}
                </option>
              ))}
            </select>
          </label>

          <label className="sm:col-span-2">
            <span className={labelClassName}>Description</span>
            <Textarea
              value={values.description}
              onChange={(event) => updateValue("description", event.target.value)}
            />
          </label>

          <label className="flex items-center gap-3 sm:col-span-2">
            <input
              type="checkbox"
              checked={values.is_recurring}
              onChange={(event) => updateValue("is_recurring", event.target.checked)}
              className="size-4 accent-primary"
            />
            <span className="text-sm font-medium">Recurring task</span>
          </label>

          {values.is_recurring && (
            <>
              <label>
                <span className={labelClassName}>Repeat frequency</span>
                <select
                  required
                  className={fieldClassName}
                  value={values.repeat_frequency}
                  onChange={(event) => updateValue("repeat_frequency", event.target.value)}
                >
                  <option value="">Select frequency</option>
                  {FREQUENCY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={labelClassName}>Repeat every</span>
                <Input
                  min={1}
                  required
                  type="number"
                  value={values.repeat_interval}
                  onChange={(event) => updateValue("repeat_interval", Number(event.target.value))}
                />
              </label>
              <label>
                <span className={labelClassName}>Repeat until</span>
                <Input
                  type="date"
                  value={values.repeat_end_date}
                  onChange={(event) => updateValue("repeat_end_date", event.target.value)}
                />
              </label>
            </>
          )}

          <label className="sm:col-span-2">
            <span className={labelClassName}>Remarks</span>
            <Textarea
              value={values.remarks}
              onChange={(event) => updateValue("remarks", event.target.value)}
            />
          </label>

          <div className="sm:col-span-2">
            <span className={labelClassName}>Attachments</span>

            {savedAttachments.length > 0 && (
              <ul className="mb-2 space-y-1 rounded-md border bg-muted/40 p-2">
                {savedAttachments.map((file) => (
                  <li key={file.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{file.file_name}</span>
                    <span className="flex shrink-0 items-center gap-3">
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        View
                      </a>
                      <button
                        type="button"
                        aria-label={`Remove ${file.file_name}`}
                        className="text-xs text-destructive hover:underline"
                        onClick={() => {
                          setSavedAttachments((list) => list.filter((a) => a.id !== file.id));
                          setRemovedAttachmentIds((ids) => [...ids, file.id]);
                        }}
                      >
                        Remove
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {files.length > 0 && (
              <ul className="mb-2 space-y-1 rounded-md border p-2">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${file.lastModified}`}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate">
                      {file.name} <span className="text-xs text-muted-foreground">(new)</span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      className="text-xs text-destructive hover:underline"
                      onClick={() => setFiles((list) => list.filter((_, i) => i !== index))}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <Input
              type="file"
              multiple
              onChange={(event) => {
                const chosen = Array.from(event.target.files ?? []);
                setFiles((current) => [
                  ...current,
                  ...chosen.filter(
                    (c) => !current.some((f) => f.name === c.name && f.size === c.size),
                  ),
                ]);
                event.target.value = ""; // allows re-selecting the same file later
              }}
            />
          </div>
        </div>

        {referenceQuery.isError && (
          <p role="alert" className="text-sm text-destructive">
            Could not load the related enquiries and quotations. Please try again.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          {selectedLead && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setLeadDetailsOpen(true)}
            >
              <Eye className="mr-2 size-4" />
              View Lead Details
            </Button>
          )}
          {selectedQuotation && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setQuotationDetailsOpen(true)}
            >
              <Eye className="mr-2 size-4" />
              View Quotation Details
            </Button>
          )}
          <div className="ml-auto flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/tasks/tasks" })}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                save.isPending ||
                taskQuery.isLoading ||
                companyQuery.isLoading ||
                referenceQuery.isLoading ||
                referenceQuery.isError
              }
            >
              <Save className="mr-2 size-4" />
              {save.isPending ? "Saving..." : isEdit ? "Update Task" : "Create Task"}
            </Button>
          </div>
        </div>
      </form>

      {selectedLead && (
        <Modal
          open={leadDetailsOpen}
          onClose={() => setLeadDetailsOpen(false)}
          title={`Lead - #${selectedLead.srNo}`}
          eyebrow="LEAD DETAILS"
          wide
        >
          <dl className="grid gap-x-6 gap-y-5 p-5 sm:grid-cols-2">
            <LeadDetail label="Company" value={selectedLead.companyName} />
            <LeadDetail label="City" value={selectedLead.companyCity} />
            <LeadDetail label="State" value={selectedLead.companyState} />
            <LeadDetail label="Enquiry Date" value={formatLeadDate(selectedLead.enquiryDate)} />
            <LeadDetail label="Enquiry For" value={formatLeadLabel(selectedLead.enquiryFor)} />
            <LeadDetail label="Status" value={formatLeadLabel(selectedLead.status)} />
            <LeadDetail label="Source" value={formatLeadLabel(selectedLead.source)} />
            <LeadDetail label="Received By" value="—" />
            <LeadDetail label="Assigned To" value="—" />
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase text-muted-foreground">Contacts</dt>
              <dd className="mt-1 text-sm">
                {[selectedLead.contactName, selectedLead.contactMobile, selectedLead.contactEmail]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </dd>
            </div>
            <LeadDetail label="Address" value={selectedLead.companyAddress} wide />
          </dl>
        </Modal>
      )}

      {selectedQuotation && (
        <Modal
          open={quotationDetailsOpen}
          onClose={() => setQuotationDetailsOpen(false)}
          title={`Quotation - ${selectedQuotation.quotationNumber}`}
          eyebrow="QUOTATION DETAILS"
          wide
        >
          <div className="space-y-5 p-5">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
              <LeadDetail label="Company" value={selectedQuotation.companyName} />
              <LeadDetail label="Date" value={formatLeadDate(selectedQuotation.quotationDate)} />
              <LeadDetail label="Status" value={selectedQuotation.status} />
              <LeadDetail label="Total" value={formatMoney(selectedQuotation.totalAmount)} />
              <LeadDetail label="City" value={selectedQuotation.city} />
              <LeadDetail label="State" value={selectedQuotation.state} />
              <LeadDetail label="Delivery" value={selectedQuotation.deliveryTimeline} />
              <LeadDetail label="Tax Type" value={formatLeadLabel(selectedQuotation.taxType)} />
            </dl>

            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium">Requirements</th>
                    <th className="px-3 py-2 font-medium">Remark</th>
                    <th className="px-3 py-2 text-right font-medium">Est. Days</th>
                    <th className="px-3 py-2 text-right font-medium">Unit Price</th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedQuotation.items.map((item, index) => (
                    <tr key={item.id ?? `${item.moduleName}-${index}`} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{item.moduleName || "—"}</td>
                      <td className="px-3 py-2">{item.description || "—"}</td>
                      <td className="px-3 py-2">{item.requirements || "—"}</td>
                      <td className="px-3 py-2">{item.remarks || "—"}</td>
                      <td className="px-3 py-2 text-right">{item.estimatedDays ?? "—"}</td>
                      <td className="px-3 py-2 text-right">
                        {item.estimatedCost == null ? "—" : formatMoney(item.estimatedCost)}
                      </td>
                      <td className="px-3 py-2 text-right">{formatMoney(item.amount)}</td>
                    </tr>
                  ))}
                  {selectedQuotation.items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-5 text-center text-muted-foreground">
                        No quotation items.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <dl className="ml-auto grid max-w-xs gap-2 border-t border-border pt-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt>Subtotal</dt>
                <dd>{formatMoney(selectedQuotation.subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4 font-semibold">
                <dt>Total</dt>
                <dd>{formatMoney(selectedQuotation.totalAmount)}</dd>
              </div>
            </dl>
          </div>
        </Modal>
      )}
    </main>
  );
}
