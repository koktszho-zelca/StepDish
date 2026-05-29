# StepDish — Infrastructure Specification & Cost Estimates

> **Version 1.0 | May 2026**
> This document records all infrastructure decisions, region choices, HK-specific constraints, and monthly cost estimates for every phase of StepDish.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Service Decisions](#2-service-decisions)
3. [OpenAI & Hong Kong — The Blocker & Solutions](#3-openai--hong-kong--the-blocker--solutions)
4. [Region Strategy](#4-region-strategy)
5. [Environment Variables Reference](#5-environment-variables-reference)
6. [Cost Estimates by Phase](#6-cost-estimates-by-phase)
7. [Cost Optimisation Rules](#7-cost-optimisation-rules)
8. [Decision Log](#8-decision-log)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        USER (Hong Kong)                     │
└───────────────────┬─────────────────────────────────────────┘
                    │  HTTPS
                    ▼
┌─────────────────────────────────────────────────────────────┐
│            Vercel Edge (Singapore sin1 region)              │
│         Next.js App Router — SSR + API Routes               │
│                                                             │
│  ┌──────────────┐   ┌───────────────┐   ┌───────────────┐  │
│  │  Page SSR    │   │  /api/recipes │   │  /api/ai      │  │
│  │  (React)     │   │  /api/steps   │   │  (extraction) │  │
│  └──────────────┘   └──────┬────────┘   └──────┬────────┘  │
└─────────────────────────────┼──────────────────┼───────────┘
                              │                  │
              ┌───────────────┘                  │
              ▼                                  ▼
┌─────────────────────────┐       ┌──────────────────────────┐
│  PostgreSQL              │       │  OpenAI API (US)         │
│  Railway / Supabase      │       │  GPT-4o                  │
│  Singapore region        │       │  Called from Vercel      │
│  (ap-southeast-1)        │       │  servers — HK-safe ✅    │
└─────────────────────────┘       └──────────────────────────┘

┌─────────────────────────┐       ┌──────────────────────────┐
│  Cloudflare R2           │       │  Clerk Auth              │
│  Object Storage          │       │  (global CDN)            │
│  HK edge PoP ✅          │       │  JWT sessions            │
└─────────────────────────┘       └──────────────────────────┘
```

---

## 2. Service Decisions

| Layer | Service | Plan | Rationale |
|---|---|---|---|
| **Hosting** | Vercel | Hobby (MVP) → Pro (growth) | Best Next.js App Router support; Singapore region available; simple CI/CD from GitHub |
| **Database** | Railway PostgreSQL | Hobby $5/mo | Simple setup, predictable pricing, Singapore region available. Supabase is the backup option (also has Singapore). |
| **Auth** | Clerk | Free (up to 50k MAU) | 50,000 MAU free as of Feb 2026; built-in UI components; Prisma adapter available |
| **AI** | OpenAI GPT-4o | Pay-per-token | Best recipe extraction quality; called server-side only (HK-safe). Azure OpenAI as fallback for local dev. |
| **Storage** | Cloudflare R2 | Free → Pay-as-you-go | Zero egress fees; 10GB + 10M reads free; S3-compatible API; HK edge PoP |
| **Search (P1)** | PostgreSQL FTS | Included in DB | Sufficient for Phase 1 scale; no extra service needed |
| **Search (P3)** | Typesense Cloud | Hobby $15/mo | Upgrade at Phase 3 when FTS becomes a bottleneck |
| **Email** | Resend | Free (3k/mo) | For transactional emails (welcome, password reset); simple API |
| **Monitoring** | Vercel Analytics + Sentry | Free tier | Error tracking and performance; upgrade when team grows |

---

## 3. OpenAI & Hong Kong — The Blocker & Solutions

### The Problem

OpenAI officially restricted direct ChatGPT and API access from Hong Kong starting **July 2024**. Any HTTP request to `api.openai.com` originating from a HK IP address will be rejected with a 403 error.

### Why This Is Not a Production Problem

In production, **your Next.js API routes run on Vercel servers in Singapore**, not on your HK machine. The request flow is:

```
User browser (HK) → Vercel API route (Singapore) → OpenAI API (US) ✅
```

The OpenAI API call originates from Vercel's Singapore servers, which are not blocked. No change to the code or API key is needed for production.

### The Local Development Problem

When you run `pnpm dev` on your HK machine and trigger an AI extraction, **your local server calls OpenAI from a HK IP** → blocked.

### Solutions for Local Development

| Option | Setup effort | Cost | Recommended? |
|---|---|---|---|
| **VPN (easiest)** | 5 min | ~$5–10/mo personal VPN | ✅ Best for solo dev |
| **Azure OpenAI fallback** | 1–2 hours | Pay-per-token (same price) | ✅ Best for team / CI |
| **Mock AI in local dev** | 30 min | Free | ✅ Best for fast local iteration |
| Cloudflare AI Gateway proxy | 1 hour | Free tier | Optional |

### Recommended Pattern — Dual Provider with Env Flag

```typescript
// lib/ai/client.ts
const useAzure = process.env.OPENAI_PROVIDER === 'azure';

export const openai = useAzure
  ? new AzureOpenAI({
      endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
      apiKey: process.env.AZURE_OPENAI_KEY!,
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT!, // e.g. 'gpt-4o'
    })
  : new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
```

Set `OPENAI_PROVIDER=azure` in `.env.local` on your HK dev machine. Leave it unset (defaults to OpenAI direct) in Vercel production env vars.

### Azure OpenAI Setup (if needed)

1. Create an Azure account — free tier available
2. Create an Azure OpenAI resource in **East Asia** or **Southeast Asia** region
3. Deploy `gpt-4o` model
4. Copy endpoint + API key to `.env.local`
5. Microsoft officially supports HK customers for Azure OpenAI

---

## 4. Region Strategy

All services should be deployed as close to **Asia Pacific** as possible to minimise latency from Hong Kong (~25–40ms to Singapore vs ~200ms to US).

| Service | Target Region | Region Code | Notes |
|---|---|---|---|
| Vercel | Singapore | `sin1` | Set in `vercel.json` or project settings |
| Railway PostgreSQL | Singapore | `ap-southeast-1` | Select during project creation |
| Supabase (if used) | Singapore | `ap-southeast-1` | Default HK-friendly option |
| Cloudflare R2 | Automatic | — | Cloudflare routes to nearest PoP; HK has a PoP |
| Clerk | Global CDN | — | No region choice needed |
| OpenAI | US (via Vercel) | — | Vercel → OpenAI latency acceptable (~150ms) |

### Vercel Region Config

Add to `vercel.json` at project root:

```json
{
  "regions": ["sin1"],
  "functions": {
    "app/api/**": {
      "maxDuration": 30
    },
    "app/api/ai/**": {
      "maxDuration": 60
    }
  }
}
```

> AI extraction routes get a 60s timeout to handle longer GPT-4o responses.

---

## 5. Environment Variables Reference

All variables must be present in `.env.example` with placeholder values. Never commit real values.

```bash
# .env.example

# ── Database ──────────────────────────────────────────
DATABASE_URL="postgresql://user:password@host:5432/stepdish"

# ── Auth (Clerk) ───────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# ── AI — OpenAI (production / non-HK dev) ─────────────
OPENAI_API_KEY="sk-..."
OPENAI_PROVIDER="openai"   # set to "azure" on HK dev machine

# ── AI — Azure OpenAI (HK local dev fallback) ─────────
AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com"
AZURE_OPENAI_KEY="..."
AZURE_OPENAI_DEPLOYMENT="gpt-4o"

# ── Storage (Cloudflare R2) ────────────────────────────
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="stepdish-images"
R2_PUBLIC_URL="https://your-bucket.r2.dev"

# ── Email (Resend) ─────────────────────────────────────
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# ── App ────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

---

## 6. Cost Estimates by Phase

### Phase 1 — MVP (0–500 users, ~0–3 months)

| Service | Plan | Monthly Cost (USD) | Notes |
|---|---|---|---|
| Vercel | Hobby (free) | $0 | 100GB bandwidth, unlimited deploys |
| Railway PostgreSQL | Hobby | ~$5 | $5/mo minimum; actual DB usage ~$0.55 for small workload |
| Clerk | Free | $0 | Up to 50,000 MAU |
| Cloudflare R2 | Free tier | $0 | 10GB storage + 10M Class B reads/mo free |
| OpenAI GPT-4o | Pay-per-token | ~$1–3 | ~100 recipe imports/mo × ~$0.01–0.03/call |
| Resend | Free | $0 | 3,000 emails/mo free |
| **Total** | | **~$6–8/mo** | |

### Phase 2 — Growth (500–5,000 users, ~3–9 months)

| Service | Plan | Monthly Cost (USD) | Notes |
|---|---|---|---|
| Vercel | Pro | $20 | Team features, 1TB bandwidth, advanced analytics |
| Railway PostgreSQL | Hobby+ | ~$10–15 | More storage and connections as data grows |
| Clerk | Free | $0 | Still under 50k MAU |
| Cloudflare R2 | Pay-as-you-go | ~$1–3 | ~50GB images + higher read volume |
| OpenAI GPT-4o | Pay-per-token | ~$10–25 | ~500–1,000 imports/mo |
| Resend | Free → Pro | $0–20 | Pro at ~$20/mo if >3k emails |
| Sentry | Free | $0 | Error monitoring, 5k errors/mo free |
| **Total** | | **~$41–83/mo** | |

### Phase 3 — Scale (5,000–50,000 users, ~9–18 months)

| Service | Plan | Monthly Cost (USD) | Notes |
|---|---|---|---|
| Vercel | Pro | $20 | May need Enterprise at very high traffic |
| Railway / Supabase PostgreSQL | Pro | ~$25–50 | Dedicated resources, read replicas |
| Clerk | Pro | ~$25–50 | $0.02/MAU above 50k; 10k extra = $200 |
| Cloudflare R2 | Pay-as-you-go | ~$5–15 | Scales linearly; still zero egress |
| OpenAI GPT-4o | Pay-per-token | ~$50–150 | Higher import volume; consider caching |
| Typesense Cloud | Hobby | $15 | Dedicated search cluster |
| Resend | Pro | $20 | |
| Sentry | Team | $26 | |
| **Total** | | **~$166–326/mo** | |

### Cost Scaling Summary

```
Phase 1 (MVP)      ~$6–8/mo      ← Start here
Phase 2 (Growth)   ~$41–83/mo   ← After product-market fit
Phase 3 (Scale)    ~$166–326/mo ← After monetisation
```

---

## 7. Cost Optimisation Rules

1. **Cache AI responses.** Store extracted recipe JSON in the DB. Never re-extract the same URL twice. Saves ~80% of OpenAI costs at scale.
2. **Compress images before R2 upload.** Use `sharp` to resize and convert to WebP before uploading. Cuts storage and bandwidth costs significantly.
3. **Use ISR for public pages.** Incremental Static Regeneration on the browse page avoids expensive SSR on every request.
4. **Paginate aggressively.** Default page size of 20. Never load unbounded lists from the DB.
5. **Connection pooling.** Use `@prisma/adapter-pg` with a connection pool to avoid Railway's connection limit on the Hobby plan.
6. **Delay Typesense.** PostgreSQL FTS is sufficient up to ~50k recipes. Do not add Typesense until search quality or latency becomes a user complaint.
7. **Delay Clerk paid tier.** 50,000 MAU free is generous for a side project. Do not upgrade until you exceed that.

---

## 8. Decision Log

| Date | Decision | Rationale | Alternatives considered |
|---|---|---|---|
| May 2026 | Vercel over Firebase App Hosting | Simpler billing, native Next.js support, Singapore region, no Cloud Run complexity | Firebase App Hosting (viable but multiple billing meters), Fly.io, Render |
| May 2026 | Railway over Supabase for DB | Simpler setup for a pure PostgreSQL + Prisma stack | Supabase (good HK latency too; better if realtime needed), PlanetScale (MySQL) |
| May 2026 | OpenAI direct (server-side) over Azure | Simpler setup; HK block is non-issue in production; Azure as fallback for local dev only | Azure OpenAI (full fallback documented in §3) |
| May 2026 | Cloudflare R2 over AWS S3 | Zero egress fees, HK edge PoP, free tier, S3-compatible API | AWS S3 (more expensive egress), Supabase Storage (fine but less control) |
| May 2026 | Clerk over NextAuth | Built-in UI, Prisma adapter, generous free tier; NextAuth requires more boilerplate | NextAuth.js (free, more flexible), Auth.js, Firebase Auth |

---

*Infrastructure spec prepared May 2026. Review and update when moving between phases.*
