# Agent Notes

## Stack & Entrypoints

- Vite + React 18 + TypeScript SPA. Entry: `index.html` → `src/main.tsx` → `src/App.tsx`.
- Client-side routing with `react-router-dom`; `vercel.json` rewrites all paths to `index.html`.
- Package manager: `pnpm@11.5.1`.
- There is no root README; conventions live in `CONTRIBUTING.md` and this file.

## Daily Commands

```bash
pnpm dev          # dev server on http://localhost:5173
pnpm build        # tsc && vite build -> dist/
pnpm preview      # preview the dist build locally
pnpm lint         # eslint . --report-unused-disable-directives --max-warnings 0
pnpm test         # vitest run
pnpm test:watch   # vitest in watch mode
pnpm test:ui      # vitest --ui
pnpm test:e2e     # playwright test (full browser, headless)
pnpm test:e2e:ui  # playwright test --ui
```

## Verification Order

- Pre-push hook (`.husky/pre-push`) runs `pnpm lint` then `pnpm test`.
- `pnpm build` also runs `tsc`, so type errors block builds.
- Run a single test: `pnpm test -- src/components/world-card/WorldCard.test.tsx`.

## Testing

- Vitest is configured inside `vite.config.ts`: `globals: true`, `environment: 'jsdom'`, setup file `src/test/setup.ts`.
- `src/test/setup.ts` mocks `sonner`, polyfills `IntersectionObserver` / `ResizeObserver`, and imports i18n so translations load in tests.
- Many component/page tests use MSW-style fetch mocking and `vi.useFakeTimers()`; check existing tests before inventing new patterns.

## End-to-end (Playwright)

- `e2e/` is the Playwright Test suite. `vite.config.ts` excludes it from Vitest's globs.
- `playwright.config.ts` boots the real Vite dev server on port 5180 with overridden `VITE_*` envs (the API base URL points at a port nothing listens on — every `/api/*` request is intercepted by `page.route()` in `e2e/fixtures/mock-api.ts`).
- Mock API fixture lives in `e2e/fixtures/worlds-fixtures.ts` and uses the same response shapes as the real backend in `src/api/client.ts`.
- Helpers: `visitWorlds(page, options)` seeds localStorage + registers the mock, then navigates; `expandFilters(page)` opens the filter panel; `waitForWorldsRequest(page, predicate)` resolves the next matching `/api/worlds` request URL.
- First-time setup: `pnpm exec playwright install chromium` (already installed on macOS via `~/Library/Caches/ms-playwright/`).

## Environment

Copy `.env.example` to `.env.local`. Vite exposes only `VITE_*` env vars to the client.

- `VITE_API_BASE_URL` — defaults to `http://localhost:3000` in `src/api/client.ts` if unset.
- `VITE_API_BEARER_TOKEN` — optional; sent as `Authorization: Bearer ...`.
- `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` — required at import time by `src/lib/supabase.ts`. The client throws at module load if these are missing, even when community sentiment is disabled. Set dummy values in `.env.local` for non-sentiment work; tests mock Supabase.
- `VITE_ENABLE_COMMUNITY_SENTIMENT` — gates the sentiment UI; default is `false`.
- `VITE_TURNSTILE_SITE_KEY` — Cloudflare Turnstile site key.

## Code Organization

- `src/components/<kebab-name>/` — component, test, and `index.ts` barrel.
- `src/pages/<kebab-name>/` — page component, test, and barrel.
- Import through barrels: `import { WorldCard } from '../components/world-card'` — not from the `.tsx` directly.
- `src/api/` — fetch helpers and backend client code.
- `src/hooks/` — TanStack Query hooks and custom hooks.
- `src/contexts/` — preference and list state providers.
- `src/i18n/` — i18next setup with `en.json` / `ja.json`.

## Style & Conventions

- ESLint flat config in `eslint.config.js` uses `typescript-eslint`, `react-hooks`, and `react-refresh`.
- React Refresh rule allows constant exports (`allowConstantExport: true`), so `export const foo = ...` is fine in component files.
- Strict TypeScript: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` are enabled.
- Tailwind dark mode is `class`-based. Initial theme is set in `index.html` via external script `public/theme-init.js` reading `localStorage.sos-theme`, falling back to `prefers-color-scheme: dark`. The script is external so the CSP can block inline scripts — keep it that way.

## Feature Flags

- `VITE_ENABLE_COMMUNITY_SENTIMENT` gates the sentiment UI. `SentimentSection` itself does not read the flag; the parent (`WorldDetailPage`) decides whether to render it.

## Build-injected Globals

- Vite defines `__APP_VERSION__`, `__APP_MODE__`, and `__APP_GIT_SHA__` at build time from `package.json`, mode, and current git SHA. These are declared in `src/types/vite-env.d.ts`.

## Deployment & Branch Rules

- Deploy target is Vercel. `vercel.json` uses the SPA rewrite.
- `scripts/apply-rulesets.sh` applies GitHub rulesets via `gh` CLI; requires repo admin access.
- `.github/rulesets/main.json` enforces squash-only merges on the default branch; `.github/rulesets/release-branches.json` enforces merge-commit only on `testnet` and `production`.

## Content Security Policy

- `vercel.json` serves a strict CSP on every route. Inline scripts and `eval()` are blocked; the dark-mode theme script must stay an external file in `public/` (see Style & Conventions).
- Any new external origin (API, Supabase project, image CDN, widget, analytics) must be added to the `connect-src` / `script-src` / `img-src` / `frame-src` allowlists in `vercel.json`, or it will be silently blocked in production with only console warnings. Check devtools for `Refused to connect` violations after deploying.
- New third-party JS widgets that inject scripts or iframes (like Turnstile) need their origin in `script-src` and `frame-src`.

## PR Evidence & Risk Assessment

When preparing a pull request, follow `.github/pull_request_template.md`. PRs targeting the `testnet` or `production` release branches should instead use `.github/PULL_REQUEST_TEMPLATE/release.md`, which only requires a Summary and Verification checklist. Agents and contributors must fill out the **Risk Rating** and **E2E Evidence** sections before requesting human review (these sections are not required for release-branch PRs using the release template).

### E2E evidence

- Run the app locally with `pnpm dev` (or `pnpm build && pnpm preview` for a production-like build).
- Manually exercise the new feature or changed flow in a browser.
- Capture at least one screenshot of the relevant UI state.
- For multi-step flows (e.g. posting a comment, applying filters, navigating routes), prefer a screen recording or GIF.
- Attach media **directly to the PR body** by dragging the files into the GitHub text area.
- For terminal-only workflows, use the [`gh-image`](https://github.com/drogers0/gh-image) extension to upload media from `pr-assets/<branch-name>/` to GitHub's CDN and embed the returned markdown in the PR description:
  ```bash
  gh extension install drogers0/gh-image
  gh image pr-assets/<branch-name>/*.png pr-assets/<branch-name>/*.webm
  ```
  Ensure you are logged into GitHub in a browser so `gh image` can extract a session token. If direct upload is not possible, save files under `pr-assets/<branch-name>/` and link to them; never commit screenshots or videos to the repo.
- Media is only required when the PR is **user-facing** (UI/UX added or changed). For non-visual changes (e.g. dependency bump, config-only, refactor with no UI impact), explicitly state "No media needed — verified by tests/build" and check the build/test boxes instead.
- Check dark mode and mobile widths when the PR touches UI.

#### Automated screenshot helper

For page-level screenshots, run the Playwright helper. It builds a production bundle pointed at a local mock API, starts a static server, and captures a full-page screenshot to `pr-assets/<branch-name>/`:

```bash
# from the repo root
pnpm screenshot:pr

# or specify the branch subfolder explicitly
BRANCH_NAME=feat/my-feature pnpm screenshot:pr
```

Edit `scripts/capture-pr-screenshot.mjs` to point at the route and mock data relevant to the feature being reviewed.

To also capture a short screen recording, set `CAPTURE_VIDEO=1`:

```bash
CAPTURE_VIDEO=1 pnpm screenshot:pr
```

This produces `pr-assets/<branch-name>/world-detail.webm` in addition to the screenshot.

#### Attaching media to PRs automatically

The `gh` CLI cannot natively attach local media files. Install the `gh-image` extension to upload images/videos to GitHub's CDN and receive ready-to-paste markdown:

```bash
gh extension install drogers0/gh-image --pin v1.1.0
```

Then upload files and paste the returned markdown into the PR description:

```bash
gh image pr-assets/<branch-name>/*.png pr-assets/<branch-name>/*.webm
```

##### Security rules for `gh-image`

- **Never run `gh image extract-token` inside an agent session** or log its output. `user_session` cookies grant full GitHub account access.
- **Never pass `--token` on the command line.** Prefer browser-cookie extraction (default) or set `GH_SESSION_TOKEN` via the environment. `--token` is visible in `ps aux`.
- **Use a dedicated bot account for CI or shared environments.** Do not use a maintainer's personal session in CI, scheduled jobs, or long-lived env files.
- **Only upload files under `pr-assets/<branch-name>/`.** Do not upload `.env` files, logs, build artifacts, or screenshots that may contain secrets or PII.
- **Pin the extension version** and verify the installed binary against the published release checksum if you build from source.
- **Revoke the session immediately** if a token value is ever exposed in a transcript, log, or shared channel.

### Risk assessment

Pick a single overall risk level using the badge in the template:

- `low` — isolated change, limited files, no auth/security surface, no schema or env changes, well-covered by tests.
- `medium` — touches shared components/pages, adds a dependency, changes data fetching shape, or involves user input/auth but follows existing patterns.
- `high` — broad refactor, security-sensitive code, auth/token handling, schema migration, feature flag wiring, or changes that could break core user flows across the app.

In the PR description, include the badge and a short bulleted rationale under `## Risk Rating`. Preferably link each bullet to the relevant diff file/line on GitHub (e.g. `https://github.com/Moistbobo/sos-world-dashboard/pull/NN/files#diff-...`).

Consider these factors when rating and documenting blast radius:

1. **Scope** — number of files and domains touched.
2. **Blast radius** — can it break pages/flows outside the immediate feature?
3. **Data/schema** — new tables, columns, localStorage keys, or env variables.
4. **Auth/security** — credentials, JWT, RLS policies, secrets, third-party tokens, XSS/CSRF exposure.
5. **Dependencies** — new packages or service integrations.

Call out concrete security concerns (even if rated low) so reviewers know where to focus.

## Ticket Creation

Whenever creating a GitHub issue/ticket, always use the template located at `.github/ISSUE_TEMPLATE/ticket.md`.

The `authoring-a-ticket` skill governs ticket content. `.github/ISSUE_TEMPLATE/ticket.md` is the scaffold only: keep its front matter, section names, and order, but append any section the skill requires for the ticket type that the template lacks (e.g. numbered `AC-1` scenarios, Assumptions, Edge cases, Root cause hypothesis, How we verify the fix), and replace the template's placeholder bodies with the skill's content. A template placeholder (such as the meta-checklist under Acceptance criteria) never overrides a skill requirement.
