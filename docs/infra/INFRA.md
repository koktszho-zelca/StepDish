# StepDish — Infrastructure Specification & Cost Estimates

> **Version 1.1 | May 2026**
> This document records all infrastructure decisions, region choices, HK-specific constraints, and monthly cost estimates for every phase of StepDish.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Service Decisions](#2-service-decisions)
3. [Database Strategy — CockroachDB → Supabase](#3-database-strategy--cockroachdb--supabase)
4. [OpenAI & Hong Kong — The Blocker & Solutions](#4-openai--hong-kong--the-blocker--solutions)
5. [Region Strategy](#5-region-strategy)
6. [Environment Variables Reference](#6-environment-variables-reference)
7. [Cost Estimates by Phase](#7-cost-estimates-by-phase)
8. [Cost Optimisation Rules](#8-cost-optimisation-rules)
9. [Decision Log](#9-decision-log)

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
┌─────────────────────────┐       ┌─────────────────────────┦
│  CockroachDB Serverless   │       │  OpenAI API (US)         │
│  Phase 1 — FREE tier      │       │  GPT-4o                  │
│  5 GiB + 50M RUs/mo       │       │  Called from Vercel      │
│  GCP Singapore ✅          │       │  servers — HK-safe ✅    │
│  ↓ migrates to Supabase   │       └──────────────────────────┘
│  at Phase 3               │
└─────────────────────────┘

┌─────────────────────────┐       ┌─────────────────────────┦
│  Cloudflare R2            │       │  Clerk Auth              │
│  Object Storage           │       │  (global CDN)            │
│  HK edge PoP ✅            │       │  JWT sessions            │
└─────────────────────────┘       └─────────────────────────┘
```

---

## 2. Service Decisions

| Layer | Phase 1 Service | Phase 3 Service | Rationale |
|---|---|---|---|
| **Hosting** | Vercel Hobby (free) | Vercel Pro ($20/mo) | Best Next.js support; Singapore `sin1` region; GitHub CI/CD |
| **Database** | CockroachDB Serverless (free) | Supabase Pro (Singapore) | Free for MVP; migrate to Supabase at Phase 3 for `pgvector` + realtime. See §3. |
| **Auth** | Clerk Free (50k MAU) | Clerk Pro | 50,000 MAU free; built-in UI; Prisma adapter |
| **AI** | OpenAI GPT-4o (pay-per-token) | Same | Server-side only; HK-safe via Vercel. Azure fallback for local dev. |
| **Storage** | Cloudflare R2 (free tier) | Cloudflare R2 (pay-as-you-go) | Zero egress; 10GB + 10M reads free; HK edge PoP |
| **Search** | CockroachDB FTS | Typesense Cloud ($15/mo) | FTS sufficient for Phase 1; Typesense at Phase 3 scale |
| **Email** | Resend Free (3k/mo) | Resend Pro ($20/mo) | Simple API; generous free tier |
| **Monitoring** | Vercel Analytics + Sentry Free | Sentry Team ($26/mo) | Error tracking + performance |

---

## 3. Database Strategy — CockroachDB → Supabase

### Phase 1: CockroachDB Serverless

**Why CockroachDB for Phase 1:**
- **$0/mo free tier** — 5 GiB storage + 50M Request Units/month (well above MVP needs)
- **Prisma first-class support** — use `provider = "cockroachdb"` in `schema.prisma`; all models, relations, and migrations work identically to PostgreSQL
- **GCP Singapore region** — low latency from HK (~25–40ms)
- **Serverless** — scales to zero; no idle compute costs
- **No credit card required** for Serverless free tier

**`schema.prisma` setup:**
```prisma
datasource db {
  provider = "cockroachdb"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

**CockroachDB constraints to know:**
- Serializable isolation only (no Read Committed) — safe but different from standard PostgreSQL defaults
- No PostgreSQL extensions (`pgvector`, `pg_trgm`, `postgis`) — this is the main limitation driving Phase 3 migration
- `SERIAL` type generates globally unique IDs (not sequential) — use `@default(gen_random_uuid())` for UUIDs or `BigInt @default(autoincrement())` for numeric IDs
- `ALTER TABLE ... ADD COLUMN` with a default is handled differently — always add new columns nullable first, then backfill

### Phase 3: Migrate to Supabase

**Why migrate to Supabase at Phase 3:**
- `pgvector` extension — required for AI recipe similarity search (T-039)
- Realtime subscriptions — live updates for cook mode and notifications
- Row Level Security (RLS) — cleaner per-user data access patterns
- Full PostgreSQL extension ecosystem
- Singapore `ap-southeast-1` region — same low latency as CockroachDB

**Migration trigger:** Begin Supabase migration when **any one** of these is true:
- CockroachDB free tier is consistently exceeded (>5 GiB or >50M RUs/mo)
- T-039 (recipe similarity search) is scheduled
- Realtime features are prioritised
- User count exceeds ~5,000

**Migration steps (high level):**
1. Provision Supabase project in `ap-southeast-1`
2. Change `schema.prisma` provider from `"cockroachdb"` to `"postgresql"`
3. Run `prisma migrate deploy` against Supabase
4. Export data from CockroachDB (`EXPORT INTO CSV` or `pg_dump` via CockroachDB SQL shell)
5. Import into Supabase via `psql` or Supabase dashboard
6. Validate row counts and spot-check data integrity
7. Update `DATABASE_URL` in Vercel env vars
8. Deploy and smoke test
9. Keep CockroachDB read-only for 1 week as rollback option, then terminate

> **Estimated migration effort:** 1–2 days for a solo developer at Phase 3 scale.

---

## 4. OpenAI & Hong Kong — The Blocker & Solutions

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

## 5. Region Strategy

All services are deployed in **Asia Pacific / Singapore** to minimise latency from Hong Kong (~25–40ms to Singapore vs ~200ms to US east).

| Service | Phase 1 Region | Phase 3 Region | Notes |
|---|---|---|---|
| Vercel | Singapore `sin1` | Singapore `sin1` | Set in `vercel.json` |
| CockroachDB Serverless | GCP Singapore | — (replaced) | Select during cluster creation |
| Supabase (Phase 3) | — | `ap-southeast-1` | Singapore region |
| Cloudflare R2 | Automatic (HK PoP) | Same | Zero egress; nearest PoP |
| Clerk | Global CDN | Same | No region choice needed |
| OpenAI | US (via Vercel) | Same | Vercel → OpenAI ~150ms; acceptable |

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

## 6. Environment Variables Reference

All variables must be in `.env.example` with placeholder values. Never commit real values.

```bash
# .env.example

# ── Database (CockroachDB Serverless — Phase 1) ─────────────
# Get from CockroachDB Cloud console → Connect → Prisma
# Format: postgresql://user:password@host:26257/stepdish?sslmode=verify-full
DATABASE_URL="postgresql://user:password@free-tier.gcp-asia-southeast1.cockroachlabs.cloud:26257/stepdish?sslmode=verify-full"

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

## 7. Cost Estimates by Phase

### Phase 1 — MVP (0–500 users, ~0–3 months)

| Service | Plan | Monthly Cost (USD) | Notes |
|---|---|---|---|
| Vercel | Hobby (free) | $0 | 100GB bandwidth, unlimited deploys |
| **CockroachDB Serverless** | **Free tier** | **$0** | **5 GiB + 50M RUs/mo free — replaces Railway $5/mo** |
| Clerk | Free | $0 | Up to 50,000 MAU |
| Cloudflare R2 | Free tier | $0 | 10GB storage + 10M reads/mo free |
| OpenAI GPT-4o | Pay-per-token | ~$1–3 | ~100 recipe imports/mo × ~$0.01–0.03/call |
| Resend | Free | $0 | 3,000 emails/mo free |
| **Total** | | **~$1–3/mo** | **Saving ~$5/mo vs Railway** |

### Phase 2 — Growth (500–5,000 users, ~3–9 months)

| Service | Plan | Monthly Cost (USD) | Notes |
|---|---|---|---|
| Vercel | Pro | $20 | Team features, 1TB bandwidth |
| CockroachDB Serverless | Pay-as-you-go | ~$2–5 | $0.50/GiB + $0.20/1M RUs above free tier |
| Clerk | Free | $0 | Still under 50k MAU |
| Cloudflare R2 | Pay-as-you-go | ~$1–3 | ~50GB images + higher read volume |
| OpenAI GPT-4o | Pay-per-token | ~$10–25 | ~500–1,000 imports/mo |
| Resend | Free → Pro | $0–20 | Pro at ~$20/mo if >3k emails |
| Sentry | Free | $0 | 5k errors/mo free |
| **Total** | | **~$33–73/mo** | |

### Phase 3 — Scale (5,000–50,000 users, ~9–18 months)

> 🔄 **Database switches to Supabase Pro at the start of Phase 3.** See §3 for migration steps.

| Service | Plan | Monthly Cost (USD) | Notes |
|---|---|---|---|
| Vercel | Pro | $20 | |
| **Supabase Pro** | **Pro (Singapore)** | **~$25** | **Replaces CockroachDB; enables pgvector + realtime** |
| Clerk | Pro | ~$25–50 | $0.02/MAU above 50k |
| Cloudflare R2 | Pay-as-you-go | ~$5–15 | |
| OpenAI GPT-4o | Pay-per-token | ~$50–150 | Higher volume; cache aggressively |
| Typesense Cloud | Hobby | $15 | Dedicated search cluster |
| Resend | Pro | $20 | |
| Sentry | Team | $26 | |
| **Total** | | **~$161–321/mo** | |

### Cost Scaling Summary

```
Phase 1 (MVP)      ~$1–3/mo       ← CockroachDB free tier saves ~$5/mo vs Railway
Phase 2 (Growth)   ~$33–73/mo    ← After product-market fit
Phase 3 (Scale)    ~$161–321/mo  ← After monetisation; Supabase replaces CockroachDB
```

---

## 8. Cost Optimisation Rules

1. **Cache AI responses.** Store extracted recipe JSON in the DB. Never re-extract the same URL twice. Saves ~80% of OpenAI costs at scale.
2. **Compress images before R2 upload.** Use `sharp` to resize and convert to WebP. Cuts storage costs significantly.
3. **Use ISR for public pages.** Incremental Static Regeneration on the browse page avoids expensive SSR on every request.
4. **Paginate aggressively.** Default page size of 20. Never load unbounded lists from the DB.
5. **Monitor CockroachDB RU consumption.** The free tier includes 50M RUs/mo. Avoid `SELECT *` and full-table scans — they consume RUs fast. Always use indexed queries.
6. **Delay Typesense.** CockroachDB FTS is sufficient up to ~50k recipes. Do not add Typesense until search quality or latency becomes a user complaint.
7. **Delay Clerk paid tier.** 50,000 MAU free is generous for a side project. Do not upgrade until exceeded.
8. **Plan the Supabase migration before you need it.** Do not wait until you are over the CockroachDB free tier to start the migration — schedule it as a planned task at the start of Phase 3.

---

## 9. Decision Log

| Date | Decision | Rationale | Alternatives considered |
|---|---|---|---|
| May 2026 | Vercel over Firebase App Hosting | Simpler billing, native Next.js support, Singapore region, no Cloud Run complexity | Firebase App Hosting (viable but multiple billing meters), Fly.io, Render |
| May 2026 | CockroachDB Serverless (Phase 1) over Railway PostgreSQL | $0/mo vs $5/mo minimum; Prisma GA connector; GCP Singapore region; scales to zero | Railway (simpler but paid), Supabase (Phase 3 target) |
| May 2026 | Supabase planned for Phase 3 | `pgvector` for AI similarity (T-039), realtime, RLS, full PostgreSQL extensions | Stay on CockroachDB (no pgvector), PlanetScale (MySQL, no extensions) |
| May 2026 | OpenAI direct (server-side) over Azure | Simpler setup; HK block is non-issue in production; Azure as fallback for local dev only | Azure OpenAI (full fallback documented in §4) |
| May 2026 | Cloudflare R2 over AWS S3 | Zero egress fees, HK edge PoP, free tier, S3-compatible API | AWS S3 (more expensive egress), Supabase Storage |
| May 2026 | Clerk over NextAuth | Built-in UI, Prisma adapter, generous free tier | NextAuth.js (free, more flexible), Auth.js, Firebase Auth |

---

*Infrastructure spec updated May 2026. Review and update when moving between phases.*
