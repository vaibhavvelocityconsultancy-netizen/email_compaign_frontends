function describeError(error?: unknown): { message: string; details: string } {
  if (error instanceof Response) {
    const message = `HTTP ${error.status}${error.statusText ? ` ${error.statusText}` : ""}${error.url ? ` at ${error.url}` : ""}`;
    return { message, details: message };
  }
  if (error instanceof Error) {
    return {
      message: `${error.name}: ${error.message}`,
      details: error.stack ?? `${error.name}: ${error.message}`,
    };
  }
  if (error == null) {
    return { message: "No error details were captured.", details: "" };
  }
  const message = typeof error === "string" ? error : JSON.stringify(error) ?? String(error);
  return { message, details: message };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderErrorPage(error?: unknown): string {
  const errorInfo = describeError(error);
  const message = escapeHtml(errorInfo.message);
  const details = escapeHtml(errorInfo.details);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Application error</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      main { max-width: 52rem; width: 100%; }
      h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1rem; }
      pre { white-space: pre-wrap; overflow-wrap: anywhere; font: 12px/1.5 ui-monospace, monospace; }
      .message, details { border: 1px solid #d1d5db; border-radius: 0.375rem; padding: 1rem; }
      .message { border-color: #fca5a5; background: #fef2f2; }
      details { margin-top: 1rem; background: #fff; }
      summary { cursor: pointer; font-weight: 600; }
      .actions { display: flex; gap: 0.5rem; justify-content: flex-start; flex-wrap: wrap; margin-top: 1rem; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #111; color: #fff; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
    </style>
  </head>
  <body>
    <main>
      <h1>This page could not load</h1>
      <p>The exact error is shown below. Share it with support if you need help.</p>
      <pre class="message">${message}</pre>
      ${details ? `<details><summary>Technical details</summary><pre>${details}</pre></details>` : ""}
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </main>
  </body>
</html>`;
}
