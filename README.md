# SOS World Dashboard

A dashboard for browsing and curating VRChat worlds. Built with Vite, React 18, and TypeScript.

## Live Sites

- **Testnet:** https://testnet.googoogaagaa.club/
- **Production:** https://sosd.googoogaagaa.club/

## Features

- Browse worlds with search, tag, platform, quality, capacity, and date-range filters
- World detail pages with ratings and community comments (Supabase-backed)
- Curated lists with import/export
- Tag browsing
- Dashboard with platform and quality stats
- English and Japanese localization
- Dark/light theme

## Tech Stack

- Vite + React 18 + TypeScript
- TanStack Query for data fetching
- React Router for client-side routing
- Tailwind CSS
- i18next (en/ja)
- Supabase (community sentiment: ratings + comments)
- Cloudflare Turnstile
- Vitest + Playwright for testing
- Deployed on Vercel

## Architecture

```mermaid
---
config:
  layout: fixed
---
flowchart LR
 subgraph client["Client Layer (Browser)"]
        us["Sos Twitter Userscript<br>Tampermonkey extension"]
        dash["Sos World Dashboard<br>React 19 SPA"]
  end
 subgraph edge["Edge / Platform"]
        webhook["Discord Webhook<br>user-configured"]
        vercel["Vercel<br>hosts sos-world-dashboard<br>static hosting + strict CSP"]
  end
 subgraph runtime["Server Host Digital Ocean Droplet (PM2)"]
    direction TB
        bot["Ingestion Service<br>Discord Bot (discord.js v14)"]
        api["Core API Service<br>Express 5 REST server"]
        pgsql[("Primary Data Store<br>PostgreSQL")]
        botcfg[("Bot Config Store<br>db.json (keyv-file)")]
  end
    us -- POST webhook (fixupx URL + tags) --> webhook
    webhook -- message in watched channel --> discord["External Actor<br>Discord Guild Channels"]
    discord <-- HTTPS WebSocket gateway + REST --> bot
    bot -- HTTPS / REST, Bearer (curator) --> api
    api -- HTTPS / REST, fetch tweet text --> vxtwitter["External Service<br>vxtwitter (tweet content extraction)"]
    dash -- HTTPS / REST, Bearer (viewer) --> api
    dash -- HTTPS / REST, anonymous + Turnstile --> supabase["External Service<br>Supabase (PostgREST)"]
    api -- HTTPS / REST, credentials + TOTP --> vrchat["External Service<br>VRChat API"]
    api -- PostgreSQL wire protocol --> pgsql
    bot -. "file I/O, keyv-file" .-> botcfg
    dash -- "HTTPS, image proxy (wsrv.nl)" --> imagecdn["External Service<br>VRChat Image CDN"]
    dash -. deploy .-> vercel
    api -- stream logs (Axiom) --> axiom["External Service<br>Axiom (log shipping)"]

     us:::client
     dash:::client
     webhook:::boundary
     vercel:::boundary
     bot:::service
     api:::service
     pgsql:::store
     botcfg:::store
     discord:::external
     vrchat:::external
     vxtwitter:::external
     supabase:::external
     imagecdn:::external
     axiom:::external
    classDef external fill:#fde2e2,stroke:#b85450,stroke-width:2px,color:#333
    classDef store fill:#e7e0f5,stroke:#8a63d2,stroke-width:2px,color:#333
    classDef service fill:#e2f0fa,stroke:#4a90d9,stroke-width:2px,color:#333
    classDef boundary fill:#f5f5f5,stroke:#9e9e9e,stroke-dasharray:5 3,color:#333
    classDef client fill:#fff3e0,stroke:#ed8b00,stroke-width:2px,color:#333
```

## Getting Started

Requires `pnpm@11.5.1`.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

The dev server runs at http://localhost:5173.

### Environment Variables

| Variable | Description |
| --- | --- |
| `VITE_API_BASE_URL` | Backend API base URL (defaults to `http://localhost:3000`) |
| `VITE_API_BEARER_TOKEN` | Optional bearer token sent as `Authorization: Bearer ...` |
| `VITE_SUPABASE_URL` | Supabase project URL (required at import time) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (required at import time) |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |
| `VITE_ENABLE_COMMUNITY_SENTIMENT` | Set `true` to show ratings/comments UI (default `false`) |

## Scripts

```bash
pnpm dev          # dev server
pnpm build        # typecheck + production build -> dist/
pnpm preview      # preview the production build
pnpm lint         # eslint
pnpm test         # vitest (unit)
pnpm test:e2e     # playwright (e2e)
pnpm screenshot:pr # capture a PR screenshot via Playwright
```

## Project Structure

```
src/
├── api/          # fetch helpers and backend client
├── components/   # kebab-case folders with barrel exports
├── contexts/     # preference and list state providers
├── hooks/        # TanStack Query hooks and custom hooks
├── i18n/         # i18next setup with en.json / ja.json
├── lib/          # Supabase client
├── pages/        # route pages (kebab-case folders with barrels)
└── types.ts      # shared domain types
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for issue templates, PR conventions, and local Supabase setup.
