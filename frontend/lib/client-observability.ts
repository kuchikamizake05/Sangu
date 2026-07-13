export function reportClientError(source: string, error: unknown) {
  const endpoint = process.env.NEXT_PUBLIC_CLIENT_ERROR_ENDPOINT;
  if (!endpoint || typeof navigator === "undefined") return;
  const payload = JSON.stringify({ source, name: error instanceof Error ? error.name : "UnknownError", occurredAt: new Date().toISOString() });
  try {
    if (navigator.sendBeacon) navigator.sendBeacon(endpoint, new Blob([payload], { type: "application/json" }));
    else void fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true });
  } catch { /* Reporting must never interrupt the recovery path. */ }
}
