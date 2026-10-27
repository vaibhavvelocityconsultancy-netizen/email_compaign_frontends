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

export interface TenantMailgunSettingsInput {
  default_from_email: string;
  reply_to_email: string;
  sender_domain: string;
  api_key?: string;
  webhook_signing_key?: string;
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
