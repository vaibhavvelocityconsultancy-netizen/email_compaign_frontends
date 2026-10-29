const configuredApiBase = (
  Reflect.get(import.meta.env, "VITE_API_BASE_URL") as string | undefined
)?.trim().replace(/\/+$/, "");

export function isLocalFrontend(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost");
}

export function getApiBase(): string {
  return isLocalFrontend() ? "/api" : configuredApiBase || "/api";
}

const apiBase = getApiBase();
const accessTokenKey = "vantage.access";
const refreshTokenKey = "vantage.refresh";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_superuser: boolean;
}

interface AuthResponse {
  access: string;
  refresh: string;
  user: AuthUser;
}

interface RefreshResponse {
  access: string;
  refresh?: string;
}

function getStoredToken(key: string): string | null {
  if (typeof window === "undefined") return null;
  window.localStorage.removeItem(key);
  return window.sessionStorage.getItem(key);
}

function storeTokens(tokens: Pick<AuthResponse, "access" | "refresh">): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(accessTokenKey);
  window.localStorage.removeItem(refreshTokenKey);
  window.sessionStorage.setItem(accessTokenKey, tokens.access);
  window.sessionStorage.setItem(refreshTokenKey, tokens.refresh);
}

export function hasAuthTokens(): boolean {
  return Boolean(getStoredToken(accessTokenKey) || getStoredToken(refreshTokenKey));
}

export function clearAuthTokens(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(accessTokenKey);
  window.localStorage.removeItem(refreshTokenKey);
  window.sessionStorage.removeItem(accessTokenKey);
  window.sessionStorage.removeItem(refreshTokenKey);
}

export type LeadStatus = "new" | "active" | "junk" | "hot" | "cold";
export interface LeadChoiceOption {
  value: string;
  label: string;
}
export interface LeadOptionsResponse {
  enquiry_for: LeadChoiceOption[];
  source: LeadChoiceOption[];
  status: LeadChoiceOption[];
}
export type CampaignStatus = "active" | "paused" | "completed";
export type LogStatus =
  | "accepted" | "sent" | "delivered" | "opened" | "read"
  | "clicked" | "failed" | "complained" | "unsubscribed" | "replied";
  

export interface Lead {
  id: string;
  srNo: number;
  unsubscribed: boolean;
  enquiryFor: string;
  enquiryDate: string;
  companyId: number | null;
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyState: string;
  companyPincode: string;
  companyCountry: string;
  companyGstNumber: string;
  categoryId: number | null;
  categoryName: string;
  contactId: number | null;
  contactName: string;
  contactDesignation: string;
  contactMobile: string;
  contactEmail: string;
  source: string;
  status: LeadStatus;
  followupDate: string | null;
  followupRemarks: string;
  isOpportunity: boolean;
  createdAt: string;
}

export interface LeadInput {
  company_name: string;
  company_address: string;
  company_city: string;
  company_state: string;
  company_pincode: string;
  company_country: string;
  company_gst_number: string;
  contact_name: string;
  contact_designation: string;
  contact_mobile: string;
  contact_email: string;
  enquiry_for: string;
  enquiry_date: string;
  source: string;
  status: string;
  followup_date: string | null;
  followup_remarks: string;
  category: number | null;
}

export interface LeadCategory {
  id: number;
  name: string;
  created_at: string;
}

export type OpportunityStatus =
  | "PROSPECTING"
  | "QUALIFICATION"
  | "NEEDS_ANALYSIS"
  | "VALUE_PROPOSITION"
  | "IDENTIFY_DECISION_MAKERS"
  | "PERCEPTION_ANALYSIS"
  | "PROPOSAL_PRICE_QUOTE"
  | "NEGOTIATION_REVIEW"
  | "CLOSED_WON"
  | "CLOSED_LOST";

export type OpportunityModulePriority = "LOW" | "MEDIUM" | "HIGH";

export interface OpportunityModule {
  id?: string;
  moduleNumber: number;
  moduleName: string;
  description: string;
  requirements: string;
  estimatedCost: number | null;
  estimatedDays: number | null;
  priority: OpportunityModulePriority;
  remarks: string;
}

export interface OpportunityModuleInput {
  module_number: number;
  module_name: string;
  description: string;
  requirements: string;
  estimated_cost: number | null;
  estimated_days: number | null;
  priority: OpportunityModulePriority;
  remarks: string;
}

export interface Opportunity {
  id: string;
  companyId: number | null;
  companyName: string;
  projectName: string;
  enquiryFor: string;
  enquiryDate: string | null;
  status: OpportunityStatus;
  source: string;
  expectedCloseDate: string | null;
  estimatedValue: number | null;
  probability: number | null;
  modules: OpportunityModule[];
  createdAt: string;
}

export interface OpportunityInput {
  company_name: string;
  project_name?: string;
  enquiry_for: string;
  enquiry_date: string | null;
  status: OpportunityStatus;
  source?: string;
  expected_close_date?: string | null;
  estimated_value?: number | null;
  probability?: number | null;
  modules?: OpportunityModuleInput[];
}

export type Channel = "email" | "whatsapp";

export interface MessageTemplate {
  id: string;
  channel: Channel;
  name: string;
  categoryId: number | null;
  categoryName: string;
  subject: string;
  body: string;
  signature: string;
  signatureProfileId?: string | null;
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
  sendTime: string;
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
    sendTime: string;
  }>;
}

export interface Campaign {
  id: string;
  name: string;
  categoryId: string;
  sequenceId: string;
  replyToEmail: string;
  leadIds: string[];
  status: CampaignStatus;
  createdAt: string;
}

export interface AutomaticEmailResult {
  sent: number;
  failed: number;
}

export interface CampaignLead {
  leadId: string;
  email: string;
  currentStep: number;
  lastEmailStatus: "sent" | "pending" | "completed" | "failed";
  replied: boolean;
  unsubscribed: boolean;
  unsubscribedAt: string | null;
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

export interface InboundReply {
  id: number;
  status: LogStatus | "unmatched";
  sender_email: string;
  recipient_email?: string;
  subject?: string;
  body_plain?: string;
  received_at: string;
  lead: { id: number; name: string; email: string | null } | null;
  campaign: { id: number; name: string } | null;
}

interface ApiLead {
  sr_no: number;
  unsubscribed: boolean;
  company: number | null;
  contact: number | null;
  company_name: string;
  company_address: string;
  company_city: string;
  company_state: string;
  company_pincode: string;
  company_country: string;
  company_gst_number: string;
  category: number | null;
  category_name: string;
  contact_name: string;
  contact_designation: string;
  contact_mobile: string;
  contact_email: string;
  enquiry_for: "LEAD" | "CLIENT";
  enquiry_date: string;
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
  category: number | null;
  category_name: string;
  subject: string;
  body: string;
  signature: string;
  signature_profile: number | null;
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
  send_time: string | null;
}

interface ApiBatch {
  id: number;
  name: string;
  category: number | null;
  category_name: string;
  sequence: number | null;
  reply_to_email: string;
  status: CampaignStatus;
  created_at: string;
  automatic_email?: AutomaticEmailResult;
}

interface ApiBatchLead {
  id: number;
  lead: number;
  email: string;
  current_step: number;
  replied: boolean;
  unsubscribed: boolean;
  unsubscribed_at: string | null;
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

interface SendNowResponse {
  sent: number;
  failed: number;
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
  row_errors?: Array<{ row: number; errors: Record<string, string[]> }>;
}

function makeApiUrl(path: string): URL {
  const baseUrl = typeof window === "undefined" ? "http://127.0.0.1:8000" : window.location.origin;
  return new URL(`${apiBase}${path}`, baseUrl);
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getStoredToken(refreshTokenKey);
  if (!refresh) return null;

  try {
    const response = await fetch(makeApiUrl("/auth/refresh/"), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!response.ok) throw new Error("Session expired");
    const tokens = (await response.json()) as RefreshResponse;
    storeTokens({ access: tokens.access, refresh: tokens.refresh ?? refresh });
    return tokens.access;
  } catch {
    clearAuthTokens();
    return null;
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = makeApiUrl(path);
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const publicAuthPaths = ["/auth/login/", "/auth/register/", "/auth/refresh/", "/auth/logout/"];
  const isPublicAuthRequest = publicAuthPaths.includes(path);
  const accessToken = getStoredToken(accessTokenKey);
  if (accessToken && !isPublicAuthRequest) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response = await fetch(url, { ...init, headers });
  if (response.status === 401 && !isPublicAuthRequest) {
    const refreshedAccessToken = await refreshAccessToken();
    if (refreshedAccessToken) {
      const retryHeaders = new Headers(headers);
      retryHeaders.set("Authorization", `Bearer ${refreshedAccessToken}`);
      response = await fetch(url, { ...init, headers: retryHeaders });
    }
  }

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

export async function loginUser(email: string, password: string): Promise<AuthUser> {
  const result = await request<AuthResponse>("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  storeTokens(result);
  return result.user;
}

export async function registerUser(data: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}): Promise<AuthUser> {
  const result = await request<AuthResponse>("/auth/register/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  storeTokens(result);
  return result.user;
}

export function getCurrentUser(): Promise<AuthUser> {
  return request<AuthUser>("/auth/me/");
}

export async function logoutUser(): Promise<void> {
  const refresh = getStoredToken(refreshTokenKey);
  try {
    if (refresh) {
      await request<void>("/auth/logout/", {
        method: "POST",
        body: JSON.stringify({ refresh }),
      });
    }
  } finally {
    clearAuthTokens();
  }
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
    unsubscribed: lead.unsubscribed,
    enquiryFor: lead.enquiry_for,
    enquiryDate: lead.enquiry_date,
    companyId: lead.company,
    companyName: lead.company_name,
    companyAddress: lead.company_address,
    companyCity: lead.company_city,
    companyState: lead.company_state,
    companyPincode: lead.company_pincode,
    companyCountry: lead.company_country,
    companyGstNumber: lead.company_gst_number,
    categoryId: lead.category,
    categoryName: lead.category_name,
    contactId: lead.contact,
    contactName: lead.contact_name,
    contactDesignation: lead.contact_designation,
    contactMobile: lead.contact_mobile,
    contactEmail: lead.contact_email,
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
    categoryId: template.category,
    categoryName: template.category_name,
    subject: template.subject,
    body: template.body,
    signature: template.signature,
    signatureProfileId: template.signature_profile == null ? null : String(template.signature_profile),
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

export async function getLead(id: string): Promise<Lead> {
  const lead = await request<ApiLead>(`/leads/${id}/`);
  return mapLead(lead);
}

export async function getLeadOptions(): Promise<LeadOptionsResponse> {
  return request<LeadOptionsResponse>("/lead-options/");
}

export function getLeadCategories(): Promise<LeadCategory[]> {
  return request<LeadCategory[]>("/lead-categories/");
}

export function createLeadCategory(name: string): Promise<LeadCategory> {
  return request<LeadCategory>("/lead-categories/", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
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

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<Lead> {
  const lead = await request<ApiLead>(`/leads/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ status: status.toUpperCase() }),
  });
  return mapLead(lead);
}

export async function deleteLead(id: string): Promise<void> {
  await request<void>(`/leads/${id}/`, { method: "DELETE" });
}

function mapOpportunity(opportunity: Record<string, unknown>): Opportunity {
  const modules = Array.isArray(opportunity.modules)
    ? opportunity.modules.map((module) => {
        const item = module as Record<string, unknown>;
        return {
          id: item.id == null ? undefined : String(item.id),
          moduleNumber: Number(item.module_number ?? 0),
          moduleName: String(item.module_name ?? ""),
          description: String(item.description ?? ""),
          requirements: String(item.requirements ?? ""),
          estimatedCost: item.estimated_cost == null ? null : Number(item.estimated_cost),
          estimatedDays: item.estimated_days == null ? null : Number(item.estimated_days),
          priority: String(item.priority ?? "MEDIUM") as OpportunityModulePriority,
          remarks: String(item.remarks ?? ""),
        };
      })
    : [];

  return {
    id: String(opportunity.id),
    companyId:
      typeof opportunity.company === "object" && opportunity.company
        ? Number((opportunity.company as Record<string, unknown>).id)
        : opportunity.company == null
          ? null
          : Number(opportunity.company),
    companyName: String(opportunity.company_name ?? ""),
    projectName: String(opportunity.project_name ?? ""),
    enquiryFor: String(opportunity.enquiry_for ?? ""),
    enquiryDate: (opportunity.enquiry_date as string | null | undefined) ?? null,
    status: String(opportunity.status ?? "PROSPECTING") as OpportunityStatus,
    source: String(opportunity.source ?? ""),
    expectedCloseDate: (opportunity.expected_close_date as string | null | undefined) ?? null,
    estimatedValue: opportunity.estimated_value == null ? null : Number(opportunity.estimated_value),
    probability: opportunity.probability == null ? null : Number(opportunity.probability),
    modules,
    createdAt: String(opportunity.created_at ?? ""),
  };
}

export async function getOpportunities(): Promise<Opportunity[]> {
  const opportunities = await request<Record<string, unknown>[]>("/opportunities/");
  return opportunities.map(mapOpportunity);
}

export async function createOpportunity(data: OpportunityInput): Promise<Opportunity> {
  const opportunity = await request<Record<string, unknown>>("/opportunities/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return mapOpportunity(opportunity);
}

export async function updateOpportunity(id: string, data: OpportunityInput): Promise<Opportunity> {
  const opportunity = await request<Record<string, unknown>>(`/opportunities/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return mapOpportunity(opportunity);
}

export async function deleteOpportunity(id: string): Promise<void> {
  await request<void>(`/opportunities/${id}/`, { method: "DELETE" });
}

export async function convertOpportunityToQuotation(
  opportunityId: string,
  companyId: number,
  items: Array<{ module: number; amount: string }>,
): Promise<{ message: string; quotation: Record<string, unknown> }> {
  return request<{ message: string; quotation: Record<string, unknown> }>(`/opportunities/${opportunityId}/convert-to-quotation/`, {
    method: "POST",
    body: JSON.stringify({ company_id: companyId, items }),
  });
}

export async function importLeads(file: File): Promise<ApiImportResponse> {
  const form = new FormData();
  form.append("file", file);
  return request<ApiImportResponse>("/leads/import-csv/", { method: "POST", body: form });
}

export async function createSampleLeads(): Promise<{ created: number; existing: number }> {
  return request<{ created: number; existing: number }>("/leads/sample-data/", {
    method: "POST",
  });
}

export async function getTemplates(): Promise<MessageTemplate[]> {
  const templates = await request<ApiTemplate[]>("/email-templates/");
  return templates.map(mapTemplate);
}

export interface EmailSignature {
  id: string;
  name: string;
  text: string;
  logoUrl?: string;
  logoName?: string;
  isDefault: boolean;
}

export interface TemplateInput {
  signatureId?: string | null;
  channel: Channel;
  name: string;
  categoryId?: number | null;
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
  if (data.categoryId !== undefined) {
    form.append("category", data.categoryId === null ? "" : String(data.categoryId));
  }
  form.append("subject", data.subject);
  form.append("body", data.body);
  form.append("signature", data.signature);
  if (data.signatureId !== undefined) form.append("signature_profile", data.signatureId || "");
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

export async function getEmailSignatures(): Promise<EmailSignature[]> {
  const signatures = await request<Array<{ id: number; name: string; text: string; logo: string | null; is_default: boolean }>>("/email-signatures/");
  return signatures.map((signature) => {
    const logoName = fileName(signature.logo);
    return {
      id: String(signature.id),
      name: signature.name,
      text: signature.text,
      logoUrl: signature.logo || undefined,
      ...(logoName ? { logoName } : {}),
      isDefault: signature.is_default,
    };
  });
}

export async function saveEmailSignature(
  id: string | null,
  data: { name: string; text: string; logo?: File; isDefault: boolean },
): Promise<EmailSignature> {
  const form = new FormData();
  form.append("name", data.name);
  form.append("text", data.text);
  form.append("is_default", String(data.isDefault));
  if (data.logo) form.append("logo", data.logo);
  const signature = await request<{ id: number; name: string; text: string; logo: string | null; is_default: boolean }>(
    id ? `/email-signatures/${id}/` : "/email-signatures/",
    { method: id ? "PATCH" : "POST", body: form },
  );
  return {
    id: String(signature.id), name: signature.name, text: signature.text,
    logoUrl: signature.logo || undefined, logoName: fileName(signature.logo),
    isDefault: signature.is_default,
  };
}

export async function deleteEmailSignature(id: string): Promise<void> {
  await request<void>(`/email-signatures/${id}/`, { method: "DELETE" });
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
        sendTime: step.send_time ?? "",
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
      sendTime: step.send_time ?? "",
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
      send_time: step.sendTime || null,
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
    categoryId: batch.category === null ? "" : String(batch.category),
    sequenceId: batch.sequence === null ? "" : String(batch.sequence),
    replyToEmail: batch.reply_to_email,
    leadIds: batchLeads.map((lead) => String(lead.lead)),
    status: batch.status,
    createdAt: batch.created_at,
  };
}

export async function getBatches(): Promise<Campaign[]> {
  const batches = await request<ApiBatch[]>("/batches/");
  return Promise.all(batches.map(mapBatch));
}

export async function createBatch(data: {
  name: string;
  categoryId?: string;
  sequenceId?: string;
  templateId?: string;
  leadIds: string[];
}): Promise<{ campaign: Campaign; automaticEmail?: AutomaticEmailResult }> {
  const response = await request<ApiBatch>("/batches/", {
    method: "POST",
    body: JSON.stringify({
      name: data.name,
      ...(data.categoryId ? { category: Number(data.categoryId) } : {}),
      ...(data.sequenceId ? { sequence: Number(data.sequenceId) } : {}),
      ...(data.templateId ? { template: Number(data.templateId) } : {}),
      lead_ids: data.leadIds.map(Number),
    }),
  });
  return {
    campaign: await mapBatch(response),
    ...(response.automatic_email
      ? { automaticEmail: response.automatic_email }
      : {}),
  };
}

export async function updateBatch(
  id: string,
  data: {
    name: string;
    categoryId?: string | null;
    sequenceId?: string | null;
    leadIds: string[];
  },
): Promise<Campaign> {
  const batch = await request<ApiBatch>(`/batches/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({
      name: data.name,
      ...(data.categoryId !== undefined
        ? { category: data.categoryId ? Number(data.categoryId) : null }
        : {}),
      ...(data.sequenceId !== undefined
        ? { sequence: data.sequenceId ? Number(data.sequenceId) : null }
        : {}),
      lead_ids: data.leadIds.map(Number),
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
    unsubscribedAt: lead.unsubscribed_at,
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

export async function getInboundReplies(): Promise<InboundReply[]> {
  return request<InboundReply[]>("/inbound-replies/");
}

export async function sendInboundReply(id: number, subject: string, body: string): Promise<{ detail: string }> {
  return request<{ detail: string }>(`/inbound-replies/${id}/`, {
    method: "POST",
    body: JSON.stringify({ subject, body }),
  });
}

export async function getRecentEmailLogs(): Promise<EmailLog[]> {
  const logs = await request<ApiEmailLog[]>("/email-logs/?limit=50");
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

export async function resumeBatch(
  id: string,
): Promise<{ status: CampaignStatus; automaticEmail?: AutomaticEmailResult }> {
  const response = await request<{
    status: CampaignStatus;
    automatic_email?: AutomaticEmailResult;
  }>(`/batches/${id}/resume/`, { method: "PATCH" });
  return {
    status: response.status,
    ...(response.automatic_email
      ? { automaticEmail: response.automatic_email }
      : {}),
  };
}

export async function sendBatchNow(
  id: string,
  data: { templateId: string },
): Promise<SendNowResponse> {
  return request<SendNowResponse>(`/batches/${id}/send-now/`, {
    method: "POST",
    body: JSON.stringify({
      template: Number(data.templateId),
    }),
  });
}

export async function sendBatchLeadNow(
  batchId: string,
  leadId: string,
): Promise<SendNowResponse> {
  return request<SendNowResponse>(`/batches/${batchId}/leads/${leadId}/send-now/`, {
    method: "POST",
  });
}
