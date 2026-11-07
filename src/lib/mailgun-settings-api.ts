import { request } from "@/lib/api";

export interface TenantMailgunSettingsSummary {
  id: number;
  name: string;
  configured: boolean;
}

export interface TenantMailgunSettings {
  tenant: number;
  tenant_name: string;
  default_from_email: string;
  reply_to_email: string;
  sender_domain: string;
  has_api_key: boolean;
  has_webhook_signing_key: boolean;
}

export interface TenantAdminSummary {
  id: number;
  name: string;
  created_at: string;
  users_count: number;
  mailgun_configured: boolean;
  has_api_key: boolean;
  has_webhook_signing_key: boolean;
  sender_domain: string;
}

export interface TenantMailgunSettingsInput {
  default_from_email: string;
  reply_to_email: string;
  sender_domain: string;
  api_key?: string;
  webhook_signing_key?: string;
}

export interface IonosMailboxStatus {
  connected: boolean;
  email: string;
  last_sync_at: string | null;
  last_error: string;
}

export interface IonosMailboxCredentials {
  email: string;
  password: string;
}

function ionosMailboxPath(tenantId?: number): string {
  return `/auth/ionos-mailbox/${tenantId ? `?tenant_id=${tenantId}` : ""}`;
}

export function getIonosMailbox(tenantId?: number): Promise<IonosMailboxStatus> {
  return request<IonosMailboxStatus>(ionosMailboxPath(tenantId));
}

export function connectIonosMailbox(
  credentials: IonosMailboxCredentials,
  tenantId?: number,
): Promise<IonosMailboxStatus> {
  return request<IonosMailboxStatus>(ionosMailboxPath(tenantId), {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function disconnectIonosMailbox(tenantId?: number): Promise<{ connected: false; email: "" }> {
  return request(ionosMailboxPath(tenantId), { method: "DELETE" });
}

export function syncIonosMailbox(tenantId?: number): Promise<{
  processed_count: number;
  last_sync_at: string | null;
}> {
  return request(`/auth/ionos-mailbox/sync/${tenantId ? `?tenant_id=${tenantId}` : ""}`, {
    method: "POST",
  });
}

export function listAdminTenants(): Promise<TenantAdminSummary[]> {
  return request<TenantAdminSummary[]>("/auth/tenants/");
}

export function deleteAdminTenant(tenantId: number): Promise<void> {
  return request<void>(`/auth/tenants/${tenantId}/`, { method: "DELETE" });
}

export function getOwnTenantMailgunSettings(): Promise<TenantMailgunSettings> {
  return request<TenantMailgunSettings>("/auth/mailgun-settings/");
}

export function saveOwnTenantMailgunSettings(
  data: TenantMailgunSettingsInput,
): Promise<TenantMailgunSettings> {
  return request<TenantMailgunSettings>("/auth/mailgun-settings/", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function listTenantsWithMailgunSettings(): Promise<TenantMailgunSettingsSummary[]> {
  return request<TenantMailgunSettingsSummary[]>("/auth/mailgun-settings/tenants/");
}

export function getTenantMailgunSettings(tenantId: number): Promise<TenantMailgunSettings> {
  return request<TenantMailgunSettings>(`/auth/mailgun-settings/tenants/${tenantId}/`);
}

export function saveTenantMailgunSettings(
  tenantId: number,
  data: TenantMailgunSettingsInput,
): Promise<TenantMailgunSettings> {
  return request<TenantMailgunSettings>(`/auth/mailgun-settings/tenants/${tenantId}/`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
