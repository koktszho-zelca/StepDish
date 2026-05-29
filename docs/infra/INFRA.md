# StepDish — Infrastructure Specification & Cost Estimates

> **Version 1.2 | May 2026**
> This document records all infrastructure decisions, region choices, HK-specific constraints, and monthly cost estimates for every phase of StepDish.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Service Decisions](#2-service-decisions)
3. [Database Strategy — CockroachDB Phase 1](#3-database-strategy--cockroachdb-phase-1)
4. [Vector Search Strategy — Options A / B / C](#4-vector-search-strategy--options-a--b--c)
5. [OpenAI & Hong Kong — The Blocker & Solutions](#5-openai--hong-kong--the-blocker--solutions)
6. [Region Strategy](#6-region-strategy)
7. [Environment Variables Reference](#7-environment-variables-reference)
8. [Cost Estimates by Phase](#8-cost-estimates-by-phase)
9. [Cost Optimisation Rules](#9-cost-optimisation-rules)
10. [Decision Log](#10-decision-log)

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
│  CockroachDB Serverless  │       │  OpenAI API (US)         │
│  Phase 1 — FREE tier     │       │  GPT-4o                  │
│  5 GiB + 50M RUs/mo      │       │  Called from Vercel      │
│  GCP Singapore ✅         │       │  servers — HK-safe ✅    │
└─────────────────────────┘       └──────────────────────────┘

┌─────────────────────────┐       ┌──────────────────────────┐
│  ChromaDB Cloud          │       │  Clerk Auth              │
│  Vector Search           │       │  (global CDN)            │
│  Phase 3 (Option B ✅)   │       │  JWT sessions            │
│  Free: 1M embeddings     │       └──────────────────────────┘
└─────────────────────────┘

┌─────────────────────────┐
│  Cloudflare R2           │
│  Object Storage          │
│  HK edge PoP ✅           │
└─────────────────────────┘
```

---

## 2. Service Decisions

| Layer | Phase 1 Service | Phase 3 Service | Rationale |
|---|---|---|---|
| **Hosting** | Vercel Hobby (free) | Vercel Pro ($20/mo) | Best Next.js support; Singapore `sin1` region; GitHub CI/CD |
| **Database** | CockroachDB Serverless (free) | CockroachDB pay-as-you-go | Free for MVP; stay on CockroachDB with ChromaDB for vectors (Option B). See §3 & §4. |
| **Vector Search** | None (Phase 1) | ChromaDB Cloud (free tier) | **Option B selected** — avoids Supabase migration; 1M embeddings free. See §4. |
| **Auth** | Clerk Free (50k MAU) | Clerk Pro | 50,000 MAU free; built-in UI; Prisma adapter |
| **AI** | OpenAI GPT-4o (pay-per-token) | Same | Server-side only; HK-safe via Vercel. Azure fallback for local dev. |
| **Storage** | Cloudflare R2 (free tier) | Cloudflare R2 (pay-as-you-go) | Zero egress; 10GB + 10M reads free; HK edge PoP |
| **Search** | CockroachDB FTS | Typesense Cloud ($15/mo) | FTS sufficient for Phase 1; Typesense at Phase 3 scale |
| **Email** | Resend Free (3k/mo) | Resend Pro ($20/mo) | Simple API; generous free tier |
| **Monitoring** | Vercel Analytics + Sentry Free | Sentry Team ($26/mo) | Error tracking + performance |

---

## 3. Database Strategy — CockroachDB Phase 1

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
- No PostgreSQL extensions (`pgvector`, `pg_trgm`, `postgis`) — vector search is handled by ChromaDB (Option B) instead
- `SERIAL` type generates globally unique IDs (not sequential) — use `@default(gen_random_uuid())` for UUIDs or `BigInt @default(autoincrement())` for numeric IDs
- `ALTER TABLE ... ADD COLUMN` with a default is handled differently — always add new columns nullable first, then backfill

### Phase 3 onwards: Stay on CockroachDB + ChromaDB

Under **Option B** (selected), CockroachDB remains the relational DB at Phase 3. Vector similarity search is offloaded to **ChromaDB Cloud** rather than migrating to Supabase for `pgvector`. This avoids a full DB migration while still enabling AI-powered recipe similarity (T-039). See §4 for the full rationale and all three options.

**If Option B is ever reconsidered**, the Supabase migration steps are:
1. Provision Supabase project in `ap-southeast-1`
2. Change `schema.prisma` provider from `"cockroachdb"` to `"postgresql"`
3. Run `prisma migrate deploy` against Supabase
4. Export data from CockroachDB (`EXPORT INTO CSV` or `pg_dump` via CockroachDB SQL shell)
5. Import into Supabase via `psql` or Supabase dashboard
6. Validate row counts and spot-check data integrity
7. Update `DATABASE_URL` in Vercel env vars
8. Deploy and smoke test
9. Keep CockroachDB read-only for 1 week as rollback option, then terminate

> **Estimated Supabase migration effort (if needed):** 1–2 days for a solo developer.

---

## 4. Vector Search Strategy — Options A / B / C

Vector embeddings are required for AI recipe similarity search (T-039, Phase 3). Three options were evaluated.

---

### Option A — pgvector on Supabase

| Attribute | Detail |
|---|---|
| **Vector store** | `pgvector` extension inside Supabase PostgreSQL |
| **Relational DB** | Migrate from CockroachDB → Supabase at Phase 3 |
| **Monthly cost** | ~$25/mo (Supabase Pro) — replaces CockroachDB |
| **Pros** | Single DB for both relational + vector data; JOIN vectors with recipe rows in one SQL query; no extra service; RLS + realtime included |
| **Cons** | Requires full DB migration (1–2 dev days); two-round-trip queries replaced by migration complexity; locks you into Supabase |
| **Status** | ❌ Not selected |

---

### Option B — CockroachDB + ChromaDB Cloud ✅ SELECTED

| Attribute | Detail |
|---|---|
| **Vector store** | ChromaDB Cloud — dedicated vector database |
| **Relational DB** | Stay on CockroachDB Serverless (no migration needed) |
| **Monthly cost** | ~$0 (Chroma Cloud free: up to 1M embeddings/mo) |
| **Pros** | Zero DB migration cost or risk; ChromaDB is purpose-built for embeddings; free tier covers StepDish at scale (1M recipe embeddings); Python-native SDK with Node.js HTTP client available |
| **Cons** | Two-service architecture — recipe IDs must be kept in sync between CockroachDB and ChromaDB; similarity queries require two round trips (Chroma → get IDs → CockroachDB → get details) |
| **Why selected** | Avoids migration complexity; $0 vector cost at Phase 3 scale; CockroachDB free tier remains usable; clean separation of concerns |
| **Status** | ✅ **Selected** |

**ChromaDB integration pattern:**
```typescript
// lib/vector/chroma.ts
import { ChromaClient } from 'chromadb';

const chroma = new ChromaClient({
  path: process.env.CHROMA_HOST!, // Chroma Cloud endpoint
  auth: {
    provider: 'token',
    credentials: process.env.CHROMA_API_KEY!,
  },
});

export async function searchSimilarRecipes(queryEmbedding: number[], topK = 10) {
  const collection = await chroma.getCollection({ name: 'recipes' });
  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
  });
  // results.ids[0] → array of CockroachDB recipe UUIDs
  // Second query: fetch recipe details from CockroachDB by those IDs
  return results.ids[0];
}
```

**Sync strategy:** When a recipe is created/updated in CockroachDB, generate its embedding via OpenAI and upsert into ChromaDB collection using the same UUID as the document ID. On delete, remove from both stores.

---

### Option C — Supabase Pro + ChromaDB (Hybrid)

| Attribute | Detail |
|---|---|
| **Vector store** | ChromaDB Cloud |
| **Relational DB** | Supabase Pro (Singapore) |
| **Monthly cost** | ~$25/mo (Supabase) + ChromaDB usage |
| **Pros** | Supabase realtime + RLS; ChromaDB for dedicated vector search |
| **Cons** | Most expensive option; fully redundant — `pgvector` is already included in Supabase Pro, making ChromaDB unnecessary; highest operational overhead |
| **Status** | ❌ Not selected — redundant services with no meaningful benefit over Option A |

---

### Vector Option Comparison

| | Option A | **Option B ✅** | Option C |
|---|---|---|---|
| **DB migration required** | Yes (1–2 days) | No | Yes (1–2 days) |
| **Vector monthly cost** | Included in Supabase $25 | $0 (free 1M embeddings) | $0 + Supabase $25 |
| **Total Phase 3 cost** | ~$25/mo | ~$0 vector / ~$2–5 CockroachDB | ~$25+/mo |
| **Query pattern** | Single SQL JOIN | Two round trips | Two round trips |
| **Operational services** | 1 (Supabase) | 2 (CockroachDB + Chroma) | 3 (Supabase + Chroma) |
| **Realtime / RLS** | ✅ Included | ❌ Not available | ✅ Supabase |
| **Selected** | ❌ | ✅ | ❌ |

> **Note:** If realtime subscriptions or Row Level Security become requirements, re-evaluate Option A. The Supabase migration steps are documented in §3.

---

## 5. OpenAI & Hong Kong — The Blocker & Solutions

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
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT!,
    })
  : new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
```

Set `OPENAI_PROVIDER=azure` in `.env.local` on your HK dev machine. Leave it unset in Vercel production env vars.

### Azure OpenAI Setup (if needed)

1. Create an Azure account — free tier available
2. Create an Azure OpenAI resource in **East Asia** or **Southeast Asia** region
3. Deploy `gpt-4o` model
4. Copy endpoint + API key to `.env.local`
5. Microsoft officially supports HK customers for Azure OpenAI

---

## 6. Region Strategy

All services are deployed in **Asia Pacific / Singapore** to minimise latency from Hong Kong (~25–40ms to Singapore vs ~200ms to US east).

| Service | Phase 1 Region | Phase 3 Region | Notes |
|---|---|---|---|
| Vercel | Singapore `sin1` | Singapore `sin1` | Set in `vercel.json` |
| CockroachDB Serverless | GCP Singapore | GCP Singapore | Stays in Phase 3 under Option B |
| ChromaDB Cloud | Auto (nearest PoP) | Auto | Phase 3 only; no region config needed |
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

---

## 7. Environment Variables Reference

All variables must be in `.env.example` with placeholder values. Never commit real values.

```bash
# .env.example

# ── Database (CockroachDB Serverless — all phases) ──────────
DATABASE_URL="postgresql://user:password@free-tier.gcp-asia-southeast1.cockroachlabs.cloud:26257/stepdish?sslmode=verify-full"

# ── Vector Search (ChromaDB Cloud — Phase 3, Option B) ──────
CHROMA_HOST="https://your-cluster.chromadb.io"
CHROMA_API_KEY="chroma_..."
CHROMA_COLLECTION_NAME="stepdish-recipes"

# ── Auth (Clerk) ─────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# ── AI — OpenAI (production / non-HK dev) ───────────────────
OPENAI_API_KEY="sk-..."
OPENAI_PROVIDER="openai"   # set to "azure" on HK dev machine

# ── AI — Azure OpenAI (HK local dev fallback) ───────────────
AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com"
AZURE_OPENAI_KEY="..."
AZURE_OPENAI_DEPLOYMENT="gpt-4o"

# ── Storage (Cloudflare R2) ──────────────────────────────────
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="stepdish-images"
R2_PUBLIC_URL="https://your-bucket.r2.dev"

# ── Email (Resend) ───────────────────────────────────────────
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# ── App ─────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

---

## 8. Cost Estimates by Phase

> For the full detailed breakdown with growth scenarios see [`docs/infra/HOSTING_COST.md`](./HOSTING_COST.md).

### Phase 1 — MVP (0–500 users, ~0–3 months)

| Service | Plan | Monthly Cost (USD) |
|---|---|---|
| Vercel | Hobby (free) | $0 |
| CockroachDB Serverless | Free tier | $0 |
| Clerk | Free | $0 |
| Cloudflare R2 | Free tier | $0 |
| OpenAI GPT-4o | Pay-per-token | ~$1–3 |
| Resend | Free | $0 |
| **Total** | | **~$1–3/mo** |

### Phase 2 — Growth (500–5,000 users, ~3–9 months)

| Service | Plan | Monthly Cost (USD) |
|---|---|---|
| Vercel | Pro | $20 |
| CockroachDB Serverless | Pay-as-you-go | ~$2–5 |
| Clerk | Free | $0 |
| Cloudflare R2 | Pay-as-you-go | ~$1–3 |
| OpenAI GPT-4o | Pay-per-token | ~$10–25 |
| Resend | Free → Pro | $0–20 |
| Sentry | Free | $0 |
| **Total** | | **~$33–73/mo** |

### Phase 3 — Scale (5,000–50,000 users, ~9–18 months)

> ChromaDB Cloud added for vector search (Option B). No Supabase migration.

| Service | Plan | Monthly Cost (USD) |
|---|---|---|
| Vercel | Pro | $20 |
| CockroachDB Serverless | Pay-as-you-go | ~$5–15 |
| ChromaDB Cloud | Free → usage | ~$0–10 |
| Clerk | Pro | ~$25–50 |
| Cloudflare R2 | Pay-as-you-go | ~$5–15 |
| OpenAI GPT-4o | Pay-per-token | ~$50–150 |
| Typesense Cloud | Hobby | $15 |
| Resend | Pro | $20 |
| Sentry | Team | $26 |
| **Total** | | **~$141–301/mo** |

### Cost Scaling Summary

```
Phase 1 (MVP)      ~$1–3/mo       ← Nearly free; CockroachDB + everything on free tiers
Phase 2 (Growth)   ~$33–73/mo    ← After product-market fit
Phase 3 (Scale)    ~$141–301/mo  ← ChromaDB saves ~$20/mo vs Option A (no Supabase $25)
```

---

## 9. Cost Optimisation Rules

1. **Cache AI responses.** Store extracted recipe JSON in the DB. Never re-extract the same URL twice. Saves ~80% of OpenAI costs at scale.
2. **Compress images before R2 upload.** Use `sharp` to resize and convert to WebP.
3. **Use ISR for public pages.** Incremental Static Regeneration on the browse page avoids expensive SSR on every request.
4. **Paginate aggressively.** Default page size of 20. Never load unbounded lists from the DB.
5. **Monitor CockroachDB RU consumption.** Avoid `SELECT *` and full-table scans — they consume RUs fast. Always use indexed queries.
6. **Batch ChromaDB upserts.** When embedding multiple recipes (e.g. bulk import), batch upsert calls to Chroma rather than one call per recipe.
7. **Delay Typesense.** CockroachDB FTS is sufficient up to ~50k recipes.
8. **Delay Clerk paid tier.** 50,000 MAU free is generous for a side project.

---

## 10. Decision Log

| Date | Decision | Rationale | Alternatives considered |
|---|---|---|---|
| May 2026 | Vercel over Firebase App Hosting | Simpler billing, native Next.js support, Singapore region | Firebase App Hosting, Fly.io, Render |
| May 2026 | CockroachDB Serverless (all phases) | $0/mo free tier; Prisma GA connector; GCP Singapore; scales to zero | Railway (paid), Supabase (Option A) |
| May 2026 | ChromaDB Cloud for vectors (Option B) | Avoids DB migration; $0 free tier (1M embeddings); clean separation of concerns | pgvector/Supabase (Option A), Supabase+Chroma hybrid (Option C) |
| May 2026 | OpenAI direct (server-side) over Azure | Simpler; HK block non-issue in production; Azure fallback for local dev | Azure OpenAI (documented in §5) |
| May 2026 | Cloudflare R2 over AWS S3 | Zero egress fees, HK edge PoP, free tier, S3-compatible API | AWS S3, Supabase Storage |
| May 2026 | Clerk over NextAuth | Built-in UI, Prisma adapter, generous free tier | NextAuth.js, Auth.js, Firebase Auth |

---

*Infrastructure spec updated May 2026 (v1.2). Review and update when moving between phases.*
