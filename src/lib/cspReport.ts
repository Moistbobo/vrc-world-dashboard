const REPORT_FIELDS = [
  'document-uri',
  'blocked-uri',
  'violated-directive',
  'effective-directive',
  'source-file',
  'line-number',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractReport(body: unknown, contentType: string | null): Record<string, unknown> | null {
  if (contentType === 'application/reports+json') {
    const entries = Array.isArray(body) ? body : [body];
    const entry = entries.find(
      (item) => isRecord(item) && item.type === 'csp-violation' && isRecord(item.body)
    );
    return entry ? entry.body : null;
  }
  if (!isRecord(body)) return null;
  if (contentType === 'application/csp-report' && isRecord(body['csp-report'])) {
    return body['csp-report'];
  }
  if (contentType === 'application/json') {
    return REPORT_FIELDS.some((field) => field in body) ? body : null;
  }
  return null;
}

export function handleCspReport(body: unknown, contentType: string | null): string | null {
  const report = extractReport(body, contentType);
  if (!report) return null;
  const entry: Record<string, string | number> = {};
  for (const field of REPORT_FIELDS) {
    const value = report[field];
    if (typeof value === 'string' || typeof value === 'number') entry[field] = value;
  }
  return JSON.stringify(entry);
}
