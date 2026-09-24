import type { NextConfig } from 'next';
import { execSync } from 'node:child_process';
import pkg from './package.json' with { type: 'json' };

function getGitShortSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_APP_MODE: process.env.NODE_ENV ?? 'development',
    NEXT_PUBLIC_APP_GIT_SHA: getGitShortSha(),
  },
};

export default nextConfig;
