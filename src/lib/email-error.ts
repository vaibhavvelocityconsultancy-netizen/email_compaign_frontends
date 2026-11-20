const MESSAGE_KEYS = ["message", "detail", "reason", "errors", "description", "error"];

function extractErrorMessage(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map(extractErrorMessage).filter(Boolean).join("; ");
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of MESSAGE_KEYS) {
      if (key in record) {
        const message = extractErrorMessage(record[key]);
        if (message) return message;
      }
    }
    return Object.values(record).map(extractErrorMessage).filter(Boolean).join("; ");
  }
  return "";
}

export function formatEmailFailureReason(error?: string, maxLength = 180): string {
  const rawError = error?.trim();
  if (!rawError) return "The server did not provide an error description.";

  let message = "";
  const jsonStart = rawError.indexOf("{");
  if (jsonStart >= 0) {
    try {
      message = extractErrorMessage(JSON.parse(rawError.slice(jsonStart)));
    } catch {
      try {
        message = extractErrorMessage(JSON.parse(rawError));
      } catch {
        message = "";
      }
    }
  }

  if (!message) {
    const lines = rawError.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const tracebackIndex = lines.findIndex((line) => line.startsWith("Traceback "));
    message = tracebackIndex >= 0 ? lines[lines.length - 1] : lines.join(" ");
  }

  const normalized = message.replace(/\s+/g, " ").trim();
  if (!normalized) return "The server did not provide an error description.";
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1).trimEnd()}…`
    : normalized;
}
