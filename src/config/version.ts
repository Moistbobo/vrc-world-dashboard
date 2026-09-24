export function getAppVersion(): string {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';
  const sha = process.env.NEXT_PUBLIC_APP_GIT_SHA ?? 'unknown';
  return `${version} — ${sha}`;
}
