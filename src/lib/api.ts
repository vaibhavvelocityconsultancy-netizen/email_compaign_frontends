const configuredApiBase = (Reflect.get(import.meta.env, "VITE_API_BASE_URL") as string | undefined)?.replace(/\/+$/, "");
const apiBase = configuredApiBase || "/api";

export type LeadStatus = "new" | "active" | "junk" | "hot" | "cold";
export type CampaignStatus = "active" | "paused" | "completed";
export type LogStatus =
  | "accepted" | "sent" | "delivered" | "opened" | "read"
  | "clicked" | "failed" | "complained" | "unsubscribed" | "replied";
  

export interface Lead {
  id: string;
  srNo: number;
  enquiryFor: "LEAD" | "CLIENT";
  enquiryDate: string;
  leadReceivedBy: number;
  leadReceivedByName: string;
  leadAssignTo: number | null;
  leadAssignToName: string | null;
  source: string;
  status: LeadStatus;
  followupDate: string | null;
  followupRemarks: string;
  isOpportunity: boolean;
  createdAt: string;
}

export interface LeadInput {
  enquiry_for: "LEAD" | "CLIENT";
  enquiry_date: string;
  lead_received_by: number;
  lead_assign_to: number | null;
  source: string;
  status: string;
  followup_date: string | null;
  followup_remarks: string;
  is_opportunity: boolean;
}

export interface LeadUser {
  id: number;
  name: string;
}

export type Channel = "email" | "whatsapp";

export interface MessageTemplate {
  id: string;
  channel: Channel;
  name: string;
  subject: string;
  body: string;
  signature: string;
  logoName?: string;
  attachmentName?: string;
  waTemplateName?: string;
  waLanguage?: string;
  waStatus?: string; // pending / approved / rejected, read-only
  createdAt: string;
}

export type EmailTemplate = MessageTemplate; // alias so old imports keep working


export interface SequenceStep {
  id: string;
  templateId: string;
  delayDays: number;
  delayMinutes: number;
}

export interface Sequence {
  id: string;
  name: string;
  description: string;
  steps: SequenceStep[];
}

export interface SequenceInput {
  name: string;
  description: string;
  steps: Array<{
    templateId: string;
    delayDays: number;
    delayMinutes: number;
  }>;
}

export interface Campaign {
  id: string;
  name: string;
  sequenceId: string;
  leadIds: string[];
  enquiryDateFrom?: string | null;
  enquiryDateTo?: string | null;
  status: CampaignStatus;
  createdAt: string;
}

export interface CampaignLead {
  leadId: string;
  currentStep: number;
  lastEmailStatus: "sent" | "pending" | "completed" | "failed";
  replied: boolean;
  unsubscribed: boolean;
  completed: boolean;
}

export interface EmailLog {
  id: string;
  batchId: string;
  leadId: string;
  step: number;
  status: LogStatus;
  sentAt: string;
  subject: string;
  templateName: string;
  error?: string;
}

interface ApiLead {
  sr_no: number;
  enquiry_for: "LEAD" | "CLIENT";
  enquiry_date: string;
  lead_received_by: number;
  lead_received_by_name: string;
  lead_assign_to: number | null;
  lead_assign_to_name: string | null;
  source: string;
  status: string;
  followup_date: string | null;
  followup_remarks: string;
  is_opportunity: boolean;
  created_at: string;
}

interface ApiTemplate {
  id: number;
  channel: Channel;
  name: string;
  subject: string;
  body: string;
  signature: string;
  logo: string | null;
  attachment: string | null;
  wa_template_name: string;
  wa_language: string;
  wa_status: string;
  created_at: string;
}

interface ApiSequence {
  id: number;
  name: string;
  description: string;
}

interface ApiSequenceStep {
  id: number;
  sequence: number;
  step_number: number;
  template: number;
  delay_days: number;
  delay_minutes: number;
}

interface ApiBatch {
  id: number;
  name: string;
  sequence: number;
  enquiry_date_from: string | null;
  enquiry_date_to: string | null;
  status: CampaignStatus;
  created_at: string;
}

interface ApiBatchLead {
  id: number;
  lead: number;
  email: string;
  current_step: number;
  replied: boolean;
  unsubscribed: boolean;
  completed: boolean;
  last_email_sent_at: string | null;
}

interface ApiEmailLog {
  id: number;
  batch: number;
  lead: number;
  step_number: number;
  status: LogStatus;
  sent_at: string;
  subject: string;
  template_name: string | null;
  error: string;
}

interface ApiLeadsResponse {
  count: number;
  results: ApiLead[];
}

interface ApiImportResponse {
  imported: number;
  total_rows: number;
  duplicates: number;
  invalid: number;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const baseUrl = typeof window === "undefined" ? "http://127.0.0.1:8000" : window.location.origin;
  const url = new URL(`${apiBase}${path}`, baseUrl);
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...init, headers });
  const responseText = await response.text();
  let payload: unknown;

  try {
    payload = responseText ? JSON.parse(responseText) : undefined;
  } catch {
    payload = responseText;
  }

  if (!response.ok) {
    throw new Error(formatApiError(payload, response.statusText));
  }

  return payload as T;
}

function formatApiError(payload: unknown, fallback: string): string {
  if (typeof payload === "string") return payload || fallback;
  if (payload && typeof payload === "object") {
    const errors = Object.entries(payload as Record<string, unknown>).map(([field, value]) => {
      const message = Array.isArray(value) ? value.join(" ") : String(value);
      return field === "detail" ? message : `${field}: ${message}`;
    });
    if (errors.length) return errors.join("; ");
  }
  return fallback || "The request failed";
}

function fileName(url: string | null): string | undefined {
  const name = url?.split("?")[0]?.split("/").pop();
  return name ? decodeURIComponent(name) : undefined;
}

function mapLead(lead: ApiLead): Lead {
  return {
    id: String(lead.sr_no),
    srNo: lead.sr_no,
    enquiryFor: lead.enquiry_for,
    enquiryDate: lead.enquiry_date,
    leadReceivedBy: lead.lead_received_by,
    leadReceivedByName: lead.lead_received_by_name,
    leadAssignTo: lead.lead_assign_to,
    leadAssignToName: lead.lead_assign_to_name,
    source: lead.source,
    status: lead.status.toLowerCase() as LeadStatus,
    followupDate: lead.followup_date,
    followupRemarks: lead.followup_remarks,
    isOpportunity: lead.is_opportunity,
    createdAt: lead.created_at,
  };
}

function mapTemplate(template: ApiTemplate): MessageTemplate {
  const logoName = fileName(template.logo);
  const attachmentName = fileName(template.attachment);
  return {
    id: String(template.id),
    channel: template.channel ?? "email",
    name: template.name,
    subject: template.subject,
    body: template.body,
    signature: template.signature,
    ...(logoName ? { logoName } : {}),
    ...(attachmentName ? { attachmentName } : {}),
    waTemplateName: template.wa_template_name,
    waLanguage: template.wa_language,
    waStatus: template.wa_status,
    createdAt: template.created_at,
  };
}

export async function getLeads(): Promise<Lead[]> {
  const response = await request<ApiLeadsResponse>("/leads/");
  return response.results.map(mapLead);
}

export async function getLeadUsers(): Promise<LeadUser[]> {
  return request<LeadUser[]>("/lead-users/");
}

export async function createLead(data: LeadInput): Promise<Lead> {
  const lead = await request<ApiLead>("/leads/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return mapLead(lead);
}

export async function updateLead(id: string, data: LeadInput): Promise<Lead> {
  const lead = await request<ApiLead>(`/leads/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return mapLead(lead);
}

export async function deleteLead(id: string): Promise<void> {
  await request<void>(`/leads/${id}/`, { method: "DELETE" });
}

export async function importLeads(file: File): Promise<ApiImportResponse> {
  const form = new FormData();
  form.append("file", file);
  return request<ApiImportResponse>("/leads/import-csv/", { method: "POST", body: form });
}

export async function getTemplates(): Promise<MessageTemplate[]> {
  const templates = await request<ApiTemplate[]>("/email-templates/");
  return templates.map(mapTemplate);
}

export interface TemplateInput {
  channel: Channel;
  name: string;
  subject: string;
  body: string;
  signature: string;
  waTemplateName?: string;
  waLanguage?: string;
  logo?: File;
  attachment?: File;
}

function templateForm(data: TemplateInput): FormData {
  const form = new FormData();
  form.append("channel", data.channel);
  form.append("name", data.name);
  form.append("subject", data.subject);
  form.append("body", data.body);
  form.append("signature", data.signature);
  form.append("wa_template_name", data.waTemplateName ?? "");
  form.append("wa_language", data.waLanguage ?? "");
  if (data.logo) form.append("logo", data.logo);
  if (data.attachment) form.append("attachment", data.attachment);
  return form;
}

export async function createTemplate(data: TemplateInput): Promise<MessageTemplate> {
  const template = await request<ApiTemplate>("/email-templates/", {
    method: "POST",
    body: templateForm(data),
  });
  return mapTemplate(template);
}

export async function updateTemplate(id: string, data: TemplateInput): Promise<MessageTemplate> {
  const template = await request<ApiTemplate>(`/email-templates/${id}/`, {
    method: "PATCH",
    body: templateForm(data),
  });
  return mapTemplate(template);
}

export async function deleteTemplate(id: string): Promise<void> {
  await request<void>(`/email-templates/${id}/`, { method: "DELETE" });
}

export async function getSequences(): Promise<Sequence[]> {
  const [sequences, steps] = await Promise.all([
    request<ApiSequence[]>("/email-sequences/"),
    request<ApiSequenceStep[]>("/sequence-steps/"),
  ]);

  return sequences.map((sequence) => ({
    id: String(sequence.id),
    name: sequence.name,
    description: sequence.description,
    steps: steps
      .filter((step) => step.sequence === sequence.id)
      .map((step) => ({
        id: String(step.id),
        templateId: String(step.template),
        delayDays: step.delay_days,
        delayMinutes: step.delay_minutes,
      })),
  }));
}

function mapSequence(sequence: ApiSequence & { steps?: ApiSequenceStep[] }): Sequence {
  return {
    id: String(sequence.id),
    name: sequence.name,
    description: sequence.description,
    steps: (sequence.steps ?? []).map((step) => ({
      id: String(step.id),
      templateId: String(step.template),
      delayDays: step.delay_days,
      delayMinutes: step.delay_minutes,
    })),
  };
}

function sequencePayload(data: SequenceInput) {
  return {
    name: data.name,
    description: data.description,
    steps: data.steps.map((step, index) => ({
      step_number: index + 1,
      template: Number(step.templateId),
      delay_days: step.delayDays,
      delay_minutes: step.delayMinutes,
    })),
  };
}

export async function createSequence(data: SequenceInput): Promise<Sequence> {
  const sequence = await request<ApiSequence & { steps: ApiSequenceStep[] }>("/email-sequences/", {
    method: "POST",
    body: JSON.stringify(sequencePayload(data)),
  });
  return mapSequence(sequence);
}

export async function updateSequence(id: string, data: SequenceInput): Promise<Sequence> {
  const sequence = await request<ApiSequence & { steps: ApiSequenceStep[] }>(`/email-sequences/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(sequencePayload(data)),
  });
  return mapSequence(sequence);
}

export async function deleteSequence(id: string): Promise<void> {
  await request<void>(`/email-sequences/${id}/`, { method: "DELETE" });
}

async function mapBatch(batch: ApiBatch): Promise<Campaign> {
  const batchLeads = await request<ApiBatchLead[]>(`/batches/${batch.id}/leads/`);
  return {
    id: String(batch.id),
    name: batch.name,
    sequenceId: String(batch.sequence),
    leadIds: batchLeads.map((lead) => String(lead.lead)),
    enquiryDateFrom: batch.enquiry_date_from,
    enquiryDateTo: batch.enquiry_date_to,
    status: batch.status,
    createdAt: batch.created_at,
  };
}

export async function getBatches(): Promise<Campaign[]> {
  const batches = await request<ApiBatch[]>("/batches/");
  return Promise.all(batches.map(mapBatch));
}

export async function createBatch(data: { name: string; sequenceId: string; leadIds: string[]; enquiryDateFrom?: string; enquiryDateTo?: string }): Promise<Campaign> {
  const batch = await request<ApiBatch>("/batches/", {
    method: "POST",
    body: JSON.stringify({
      name: data.name,
      sequence: Number(data.sequenceId),
      lead_ids: data.leadIds.map(Number),
      enquiry_date_from: data.enquiryDateFrom || null,
      enquiry_date_to: data.enquiryDateTo || null,
    }),
  });
  return mapBatch(batch);
}

export async function updateBatch(id: string, data: { name: string; sequenceId: string; leadIds: string[]; enquiryDateFrom?: string; enquiryDateTo?: string }): Promise<Campaign> {
  const batch = await request<ApiBatch>(`/batches/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({
      name: data.name,
      sequence: Number(data.sequenceId),
      lead_ids: data.leadIds.map(Number),
      enquiry_date_from: data.enquiryDateFrom || null,
      enquiry_date_to: data.enquiryDateTo || null,
    }),
  });
  return mapBatch(batch);
}

export async function getBatchLeads(id: string): Promise<CampaignLead[]> {
  const leads = await request<ApiBatchLead[]>(`/batches/${id}/leads/`);
  return leads.map((lead) => ({
    leadId: String(lead.lead),
    email: lead.email,
    currentStep: lead.current_step,
    lastEmailStatus: lead.completed ? "completed" : "pending",
    replied: lead.replied,
    unsubscribed: lead.unsubscribed,
    completed: lead.completed,
  }));
}

export async function deleteBatch(id: string): Promise<void> {
  await request<void>(`/batches/${id}/`, { method: "DELETE" });
}

export async function getEmailLogs(): Promise<EmailLog[]> {
  const logs = await request<ApiEmailLog[]>("/email-logs/");
  return logs.map((log) => ({
    id: String(log.id),
    batchId: String(log.batch),
    leadId: String(log.lead),
    step: log.step_number,
    status: log.status,
    sentAt: log.sent_at,
    subject: log.subject,
    templateName: log.template_name ?? "",
    ...(log.error ? { error: log.error } : {}),
  }));
}

export async function pauseBatch(id: string): Promise<void> {
  await request<void>(`/batches/${id}/pause/`, { method: "PATCH" });
}

export async function resumeBatch(id: string): Promise<void> {
  await request<void>(`/batches/${id}/resume/`, { method: "PATCH" });
}