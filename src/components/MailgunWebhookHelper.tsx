import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

const configuredApiBase = (
  Reflect.get(import.meta.env, "VITE_API_BASE_URL") as string | undefined
)?.trim().replace(/\/+$/, "");

function getWebhookUrl() {
  const base = configuredApiBase
    ? configuredApiBase.replace(/\/api$/i, "")
    : typeof window !== "undefined"
      ? window.location.origin
      : "";
  return `${base}/api/webhooks/mailgun/`;
}

export function MailgunWebhookHelper() {
  const [domain, setDomain] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);
  const webhookUrl = getWebhookUrl();
  const normalizedDomain = domain.trim().toLowerCase();
  const validDomain = /^[a-z0-9.-]+\.[a-z]{2,}$/.test(normalizedDomain);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  function updateDomain(value: string) {
    setDomain(value);
    setShowResult(false);
    setCopied(false);
  }

  async function copyWebhookUrl() {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
  }

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold">Webhook setup</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Generate the Mailgun event webhook URL for your domain.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="grid flex-1 gap-2 text-sm font-medium" htmlFor="mailgun-webhook-domain">
          Your Mailgun domain
          <input
            id="mailgun-webhook-domain"
            type="text"
            autoComplete="off"
            value={domain}
            onChange={(event) => updateDomain(event.target.value)}
            placeholder="mg.yourcompany.com"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <button
          type="button"
          disabled={!validDomain}
          onClick={() => setShowResult(true)}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          Show webhook URL
        </button>
      </div>

      {showResult && validDomain && (
        <div className="mt-5 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              aria-label="Mailgun webhook URL"
              readOnly
              value={webhookUrl}
              className="h-10 min-w-0 flex-1 rounded-md border border-input bg-muted px-3 text-sm"
            />
            <button
              type="button"
              onClick={copyWebhookUrl}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Log in to Mailgun and open <strong className="break-all text-foreground">{normalizedDomain}</strong>.</li>
            <li>Go to Sending &gt; Webhooks.</li>
            <li>Click Add webhook and paste the URL.</li>
            <li>
              Do this for each event: Delivered, Permanent failure, Temporary failure, Opened,
              Clicked, Complained, Unsubscribed.
            </li>
            <li>Go to Domain settings &gt; Tracking and turn on opens and clicks.</li>
          </ol>
        </div>
      )}
    </section>
  );
}
