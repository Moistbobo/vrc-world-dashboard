import { handleCspReport } from '../../../lib/cspReport';

const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  }
  const contentType = request.headers.get('content-type')?.split(';')[0].trim() ?? null;
  const bodyText = await request.text();
  if (bodyText.length > MAX_BODY_BYTES) {
    return new Response(null, { status: 400 });
  }
  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return new Response(null, { status: 400 });
  }
  const logLine = handleCspReport(body, contentType);
  if (logLine === null) {
    return new Response(null, { status: 400 });
  }
  console.log('CSP-VIOLATION ' + logLine);
  return new Response(null, { status: 204 });
}
