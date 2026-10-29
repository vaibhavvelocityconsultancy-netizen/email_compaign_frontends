import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Eye, EyeOff, Mail, RefreshCw, Save, Unplug } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MailgunWebhookHelper } from "@/components/MailgunWebhookHelper";
import { useAuth } from "@/lib/auth";
import { request } from "@/lib/api";
import {
  getOwnTenantMailgunSettings,
  getTenantMailgunSettings,
  listTenantsWithMailgunSettings,
  connectIonosMailbox,
  disconnectIonosMailbox,
  getIonosMailbox,
  saveOwnTenantMailgunSettings,
  saveTenantMailgunSettings,
  syncIonosMailbox,
  type IonosMailboxStatus,
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

type UnsubscribeSettings = {
  unsubscribe_company_name: string;
  unsubscribe_support_email: string;
  unsubscribe_company_address: string;
  unsubscribe_brand_color: string;
  unsubscribe_logo: string | null;
};

const emptyUnsubscribeSettings: UnsubscribeSettings = {
  unsubscribe_company_name: "",
  unsubscribe_support_email: "",
  unsubscribe_company_address: "",
  unsubscribe_brand_color: "#1f5eff",
  unsubscribe_logo: null,
};

function EmailSettingsPage() {
  const { user } = useAuth();
  const isSuperUser = Boolean(user?.is_superuser);
  const [tenants, setTenants] = React.useState<TenantMailgunSettingsSummary[]>([]);
  const [selectedTenantId, setSelectedTenantId] = React.useState<number | null>(null);
  const [settings, setSettings] = React.useState<TenantMailgunSettings | null>(null);
  const [defaultFromEmail, setDefaultFromEmail] = React.useState("");
  const [replyToEmail, setReplyToEmail] = React.useState("");
  const [senderDomain, setSenderDomain] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [webhookSigningKey, setWebhookSigningKey] = React.useState("");
  const [showApiKey, setShowApiKey] = React.useState(false);
  const [showWebhookSigningKey, setShowWebhookSigningKey] = React.useState(false);
  const [loadingTenants, setLoadingTenants] = React.useState(true);
  const [loadingSettings, setLoadingSettings] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [unsubscribeSettings, setUnsubscribeSettings] = React.useState<UnsubscribeSettings>(emptyUnsubscribeSettings);
  const [unsubscribeLogoFile, setUnsubscribeLogoFile] = React.useState<File | null>(null);
  const [savingUnsubscribe, setSavingUnsubscribe] = React.useState(false);
  const [unsubscribeDialogOpen, setUnsubscribeDialogOpen] = React.useState(false);
  const [gmailConnection, setGmailConnection] = React.useState<{
    connected: boolean;
    email: string;
    last_sync_at: string | null;
  }>({ connected: false, email: "", last_sync_at: null });
  const [gmailLoading, setGmailLoading] = React.useState(false);
  const [gmailSyncing, setGmailSyncing] = React.useState(false);
  const [replyProvider, setReplyProvider] = React.useState<"gmail" | "ionos">("gmail");
  const [ionosConnection, setIonosConnection] = React.useState<IonosMailboxStatus>({
    connected: false,
    email: "",
    last_sync_at: null,
    last_error: "",
  });
  const [ionosEmail, setIonosEmail] = React.useState("");
  const [ionosPassword, setIonosPassword] = React.useState("");
  const [showIonosPassword, setShowIonosPassword] = React.useState(false);
  const [ionosLoading, setIonosLoading] = React.useState(false);
  const [ionosSyncing, setIonosSyncing] = React.useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailResult = params.get("gmail");
    if (gmailResult === "connected") {
      toast.success("Gmail connected.");
      window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
    }
  }, []);

  React.useEffect(() => {
    if (!user?.id || (isSuperUser && selectedTenantId === null)) return;
    let active = true;
    const tenantQuery = isSuperUser ? `?tenant_id=${selectedTenantId}` : "";
    request<typeof gmailConnection>(`/auth/gmail-connection/${tenantQuery}`)
      .then((result) => {
        if (active) setGmailConnection(result);
      })
      .catch((error: unknown) => {
        if (active) {
          toast.error(error instanceof Error ? error.message : "Could not load Gmail connection.");
        }
      });
    return () => {
      active = false;
    };
  }, [user?.id, isSuperUser, selectedTenantId]);

  React.useEffect(() => {
    if (!user?.id || (isSuperUser && selectedTenantId === null)) return;
    let active = true;
    getIonosMailbox(isSuperUser ? selectedTenantId ?? undefined : undefined)
      .then((result) => {
        if (active) {
          setIonosConnection(result);
          if (result.email) setIonosEmail(result.email);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          toast.error(error instanceof Error ? error.message : "Could not load IONOS connection.");
        }
      });
    return () => {
      active = false;
    };
  }, [user?.id, isSuperUser, selectedTenantId]);

  async function connectGmail() {
    setGmailLoading(true);
    try {
      const tenantQuery = isSuperUser ? `?tenant_id=${selectedTenantId}` : "";
      const result = await request<{ authorization_url: string }>(`/auth/google/authorize/${tenantQuery}`);
      window.location.assign(result.authorization_url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start Gmail authorization.");
      setGmailLoading(false);
    }
  }

  async function disconnectGmail() {
    setGmailLoading(true);
    try {
      const tenantQuery = isSuperUser ? `?tenant_id=${selectedTenantId}` : "";
      await request(`/auth/gmail-connection/${tenantQuery}`, { method: "DELETE" });
      setGmailConnection({ connected: false, email: "", last_sync_at: null });
      toast.success("Gmail disconnected.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not disconnect Gmail.");
    } finally {
      setGmailLoading(false);
    }
  }

  async function syncGmailReplies() {
    if (!gmailConnection.connected) {
      toast.error("Connect Gmail before syncing replies.");
      return;
    }
    setGmailSyncing(true);
    try {
      const tenantQuery = isSuperUser ? `?tenant_id=${selectedTenantId}` : "";
      const result = await request<{
        processed_count: number;
        last_sync_at: string | null;
      }>(`/auth/gmail-connection/sync/${tenantQuery}`, { method: "POST" });
      setGmailConnection((current) => ({
        ...current,
        last_sync_at: result.last_sync_at,
      }));
      toast.success(
        result.processed_count
          ? `Gmail sync complete: ${result.processed_count} new repl${result.processed_count === 1 ? "y" : "ies"}.`
          : "Gmail sync complete. No new replies found.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gmail reply synchronization failed.");
      const tenantQuery = isSuperUser ? `?tenant_id=${selectedTenantId}` : "";
      request<typeof gmailConnection>(`/auth/gmail-connection/${tenantQuery}`)
        .then(setGmailConnection)
        .catch(() => undefined);
    } finally {
      setGmailSyncing(false);
    }
  }

  async function connectIonos(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIonosLoading(true);
    try {
      const result = await connectIonosMailbox(
        { email: ionosEmail.trim(), password: ionosPassword },
        isSuperUser ? selectedTenantId ?? undefined : undefined,
      );
      setIonosConnection(result);
      setIonosEmail(result.email);
      setIonosPassword("");
      toast.success("IONOS mailbox connected and verified.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not connect to IONOS.");
    } finally {
      setIonosLoading(false);
    }
  }

  async function disconnectIonos() {
    setIonosLoading(true);
    try {
      await disconnectIonosMailbox(isSuperUser ? selectedTenantId ?? undefined : undefined);
      setIonosConnection({ connected: false, email: "", last_sync_at: null, last_error: "" });
      setIonosEmail("");
      setIonosPassword("");
      toast.success("IONOS mailbox disconnected.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not disconnect IONOS.");
    } finally {
      setIonosLoading(false);
    }
  }

  async function handleIonosSync() {
    setIonosSyncing(true);
    try {
      const result = await syncIonosMailbox(
        isSuperUser ? selectedTenantId ?? undefined : undefined,
      );
      setIonosConnection((current) => ({
        ...current,
        last_sync_at: result.last_sync_at,
        last_error: "",
      }));
      toast.success(`IONOS sync complete: ${result.processed_count} new message(s).`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "IONOS synchronization failed.");
      getIonosMailbox(isSuperUser ? selectedTenantId ?? undefined : undefined)
        .then(setIonosConnection)
        .catch(() => undefined);
    } finally {
      setIonosSyncing(false);
    }
  }

  React.useEffect(() => {
    if (!isSuperUser) {
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
  }, [isSuperUser]);

  React.useEffect(() => {
    if (!user?.id || isSuperUser) {
      return;
    }

    let active = true;
    setLoadingSettings(true);
    setSettings(null);
    setApiKey("");
    setWebhookSigningKey("");
    getOwnTenantMailgunSettings()
      .then((result) => {
        if (!active) return;
        setSettings(result);
        setDefaultFromEmail(result.default_from_email);
        setReplyToEmail(result.reply_to_email);
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
  }, [user?.id, isSuperUser]);

  React.useEffect(() => {
    if (!isSuperUser) {
      return;
    }

    if (selectedTenantId === null) {
      setSettings(null);
      setDefaultFromEmail("");
      setReplyToEmail("");
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
        setReplyToEmail(result.reply_to_email);
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
  }, [selectedTenantId, isSuperUser]);

  React.useEffect(() => {
    if (!user?.id || !isSuperUser) {
      setUnsubscribeSettings(emptyUnsubscribeSettings);
      setUnsubscribeLogoFile(null);
      return;
    }
    let active = true;
    setUnsubscribeSettings(emptyUnsubscribeSettings);
    setUnsubscribeLogoFile(null);
    request<UnsubscribeSettings & { updated_at: string }>("/unsubscribe-page-settings/")
      .then((result) => {
        if (active) setUnsubscribeSettings({ ...emptyUnsubscribeSettings, ...result });
      })
      .catch((error: unknown) => {
        if (active) toast.error(error instanceof Error ? error.message : "Could not load unsubscribe page settings.");
      });
    return () => { active = false; };
  }, [user?.id, isSuperUser]);

  async function handleSaveUnsubscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingUnsubscribe(true);
    try {
      const formData = new FormData();
      formData.append("unsubscribe_company_name", unsubscribeSettings.unsubscribe_company_name);
      formData.append("unsubscribe_support_email", unsubscribeSettings.unsubscribe_support_email);
      formData.append("unsubscribe_company_address", unsubscribeSettings.unsubscribe_company_address);
      formData.append("unsubscribe_brand_color", unsubscribeSettings.unsubscribe_brand_color);
      if (unsubscribeLogoFile) formData.append("unsubscribe_logo", unsubscribeLogoFile);
      const saved = await request<UnsubscribeSettings>("/unsubscribe-page-settings/", {
        method: "PATCH",
        body: formData,
      });
      setUnsubscribeSettings({ ...emptyUnsubscribeSettings, ...saved });
      setUnsubscribeLogoFile(null);
      toast.success("Unsubscribe page settings saved.");
      setUnsubscribeDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save unsubscribe page settings.");
    } finally {
      setSavingUnsubscribe(false);
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSuperUser && selectedTenantId === null) return;
    setSaving(true);
    try {
      const input = {
        default_from_email: defaultFromEmail,
        reply_to_email: replyToEmail.trim(),
        sender_domain: senderDomain,
        ...(apiKey ? { api_key: apiKey } : {}),
        ...(webhookSigningKey ? { webhook_signing_key: webhookSigningKey } : {}),
      };
      let saved: TenantMailgunSettings;
      if (isSuperUser) {
        if (selectedTenantId === null) return;
        saved = await saveTenantMailgunSettings(selectedTenantId, input);
      } else {
        saved = await saveOwnTenantMailgunSettings(input);
      }
      setSettings(saved);
      if (isSuperUser) {
        setTenants((current) =>
          current.map((tenant) =>
            tenant.id === selectedTenantId
              ? { ...tenant, configured: saved.has_api_key && saved.has_webhook_signing_key }
              : tenant,
          ),
        );
      }
      toast.success("Mailgun settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save Mailgun settings.");
    } finally {
      setSaving(false);
    }
  }

  const isConfigured = settings?.has_api_key && settings.has_webhook_signing_key;

  return (
    <div className="flex flex-col gap-7">
      <div>
        <div className="font-mono text-[11px] tracking-wide text-muted-foreground">
          {isSuperUser ? "SUPER ADMIN" : "TENANT EMAIL SETTINGS"}
        </div>
        <h1 className="mt-1 flex items-center gap-2 font-display text-3xl font-bold">
          <Mail className="size-7" />
          {isSuperUser ? "Tenant email settings" : "Email settings"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isSuperUser
            ? "Configure separate Mailgun credentials and sender details for each tenant."
            : `Configure Mailgun credentials and sender details for ${settings?.tenant_name ?? "your tenant"}.`}
        </p>
      </div>

      {isSuperUser && (
        <Card>
          <CardHeader>
            <CardTitle>Select tenant</CardTitle>
            <CardDescription>Settings are stored independently for each tenant.</CardDescription>
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
      )}

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
          ) : isSuperUser && tenants.length === 0 ? (
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

              <label className="grid gap-2 text-sm font-medium" htmlFor="reply-to-email">
                Reply-to email
                <Input
                  id="reply-to-email"
                  value={replyToEmail}
                  onChange={(event) => setReplyToEmail(event.target.value)}
                  placeholder="Velocity Consultancy <replies@example.com>"
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
                <div className="relative">
                  <Input
                    id="mailgun-api-key"
                    type={showApiKey ? "text" : "password"}
                    autoComplete="new-password"
                    className="pr-10"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder={
                      settings?.has_api_key ? "Leave blank to keep the saved key" : "Required"
                    }
                    required={!settings?.has_api_key}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showApiKey ? "Hide API key" : "Show API key"}
                    onClick={() => setShowApiKey((visible) => !visible)}
                  >
                    {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </label>

              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="mailgun-webhook-signing-key"
              >
                Mailgun webhook signing key{" "}
                {settings?.has_webhook_signing_key ? "(configured)" : ""}
                <div className="relative">
                  <Input
                    id="mailgun-webhook-signing-key"
                    type={showWebhookSigningKey ? "text" : "password"}
                    autoComplete="new-password"
                    className="pr-10"
                    value={webhookSigningKey}
                    onChange={(event) => setWebhookSigningKey(event.target.value)}
                    placeholder={
                      settings?.has_webhook_signing_key
                        ? "Leave blank to keep the saved key"
                        : "Required"
                    }
                    required={!settings?.has_webhook_signing_key}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showWebhookSigningKey ? "Hide signing key" : "Show signing key"}
                    onClick={() => setShowWebhookSigningKey((visible) => !visible)}
                  >
                    {showWebhookSigningKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </label>

              <div>
                <Button
                  type="submit"
                  disabled={saving || (isSuperUser && selectedTenantId === null)}
                >
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

      <MailgunWebhookHelper />

      {(!isSuperUser || selectedTenantId !== null) && (
        <Card>
          <CardHeader>
            <CardTitle>Email reply tracking</CardTitle>
            <CardDescription>
              {isSuperUser
                ? `Choose a mailbox provider for ${tenants.find((tenant) => tenant.id === selectedTenantId)?.name ?? "the selected tenant"}.`
                : "Connect a mailbox to receive and track replies for this tenant."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid max-w-2xl gap-5">
            <label className="grid max-w-xs gap-2 text-sm font-medium" htmlFor="reply-mailbox-provider">
              Reply mailbox provider
              <select
                id="reply-mailbox-provider"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={replyProvider}
                onChange={(event) => setReplyProvider(event.target.value as "gmail" | "ionos")}
              >
                <option value="gmail">Gmail</option>
                <option value="ionos">IONOS</option>
              </select>
            </label>
            {replyProvider === "gmail" ? (
              <>
            <div>
              <p className="text-sm font-medium">
                {gmailConnection.connected ? gmailConnection.email : "No Gmail account connected"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {gmailConnection.connected
                  ? `Connected for this tenant${gmailConnection.last_sync_at ? ` · Last sync ${new Date(gmailConnection.last_sync_at).toLocaleString()}` : " · Not synced yet"}`
                  : "Each tenant connects its own Gmail account."}
              </p>
            </div>
            {gmailConnection.connected ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={connectGmail}
                  disabled={gmailLoading}
                >
                  Reconnect
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={disconnectGmail}
                  disabled={gmailLoading}
                >
                  <Unplug />
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button type="button" onClick={connectGmail} disabled={gmailLoading}>
                {gmailLoading ? "Connecting…" : "Connect Gmail"}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={syncGmailReplies}
              disabled={!gmailConnection.connected || gmailLoading || gmailSyncing}
            >
              <RefreshCw className={gmailSyncing ? "animate-spin" : ""} />
              {gmailSyncing ? "Syncing replies..." : "Sync Replies"}
            </Button>
            {!gmailConnection.connected && (
              <p className="w-full text-xs text-muted-foreground">
                Connect Gmail before synchronizing replies.
              </p>
            )}
              </>
            ) : (
              <form className="grid gap-4" onSubmit={connectIonos}>
                {ionosConnection.connected && (
                  <div>
                    <p className="text-sm font-medium">Connected: {ionosConnection.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Last successful sync: {ionosConnection.last_sync_at
                        ? new Date(ionosConnection.last_sync_at).toLocaleString()
                        : "Not synced yet"}
                    </p>
                  </div>
                )}
                {ionosConnection.last_error && (
                  <p className="text-sm text-destructive">{ionosConnection.last_error}</p>
                )}
                <label className="grid gap-2 text-sm font-medium" htmlFor="ionos-email">
                  IONOS email address
                  <Input
                    id="ionos-email"
                    type="email"
                    autoComplete="username"
                    value={ionosEmail}
                    onChange={(event) => setIonosEmail(event.target.value)}
                    placeholder="name@example.com"
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium" htmlFor="ionos-password">
                  Mailbox password
                  <div className="relative">
                    <Input
                      id="ionos-password"
                      type={showIonosPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className="pr-10"
                      value={ionosPassword}
                      onChange={(event) => setIonosPassword(event.target.value)}
                      placeholder={ionosConnection.connected ? "Enter to reconnect or test" : "Required"}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showIonosPassword ? "Hide mailbox password" : "Show mailbox password"}
                      onClick={() => setShowIonosPassword((visible) => !visible)}
                    >
                      {showIonosPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    disabled={ionosLoading || (isSuperUser && selectedTenantId === null)}
                  >
                    {ionosLoading
                      ? "Testing connection..."
                      : ionosConnection.connected
                        ? "Reconnect / Test Connection"
                        : "Connect / Test Connection"}
                  </Button>
                  {ionosConnection.connected && (
                    <>
                      <Button type="button" variant="outline" onClick={handleIonosSync} disabled={ionosSyncing}>
                        {ionosSyncing ? "Syncing..." : "Sync now"}
                      </Button>
                      <Button type="button" variant="outline" onClick={disconnectIonos} disabled={ionosLoading}>
                        <Unplug />
                        Disconnect
                      </Button>
                    </>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {isSuperUser && (
        <Card>
          <CardHeader>
            <CardTitle>Unsubscribe page</CardTitle>
            <CardDescription>Configure one shared unsubscribe page for every tenant.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="outline" onClick={() => setUnsubscribeDialogOpen(true)}>Configure unsubscribe page</Button>
            {unsubscribeDialogOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setUnsubscribeDialogOpen(false); }}>
            <section className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-background p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="unsubscribe-dialog-title">
            <h2 id="unsubscribe-dialog-title" className="text-lg font-semibold">Configure unsubscribe page</h2>
            <p className="mb-5 mt-1 text-sm text-muted-foreground">These details appear to recipients who click the unsubscribe link.</p>
            <form className="grid gap-5" onSubmit={handleSaveUnsubscribe}>
              <label className="grid gap-2 text-sm font-medium" htmlFor="unsubscribe-company-name">Company name
                <Input id="unsubscribe-company-name" value={unsubscribeSettings.unsubscribe_company_name} onChange={(event) => setUnsubscribeSettings((current) => ({ ...current, unsubscribe_company_name: event.target.value }))} />
              </label>
              <label className="grid gap-2 text-sm font-medium" htmlFor="unsubscribe-support-email">Support email
                <Input id="unsubscribe-support-email" type="email" value={unsubscribeSettings.unsubscribe_support_email} onChange={(event) => setUnsubscribeSettings((current) => ({ ...current, unsubscribe_support_email: event.target.value }))} />
              </label>
              <label className="grid gap-2 text-sm font-medium" htmlFor="unsubscribe-company-address">Company address
                <Input id="unsubscribe-company-address" value={unsubscribeSettings.unsubscribe_company_address} onChange={(event) => setUnsubscribeSettings((current) => ({ ...current, unsubscribe_company_address: event.target.value }))} />
              </label>
              <label className="grid gap-2 text-sm font-medium" htmlFor="unsubscribe-brand-color">Brand color
                <div className="flex gap-2"><Input id="unsubscribe-brand-color-picker" aria-label="Choose brand color" type="color" className="w-16 p-1" value={/^#[0-9a-fA-F]{6}$/.test(unsubscribeSettings.unsubscribe_brand_color) ? unsubscribeSettings.unsubscribe_brand_color : "#1f5eff"} onChange={(event) => setUnsubscribeSettings((current) => ({ ...current, unsubscribe_brand_color: event.target.value }))} /><Input id="unsubscribe-brand-color" value={unsubscribeSettings.unsubscribe_brand_color} placeholder="#1f5eff" onChange={(event) => setUnsubscribeSettings((current) => ({ ...current, unsubscribe_brand_color: event.target.value }))} /></div>
              </label>
              <label className="grid gap-2 text-sm font-medium" htmlFor="unsubscribe-logo">Logo image (optional)
                {unsubscribeSettings.unsubscribe_logo && (
                  <img src={unsubscribeSettings.unsubscribe_logo} alt="Current unsubscribe page logo" className="max-h-12 max-w-40 object-contain" />
                )}
                <Input id="unsubscribe-logo" type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={(event) => setUnsubscribeLogoFile(event.target.files?.[0] ?? null)} />
                <span className="text-xs text-muted-foreground">Upload an image up to 2 MB.</span>
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setUnsubscribeDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={savingUnsubscribe}><Save />{savingUnsubscribe ? "Saving…" : "Save"}</Button>
              </div>
            </form>
            </section>
            </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
