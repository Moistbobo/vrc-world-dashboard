import { describe, it, expect, vi, afterEach } from 'vitest';
import { POST } from './route';
import { handleCspReport } from '../../../lib/cspReport';

function post(body: string, contentType: string): Promise<Response> {
  return POST(
    new Request('http://localhost/api/csp-report', {
      method: 'POST',
      headers: { 'content-type': contentType },
      body,
    })
  );
}

const legacyReport = {
  'csp-report': {
    'document-uri': 'https://example.com/worlds',
    'blocked-uri': 'https://evil.example.com/pixel.png',
    'violated-directive': 'img-src',
    'effective-directive': 'img-src',
    'source-file': 'https://example.com/app.js',
    'line-number': 42,
  },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/csp-report', () => {
  it('accepts a legacy application/csp-report payload', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const response = await post(JSON.stringify(legacyReport), 'application/csp-report');
    expect(response.status).toBe(204);
    expect(logSpy).toHaveBeenCalledWith(
      'CSP-VIOLATION ' +
        JSON.stringify({
          'document-uri': 'https://example.com/worlds',
          'blocked-uri': 'https://evil.example.com/pixel.png',
          'violated-directive': 'img-src',
          'effective-directive': 'img-src',
          'source-file': 'https://example.com/app.js',
          'line-number': 42,
        })
    );
  });

  it('accepts a report-to envelope as application/reports+json', async () => {
    const response = await post(
      JSON.stringify([{ type: 'csp-violation', body: legacyReport['csp-report'] }]),
      'application/reports+json'
    );
    expect(response.status).toBe(204);
  });

  it('accepts a bare report as application/json', async () => {
    const response = await post(JSON.stringify(legacyReport['csp-report']), 'application/json');
    expect(response.status).toBe(204);
  });

  it('rejects malformed JSON with 400', async () => {
    const response = await post('{not json', 'application/csp-report');
    expect(response.status).toBe(400);
  });

  it('rejects a payload without a csp-report key', async () => {
    const response = await post(JSON.stringify({ hello: 'world' }), 'application/csp-report');
    expect(response.status).toBe(400);
  });

  it('rejects an unsupported content type', async () => {
    const response = await post(JSON.stringify(legacyReport), 'text/plain');
    expect(response.status).toBe(400);
  });

  it('rejects bodies larger than 64KB', async () => {
    const response = await post('x'.repeat(64 * 1024 + 1), 'application/csp-report');
    expect(response.status).toBe(400);
  });

  it('returns 405 with Allow header for non-POST methods', async () => {
    const response = await POST(
      new Request('http://localhost/api/csp-report', { method: 'GET' })
    );
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
  });
});

describe('handleCspReport', () => {
  it('extracts only known fields from a report', () => {
    const result = handleCspReport(legacyReport, 'application/csp-report');
    expect(result).toBe(
      JSON.stringify({
        'document-uri': 'https://example.com/worlds',
        'blocked-uri': 'https://evil.example.com/pixel.png',
        'violated-directive': 'img-src',
        'effective-directive': 'img-src',
        'source-file': 'https://example.com/app.js',
        'line-number': 42,
      })
    );
  });

  it('returns null for invalid input', () => {
    expect(handleCspReport({}, 'application/csp-report')).toBeNull();
    expect(handleCspReport('nope', 'application/csp-report')).toBeNull();
    expect(handleCspReport(null, 'application/csp-report')).toBeNull();
  });
});
