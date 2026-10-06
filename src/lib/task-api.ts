import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getLeads, getOpportunities, type Lead } from "@/lib/api";
import { request } from "@/lib/api";
import { getQuotations, type Quotation } from "@/lib/quotation-api";

export interface Task {
  id: number;
  title: string;
  description: string;
  module: string;
  task_regarding: string;
  reference_id: string;
  company: number | null;
  company_name: string | null;
  followup_date: string;
  priority: string;
  status: string;
  assigned_to: number | null;
  assigned_to_name: string | null;
  remarks: string;
  is_recurring: boolean;
  repeat_frequency: string | null;
  repeat_interval: number;
  repeat_end_date: string | null;
  followup_history?: TaskFollowupHistory[];
  attachments?: Array<{
    id: number;
    file_name: string;
    file_url: string | null;
  }>;
}

export interface TaskFollowupHistory {
  id: number;
  followup_date: string;
  remark: string;
  updated_by: string;
  timestamp: string;
}

export interface TaskOption {
  value: number;
  label: string;
}

export interface TaskDashboard {
  total: number;
  by_status: { status: string; count: number }[];
  by_priority: { priority: string; count: number }[];
  by_module: { module: string; count: number }[];
  in_progress: number;
  pending: number;
  recurring: number;
  overdue: number;
  due_today: number;
  upcoming: number;
  miscellaneous: number;
  completed: number;
}

interface TaskOptionsResponse {
  companies: TaskOption[];
  users: TaskOption[];
}

export interface TaskReferenceOption {
  value: string;
  label: string;
  companyId: number | null;
  enquiryDate?: string | null;
  quotationDate?: string | null;
  lead?: Lead;
  quotation?: Quotation;
}

export interface TaskReferenceData {
  leads: TaskReferenceOption[];
  opportunities: TaskReferenceOption[];
  quotations: TaskReferenceOption[];
}

function dateSortValue(value?: string | null): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const formattedDate = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  const date = isoDate
    ? new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]))
    : formattedDate
      ? new Date(Number(formattedDate[3]), Number(formattedDate[1]) - 1, Number(formattedDate[2]))
      : new Date(value);
  const timestamp = date.getTime();
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

export function toFormData(values: Record<string, unknown>, files: File[] = []): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  }

  for (const file of files) {
    formData.append("files", file);
    formData.append("file_names", file.name);
  }

  return formData;
}

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: () => request<Task[]>("/tasks/"),
  });
}

export function getTaskDashboard(userId?: string): Promise<TaskDashboard> {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
  return request<TaskDashboard>(`/tasks/dashboard/${query}`);
}

export function useTask(id?: number) {
  return useQuery({
    queryKey: ["task", id],
    queryFn: () => request<Task>(`/tasks/${id}/`),
    enabled: id !== undefined,
  });
}

export function useTaskReferenceData() {
  return useQuery({
    queryKey: ["task-reference-data"],
    queryFn: async (): Promise<TaskReferenceData> => {
      const [leads, opportunities, quotations] = await Promise.all([
        getLeads(),
        getOpportunities(),
        getQuotations(),
      ]);
      const companyByOpportunity = new Map(
        opportunities.map((opportunity) => [opportunity.id, opportunity.companyId]),
      );

      const newestFirst = (
        items: TaskReferenceOption[],
        dateField: "enquiryDate" | "quotationDate",
      ) =>
        items.sort((left, right) => {
          const leftDate = dateSortValue(left[dateField]);
          const rightDate = dateSortValue(right[dateField]);
          return leftDate === rightDate ? 0 : rightDate > leftDate ? 1 : -1;
        });

      return {
        leads: newestFirst(
          leads.map((lead) => ({
            value: lead.id,
            label: `${lead.enquiryDate || "No enquiry date"} · Lead #${lead.srNo}`,
            companyId: lead.companyId,
            enquiryDate: lead.enquiryDate,
            lead,
          })),
          "enquiryDate",
        ),
        opportunities: newestFirst(
          opportunities.map((opportunity) => ({
            value: opportunity.id,
            label: `${opportunity.enquiryDate || "No enquiry date"} · Opportunity #${opportunity.id}`,
            companyId: opportunity.companyId,
            enquiryDate: opportunity.enquiryDate,
          })),
          "enquiryDate",
        ),
        quotations: newestFirst(
          quotations.map((quotation) => ({
            value: quotation.quotationNumber,
            label: quotation.quotationNumber,
            companyId:
              quotation.companyId ?? companyByOpportunity.get(quotation.opportunity) ?? null,
            quotationDate: quotation.quotationDate,
            quotation,
          })),
          "quotationDate",
        ),
      };
    },
  });
}

function useTaskOptions() {
  return useQuery({
    queryKey: ["task-options"],
    queryFn: () => request<TaskOptionsResponse>("/task-options/"),
  });
}

export function useCompanyOptions() {
  const { data, ...query } = useTaskOptions();
  return { ...query, data: data?.companies ?? [] };
}

export function useUserOptions() {
  const { data, ...query } = useTaskOptions();
  return { ...query, data: data?.users ?? [] };
}

export function useSaveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: FormData }) =>
      request<Task>(id ? `/tasks/${id}/` : "/tasks/", {
        method: id ? "PATCH" : "POST",
        body,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => request<void>(`/tasks/${id}/`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}
