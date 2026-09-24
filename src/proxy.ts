import { NextResponse, type NextRequest } from 'next/server';

const isProduction = process.env.NODE_ENV === 'production';

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com https://va.vercel-scripts.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://wsrv.nl https://api.vrchat.cloud",
    "connect-src 'self' https://*.googoogaagaa.club https://*.supabase.co https://challenges.cloudflare.com https://va.vercel-scripts.com",
    "frame-src https://challenges.cloudflare.com",
    'upgrade-insecure-requests',
    'report-uri /api/csp-report',
  ].join('; ');
}

export function proxy(request: NextRequest) {
  if (!isProduction) {
    return NextResponse.next();
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('Content-Security-Policy', csp);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
