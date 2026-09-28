// Centralized mock API service. Swap these implementations for real
// Django REST calls (/api/leads/, /api/batches/, ...) later — the
// function signatures already mirror the expected endpoints.

export type LeadStatus = "new" | "contacted" | "replied" | "unsubscribed" | "completed";
export type CampaignStatus = "active" | "paused" | "completed" | "draft";
export type LogStatus = "sent" | "failed" | "replied";

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  source: string;
  status: LeadStatus;
  createdAt: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  signature: string;
  logoName?: string;
  attachmentName?: string;
  createdAt: string;
}

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

export interface Campaign {
  id: string;
  name: string;
  sequenceId: string;
  leadIds: string[];
  status: CampaignStatus;
  emailsSent: number;
  failed: number;
  replies: number;
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
  leadId: string;
  step: number;
  status: LogStatus;
  sentAt: string;
  subject: string;
  templateName: string;
  error?: string;
}

const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();

const SOURCES = ["Website", "Referral", "LinkedIn", "Cold Outreach", "Event"];
const COMPANIES = ["Acme Corp", "Globex", "Initech", "Umbrella", "Hooli", "Stark Industries", "Wayne Enterprises", "Soylent", "Cyberdyne", "Aperture"];
const FIRST = ["John", "Rahul", "Amit", "Priya", "Sara", "David", "Meera", "Carlos", "Yuki", "Anna", "Tom", "Nina", "Vikram", "Elena", "Marcus", "Lena", "Arjun", "Sofia", "Ben", "Kavya"];
const LAST = ["Sharma", "Patel", "Smith", "Garcia", "Kim", "Müller", "Rossi", "Tanaka", "Singh", "Dubois", "Novak", "Silva", "Khan", "Berg", "Costa", "Iyer"];

function makeLeads(): Lead[] {
  const statuses: LeadStatus[] = ["new", "contacted", "replied", "completed", "unsubscribed"];
  const leads: Lead[] = [];
  for (let i = 0; i < 42; i++) {
    const fn = FIRST[i % FIRST.length]!;
    const ln = LAST[(i * 3) % LAST.length]!;
    leads.push({
      id: `lead-${i + 1}`,
      name: `${fn} ${ln}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@example.com`,
      company: COMPANIES[i % COMPANIES.length]!,
      phone: `+1 555-01${String(10 + i)}`,
      source: SOURCES[i % SOURCES.length]!,
      status: statuses[i % statuses.length]!,
      createdAt: daysAgo(i * 2 + 1),
    });
  }
  return leads;
}

let leads = makeLeads();

let templates: EmailTemplate[] = [
  {
    id: "tpl-1",
    name: "Follow Up Day 0",
    subject: "Thank you for your interest",
    body: "Hi {{name}},\n\nThanks for reaching out! I wanted to introduce ourselves and share how we can help {{company}}.\n\nWould you be open to a quick 15-minute call this week?",
    signature: "Best regards,\nThe Sales Team",
    createdAt: daysAgo(30),
  },
  {
    id: "tpl-2",
    name: "Follow Up Day 3",
    subject: "Following up on my previous email",
    body: "Hi {{name}},\n\nJust bumping this to the top of your inbox. I think there's a strong fit between what we do and what {{company}} is working on.\n\nHappy to send over a short case study if useful.",
    signature: "Best regards,\nThe Sales Team",
    createdAt: daysAgo(28),
  },
  {
    id: "tpl-3",
    name: "Follow Up Day 6",
    subject: "Checking back one last time",
    body: "Hi {{name}},\n\nI don't want to be a bother, so this will be my last note. If the timing is ever right, my door is open.\n\nWishing you and {{company}} all the best.",
    signature: "Best regards,\nThe Sales Team",
    createdAt: daysAgo(25),
  },
  {
    id: "tpl-4",
    name: "Lead Introduction",
    subject: "Quick intro — {{company}} + us",
    body: "Hi {{name}},\n\nI noticed {{company}} recently and think we could help with your outreach goals. Here's a 2-minute overview of what we do.",
    signature: "Cheers,\nThe Growth Team",
    createdAt: daysAgo(20),
  },
];

let sequences: Sequence[] = [
  {
    id: "seq-1",
    name: "Standard Follow Up",
    description: "Three-touch follow up over 6 days for warm leads.",
    steps: [
      { id: "st-1", templateId: "tpl-1", delayDays: 0, delayMinutes: 0 },
      { id: "st-2", templateId: "tpl-2", delayDays: 3, delayMinutes: 0 },
      { id: "st-3", templateId: "tpl-3", delayDays: 3, delayMinutes: 0 },
    ],
  },
  {
    id: "seq-2",
    name: "Lead Introduction",
    description: "Short intro sequence for brand-new leads.",
    steps: [
      { id: "st-4", templateId: "tpl-4", delayDays: 0, delayMinutes: 0 },
      { id: "st-5", templateId: "tpl-2", delayDays: 2, delayMinutes: 30 },
    ],
  },
];

let campaigns: Campaign[] = [
  { id: "cmp-1", name: "Product Follow Up", sequenceId: "seq-1", leadIds: leads.slice(0, 18).map((l) => l.id), status: "active", emailsSent: 8940, failed: 41, replies: 554, createdAt: daysAgo(12) },
  { id: "cmp-2", name: "New Leads", sequenceId: "seq-2", leadIds: leads.slice(18, 30).map((l) => l.id), status: "paused", emailsSent: 3120, failed: 18, replies: 146, createdAt: daysAgo(9) },
  { id: "cmp-3", name: "Enterprise Nurture", sequenceId: "seq-1", leadIds: leads.slice(30, 38).map((l) => l.id), status: "active", emailsSent: 1860, failed: 9, replies: 173, createdAt: daysAgo(6) },
  { id: "cmp-4", name: "Q2 Re-engagement", sequenceId: "seq-2", leadIds: leads.slice(4, 14).map((l) => l.id), status: "completed", emailsSent: 2400, failed: 22, replies: 70, createdAt: daysAgo(20) },
];

let campaignLeads: Record<string, CampaignLead[]> = {};
for (const c of campaigns) {
  campaignLeads[c.id] = c.leadIds.map((leadId, i) => ({
    leadId,
    currentStep: (i % 3) + 1,
    lastEmailStatus: (["sent", "pending", "completed", "failed"] as const)[i % 4]!,
    replied: i % 5 === 0,
    unsubscribed: i % 11 === 0,
    completed: i % 4 === 2,
  }));
}

let logs: EmailLog[] = [];
{
  const statuses: LogStatus[] = ["sent", "sent", "sent", "replied", "failed"];
  for (let i = 0; i < 60; i++) {
    const lead = leads[i % leads.length]!;
    const tpl = templates[i % templates.length]!;
    const st = statuses[i % statuses.length]!;
    logs.push({
      id: `log-${i + 1}`,
      leadId: lead.id,
      step: (i % 3) + 1,
      status: st,
      sentAt: new Date(now - i * 3600000 * 5).toISOString(),
      subject: tpl.subject,
      templateName: tpl.name,
      error: st === "failed" ? "SMTP error 550: mailbox unavailable" : undefined,
    });
  }
}

const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10);

// ---- Leads ----
export async function getLeads() {
  await delay();
  return [...leads];
}

export async function importLeads(file: File) {
  await delay(700);
  const text = await file.text();
  const rows = text.split(/\r?\n/).slice(1).filter(Boolean);
  let imported = 0;
  for (const row of rows) {
    const [name, email, company, phone, source] = row.split(",").map((s) => s?.trim());
    if (!name || !email) continue;
    leads.push({
      id: `lead-${uid()}`,
      name,
      email,
      company: company || "—",
      phone: phone || "—",
      source: source || "CSV Import",
      status: "new",
      createdAt: new Date().toISOString(),
    });
    imported++;
  }
  return { imported, total: rows.length };
}

// ---- Templates ----
export async function getTemplates() {
  await delay();
  return [...templates];
}

export async function createTemplate(data: Omit<EmailTemplate, "id" | "createdAt">) {
  await delay();
  const tpl: EmailTemplate = { ...data, id: `tpl-${uid()}`, createdAt: new Date().toISOString() };
  templates.unshift(tpl);
  return tpl;
}

export async function updateTemplate(id: string, data: Partial<EmailTemplate>) {
  await delay();
  templates = templates.map((t) => (t.id === id ? { ...t, ...data } : t));
  return templates.find((t) => t.id === id)!;
}

export async function deleteTemplate(id: string) {
  await delay();
  templates = templates.filter((t) => t.id !== id);
}

// ---- Sequences ----
export async function getSequences() {
  await delay();
  return sequences.map((s) => ({ ...s, steps: [...s.steps] }));
}

export async function createSequence(data: Omit<Sequence, "id">) {
  await delay();
  const seq: Sequence = { ...data, id: `seq-${uid()}` };
  sequences.unshift(seq);
  return seq;
}

export async function updateSequence(id: string, data: Partial<Sequence>) {
  await delay();
  sequences = sequences.map((s) => (s.id === id ? { ...s, ...data } : s));
  return sequences.find((s) => s.id === id)!;
}

export async function deleteSequence(id: string) {
  await delay();
  sequences = sequences.filter((s) => s.id !== id);
}

// ---- Campaigns (Batches) ----
export async function getBatches() {
  await delay();
  return [...campaigns];
}

export async function getBatch(id: string) {
  await delay();
  const campaign = campaigns.find((c) => c.id === id);
  if (!campaign) throw new Error("Campaign not found");
  return { campaign, leads: campaignLeads[id] ?? [] };
}

export async function createBatch(data: { name: string; sequenceId: string; leadIds: string[] }) {
  await delay();
  const campaign: Campaign = {
    id: `cmp-${uid()}`,
    name: data.name,
    sequenceId: data.sequenceId,
    leadIds: data.leadIds,
    status: "active",
    emailsSent: 0,
    failed: 0,
    replies: 0,
    createdAt: new Date().toISOString(),
  };
  campaigns.unshift(campaign);
  campaignLeads[campaign.id] = data.leadIds.map((leadId) => ({
    leadId,
    currentStep: 1,
    lastEmailStatus: "pending",
    replied: false,
    unsubscribed: false,
    completed: false,
  }));
  return campaign;
}

export async function pauseBatch(id: string) {
  await delay(250);
  campaigns = campaigns.map((c) => (c.id === id ? { ...c, status: "paused" } : c));
}

export async function resumeBatch(id: string) {
  await delay(250);
  campaigns = campaigns.map((c) => (c.id === id ? { ...c, status: "active" } : c));
}

// ---- Email logs ----
export async function getEmailLogs() {
  await delay();
  return [...logs];
}

export function getLeadById(id: string) {
  return leads.find((l) => l.id === id);
}
