import { GoTrueClient } from '@supabase/auth-js';
import { PostgrestClient } from '@supabase/postgrest-js';

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const envKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function isValidSupabaseUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

const hasValidEnv =
  typeof envUrl === 'string' &&
  typeof envKey === 'string' &&
  envKey.length > 0 &&
  isValidSupabaseUrl(envUrl);

const isBrowser = typeof window !== 'undefined';

// Mirrors the header supabase-js sends on every request so server-side
// telemetry keeps attributing traffic to this client version.
const CLIENT_HEADERS: Record<string, string> = {
  'X-Client-Info': 'supabase-js/2.110.0; runtime=web',
};

interface ComposedSupabaseClient {
  auth: GoTrueClient;
  from: PostgrestClient['from'];
  schema: PostgrestClient['schema'];
}

function createSupabaseClient(url: string, key: string): ComposedSupabaseClient {
  const baseUrl = new URL(url.endsWith('/') ? url : `${url}/`);
  const storageKey = `sb-${baseUrl.hostname.split('.')[0]}-auth-token`;
  const authHeaders = { ...CLIENT_HEADERS, apikey: key, Authorization: `Bearer ${key}` };

  const auth = new GoTrueClient({
    url: new URL('auth/v1', baseUrl).href,
    headers: authHeaders,
    storageKey,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
  });

  // supabase-js wraps every REST request so it carries the anonymous
  // session's access token (falling back to the publishable key). Without
  // this wrapper, PostgREST would see the anon role and RLS would hide the
  // current user's own ratings.
  const restFetch: typeof fetch = async (input, init) => {
    const { data } = await auth.getSession();
    const accessToken = data.session?.access_token ?? key;
    const headers = new Headers(init?.headers);
    if (!headers.has('apikey')) headers.set('apikey', key);
    if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${accessToken}`);
    return fetch(input, { ...init, headers });
  };

  const rest = new PostgrestClient(new URL('rest/v1', baseUrl).href, {
    headers: CLIENT_HEADERS,
    schema: 'public',
    fetch: restFetch,
  });

  return { auth, from: rest.from.bind(rest), schema: rest.schema.bind(rest) };
}

// Defensive: ensure the anonymous session persists across page reloads
// so the same anonymous user_id is reused for community sentiment.
// supabase-js defaults this to true, but we set it explicitly to guard against regressions.
export const supabase: ComposedSupabaseClient = hasValidEnv && isBrowser
  ? createSupabaseClient(envUrl!, envKey!)
  : (null as unknown as ComposedSupabaseClient);
