import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import {
  getTenantMailgunSettings,
  listTenantsWithMailgunSettings,
  saveTenantMailgunSettings,
  type TenantMailgunSettings,
  type TenantMailgunSettingsSummary,
} from "@/lib/mailgun-settings-api";

export const Route = createFileRoute("/email-settings")({
  head: () => ({
    meta: [
      { title: "Email settings — Vantage CRM" },
      { name: "description", content: "Manage tenant Mailgun email settings." },
    ],
  }),
  component: EmailSettingsPage,
});

function EmailSettingsPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = React.useState<TenantMailgunSettingsSummary[]>([]);
  const [selectedTenantId, setSelectedTenantId] = React.useState<number | null>(null);
  const [settings, setSettings] = React.useState<TenantMailgunSettings | null>(null);
  const [defaultFromEmail, setDefaultFromEmail] = React.useState("");
  const [senderDomain, setSenderDomain] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [webhookSigningKey, setWebhookSigningKey] = React.useState("");
  const [loadingTenants, setLoadingTenants] = React.useState(true);
  const [loadingSettings, setLoadingSettings] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!user?.is_superuser) {
      setLoadingTenants(false);
      return;
    }

    let active = true;
    listTenantsWithMailgunSettings()
      .then((results) => {
        if (!active) return;
        setTenants(results);
        setSelectedTenantId((current) => current ?? results[0]?.id ?? null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : "Could not load tenants.");
      })
      .finally(() => {
        if (active) setLoadingTenants(false);
      });

    return () => {
      active = false;
    };
  }, [user?.is_superuser]);

  React.useEffect(() => {
    if (selectedTenantId === null || !user?.is_superuser) {
      setSettings(null);
      setDefaultFromEmail("");
      setSenderDomain("");
      setApiKey("");
      setWebhookSigningKey("");
      return;
    }

    let active = true;
    setLoadingSettings(true);
    setSettings(null);
    setApiKey("");
    setWebhookSigningKey("");
    getTenantMailgunSettings(selectedTenantId)
      .then((result) => {
        if (!active) return;
        setSettings(result);
        setDefaultFromEmail(result.default_from_email);
        setSenderDomain(result.sender_domain);
      })
      .catch((error: unknown) => {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : "Could not load Mailgun settings.");
      })
      .finally(() => {
        if (active) setLoadingSettings(false);
      });

    return () => {
      active = false;
    };
  }, [selectedTenantId, user?.is_superuser]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedTenantId === null) return;
    setSaving(true);
    try {
      const saved = await saveTenantMailgunSettings(selectedTenantId, {
        default_from_email: defaultFromEmail,
        sender_domain: senderDomain,
        ...(apiKey ? { api_key: apiKey } : {}),
        ...(webhookSigningKey ? { webhook_signing_key: webhookSigningKey } : {}),
      });
      setSettings(saved);
      setApiKey("");
      setWebhookSigningKey("");
      setTenants((current) =>
        current.map((tenant) =>
          tenant.id === selectedTenantId
            ? { ...tenant, configured: saved.has_api_key && saved.has_webhook_signing_key }
            : tenant,
        ),
      );
      toast.success("Mailgun settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save Mailgun settings.");
    } finally {
      setSaving(false);
    }
  }

  if (!user?.is_superuser) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Only a super admin can manage tenant email settings.
        </CardContent>
      </Card>
    );
  }

  const isConfigured = settings?.has_api_key && settings.has_webhook_signing_key;

  return (
    <div className="flex flex-col gap-7">
      <div>
        <div className="font-mono text-[11px] tracking-wide text-muted-foreground">
          SUPER ADMIN
        </div>
        <h1 className="mt-1 flex items-center gap-2 font-display text-3xl font-bold">
          <Mail className="size-7" />
          Tenant email settings
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Configure separate Mailgun credentials and sender details for each tenant.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select tenant</CardTitle>
          <CardDescription>
            Settings are stored independently for each tenant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex max-w-xl flex-col gap-2 text-sm font-medium" htmlFor="tenant">
            Tenant
            <select
              id="tenant"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={selectedTenantId ?? ""}
              disabled={loadingTenants || tenants.length === 0}
              onChange={(event) =>
                setSelectedTenantId(event.target.value ? Number(event.target.value) : null)
              }
            >
              {tenants.length === 0 && <option value="">No tenants found</option>}
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} {tenant.configured ? "— configured" : "— not configured"}
                </option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mailgun configuration</CardTitle>
          <CardDescription>
            Secret values are encrypted in the database and never displayed after saving.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingTenants || loadingSettings ? (
            <p className="text-sm text-muted-foreground">Loading email settings…</p>
          ) : tenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Create a tenant before configuring its Mailgun account.
            </p>
          ) : (
            <form className="grid max-w-2xl gap-5" onSubmit={handleSave}>
              <label className="grid gap-2 text-sm font-medium" htmlFor="default-from-email">
                Default from email
                <Input
                  id="default-from-email"
                  value={defaultFromEmail}
                  onChange={(event) => setDefaultFromEmail(event.target.value)}
                  placeholder="Velocity Consultancy <reply@example.com>"
                  required
                />
              </label>

              <label className="grid gap-2 text-sm font-medium" htmlFor="sender-domain">
                Mailgun sender domain
                <Input
                  id="sender-domain"
                  value={senderDomain}
                  onChange={(event) => setSenderDomain(event.target.value)}
                  placeholder="mg.example.com"
                  required
                />
              </label>

              <label className="grid gap-2 text-sm font-medium" htmlFor="mailgun-api-key">
                Mailgun API key {settings?.has_api_key ? "(configured)" : ""}
                <Input
                  id="mailgun-api-key"
                  type="password"
                  autoComplete="new-password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder={settings?.has_api_key ? "Leave blank to keep the saved key" : "Required"}
                  required={!settings?.has_api_key}
                />
              </label>

              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="mailgun-webhook-signing-key"
              >
                Mailgun webhook signing key{" "}
                {settings?.has_webhook_signing_key ? "(configured)" : ""}
                <Input
                  id="mailgun-webhook-signing-key"
                  type="password"
                  autoComplete="new-password"
                  value={webhookSigningKey}
                  onChange={(event) => setWebhookSigningKey(event.target.value)}
                  placeholder={
                    settings?.has_webhook_signing_key
                      ? "Leave blank to keep the saved key"
                      : "Required"
                  }
                  required={!settings?.has_webhook_signing_key}
                />
              </label>

              <div>
                <Button type="submit" disabled={saving || selectedTenantId === null}>
                  <Save />
                  {saving ? "Saving…" : "Save settings"}
                </Button>
                {isConfigured && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    This tenant has complete Mailgun credentials.
                  </p>
                )}
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
