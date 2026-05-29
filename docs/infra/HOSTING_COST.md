# StepDish — Hosting Cost Estimation

> **Version 1.0 | May 2026**
> Detailed monthly cost breakdown for all three phases. All prices in USD. Figures are estimates based on published pricing at time of writing — verify current rates before budgeting.
>
> For architecture decisions and service rationale see [`INFRA.md`](./INFRA.md).
> Vector DB option selected: **Option B — CockroachDB + ChromaDB Cloud**.

---

## Summary

| Phase | Users | Timeline | Monthly Cost (Low) | Monthly Cost (High) | Annual Estimate |
|---|---|---|---|---|---|
| **Phase 1 — MVP** | 0–500 | Month 0–3 | $1 | $3 | ~$6–36 |
| **Phase 2 — Growth** | 500–5,000 | Month 3–9 | $33 | $73 | ~$198–438 |
| **Phase 3 — Scale** | 5,000–50,000 | Month 9–18 | $141 | $301 | ~$1,269–2,709 |

---

## Phase 1 — MVP

> **Goal:** Prove the core recipe workflow. Keep costs as close to $0 as possible.
> **Stack:** Vercel Hobby · CockroachDB Serverless Free · Clerk Free · Cloudflare R2 Free · OpenAI pay-per-token · Resend Free

### Monthly Breakdown

| Service | Plan | Unit Price | Est. Usage | Monthly Cost |
|---|---|---|---|---|
| **Vercel** | Hobby (free) | $0 | — | **$0** |
| **CockroachDB Serverless** | Free tier | $0 up to 5 GiB + 50M RUs | <1 GiB · <5M RUs | **$0** |
| **Clerk Auth** | Free | $0 up to 50k MAU | <200 MAU | **$0** |
| **Cloudflare R2** | Free tier | $0 up to 10GB + 10M reads | <1GB · <100k reads | **$0** |
| **OpenAI GPT-4o** | Pay-per-token | ~$0.01–0.03/recipe import | ~50–100 imports/mo | **~$1–3** |
| **Resend** | Free | $0 up to 3k emails/mo | <100 emails/mo | **$0** |
| **Sentry** | Free | $0 up to 5k errors/mo | <500 errors/mo | **$0** |
| | | | **Total** | **~$1–3/mo** |

### Phase 1 Notes

- CockroachDB free tier: 5 GiB storage + 50M Request Units/month. At Phase 1 scale (~500 recipes, ~200 users), estimated usage is <0.5 GiB and <3M RUs — well within limits.
- OpenAI cost dominates Phase 1. Each recipe import uses ~500–1,500 tokens for extraction + step normalization ≈ $0.01–0.03 per call at GPT-4o input pricing ($5/1M input tokens, $15/1M output tokens as of May 2026).
- R2 free tier covers ~10,000 recipe images at 1MB average.
- No ChromaDB needed in Phase 1 — vector search is a Phase 3 feature.

---

## Phase 2 — Growth

> **Goal:** Product-market fit. Onboard first real users. Upgrade Vercel for team CI/CD and bandwidth.
> **Stack:** Vercel Pro · CockroachDB pay-as-you-go · Clerk Free · Cloudflare R2 pay-as-you-go · OpenAI · Resend

### Monthly Breakdown

| Service | Plan | Unit Price | Est. Usage | Monthly Cost |
|---|---|---|---|---|
| **Vercel** | Pro | $20 flat | — | **$20** |
| **CockroachDB Serverless** | Pay-as-you-go | $0.50/GiB · $0.20/1M RUs above free | ~3–5 GiB · ~60M RUs | **~$2–5** |
| **Clerk Auth** | Free | $0 up to 50k MAU | <5,000 MAU | **$0** |
| **Cloudflare R2** | Pay-as-you-go | $0.015/GB storage · $0.36/1M Class B reads | ~50GB · ~2M reads | **~$1–3** |
| **OpenAI GPT-4o** | Pay-per-token | ~$0.01–0.03/recipe import | ~500–1,000 imports/mo | **~$10–25** |
| **Resend** | Free → Pro | $0 (free) / $20/mo (Pro >3k emails) | ~2–5k emails/mo | **~$0–20** |
| **Sentry** | Free | $0 | <5k errors/mo | **$0** |
| | | | **Total** | **~$33–73/mo** |

### Phase 2 Notes

- CockroachDB pay-as-you-go kicks in above 5 GiB or 50M RUs. At 5,000 users each creating ~5 recipes, estimated DB size is ~3–5 GiB.
- Vercel Pro is needed for: build caching, team seats, 1TB bandwidth, and edge config.
- Resend Pro trigger: ~$20/mo only when transactional emails exceed 3,000/mo (roughly when MAU > 1,000 active users receiving weekly digests).
- OpenAI costs scale linearly with import volume. Cache all extraction results — re-importing the same URL must read from DB, not call OpenAI again.

---

## Phase 3 — Scale

> **Goal:** Public launch. AI-powered similarity search live. Search and notification infrastructure upgraded.
> **Stack:** Vercel Pro · CockroachDB pay-as-you-go · **ChromaDB Cloud (Option B)** · Clerk Pro · Cloudflare R2 · OpenAI · Typesense · Resend Pro · Sentry Team

### Monthly Breakdown

| Service | Plan | Unit Price | Est. Usage | Monthly Cost |
|---|---|---|---|---|
| **Vercel** | Pro | $20 flat | — | **$20** |
| **CockroachDB Serverless** | Pay-as-you-go | $0.50/GiB · $0.20/1M RUs | ~15–25 GiB · ~200M RUs | **~$5–15** |
| **ChromaDB Cloud** ✅ | Free → usage | $0 up to 1M embeddings/mo | ~50k–200k embeddings/mo | **~$0–10** |
| **Clerk Auth** | Pro | $0.02/MAU above 50k | ~5k–15k MAU above free | **~$25–50** |
| **Cloudflare R2** | Pay-as-you-go | $0.015/GB · $0.36/1M reads | ~200GB · ~20M reads | **~$5–15** |
| **OpenAI GPT-4o** | Pay-per-token | ~$0.01–0.03/import + embeddings | ~3k–8k imports/mo + embeddings | **~$50–150** |
| **Typesense Cloud** | Hobby | $15 flat | — | **$15** |
| **Resend** | Pro | $20 flat | — | **$20** |
| **Sentry** | Team | $26 flat | — | **$26** |
| | | | **Total** | **~$141–301/mo** |

### Phase 3 Notes

**ChromaDB Cloud (Option B):**
- Free tier covers 1M embeddings/month. At Phase 3 scale (~50,000 recipes, each embedded once), the total corpus fits comfortably within free tier. Monthly re-embedding on update is the main variable cost.
- Embeddings are generated via OpenAI `text-embedding-3-small` ($0.02/1M tokens) — much cheaper than GPT-4o calls. Estimate: ~500 tokens/recipe × 50k recipes = 25M tokens = ~$0.50 one-time batch cost.
- Two-round-trip query pattern: Chroma returns recipe UUIDs → CockroachDB fetches full recipe details. Latency overhead ~20–50ms at Singapore PoP — acceptable for a browse/discovery feature.

**OpenAI breakdown at Phase 3:**
| Use case | Volume | Cost/unit | Monthly cost |
|---|---|---|---|
| Recipe import extraction (GPT-4o) | 3k–8k/mo | $0.01–0.03 | $30–240 |
| Recipe embeddings (text-embedding-3-small) | ~10k updates/mo | ~$0.00001 | ~$0.10 |
| Step normalization (GPT-4o) | Included in import | — | — |
| **Subtotal** | | | **~$30–240/mo** |

> Cache all GPT-4o extraction results. Embedding regeneration should only trigger on significant recipe edits, not every save.

**CockroachDB at Phase 3:**
- 50,000 recipes × ~10 steps each × ~500 bytes/step ≈ ~250MB recipe data
- User table, revision history, comments, ratings adds ~10–15 GiB total at Phase 3 scale
- RU estimate: ~200M RUs/mo at 50k MAU with typical browse/search/edit patterns
- Cost above free tier: ~(15 GiB × $0.50) + (150M RUs × $0.20/1M) = $7.50 + $30 = ~$37.50/mo at midpoint — the table above reflects this range

---

## Vector DB Cost Comparison (Phase 3)

| | Option A (pgvector/Supabase) | **Option B ✅ (ChromaDB)** | Option C (Supabase + Chroma) |
|---|---|---|---|
| **DB monthly cost** | $25 (Supabase Pro) | ~$5–15 (CockroachDB PAYG) | $25 (Supabase Pro) |
| **Vector monthly cost** | Included | ~$0–10 (Chroma free tier) | ~$0–10 (Chroma) |
| **Migration cost** | 1–2 dev days | None | 1–2 dev days |
| **Phase 3 total (DB + vector)** | ~$25 | **~$5–25** | ~$25–35 |
| **Saving vs Option A** | — | **$0–20/mo** | −$0–10/mo (worse) |

---

## Annual Cost Projection

| Phase | Duration | Monthly (midpoint) | Phase Total |
|---|---|---|---|
| Phase 1 (MVP) | 3 months | $2 | ~$6 |
| Phase 2 (Growth) | 6 months | $53 | ~$318 |
| Phase 3 (Scale, first 9 months) | 9 months | $221 | ~$1,989 |
| **18-month total** | | | **~$2,313** |

> At Phase 3 midpoint pricing. Actual costs depend heavily on user growth rate and OpenAI import volume.

---

## Cost Thresholds & Action Triggers

| Threshold | Trigger | Action |
|---|---|---|
| CockroachDB > 5 GiB or > 50M RUs/mo | Phase 2 growth | Switch to pay-as-you-go (auto, no config change) |
| Resend > 3,000 emails/mo | ~1,000 active MAU | Upgrade to Resend Pro ($20/mo) |
| Clerk > 50,000 MAU | ~Phase 3 peak | Upgrade to Clerk Pro ($0.02/MAU) |
| ChromaDB > 1M embeddings/mo | >1M recipe updates/mo | Evaluate Chroma Cloud paid tier or self-host |
| OpenAI > $100/mo | ~5,000 imports/mo | Enable aggressive response caching; review prompt efficiency |
| Vercel bandwidth > 1TB | High traffic | Already on Pro; consider CDN caching strategy |
| Total infra > $300/mo | Phase 3 high end | Review monetisation; target $5–10/mo per 100 paying users |

---

## Monetisation Break-Even Reference

If StepDish introduces a paid tier at Phase 3:

| Price point | Users needed to break even (at $221/mo midpoint) |
|---|---|
| $1/mo | 221 paying users |
| $3/mo | 74 paying users |
| $5/mo | 45 paying users |
| $9/mo | 25 paying users |

> A 3–5% conversion rate from free to paid is typical for consumer apps. At 5,000 total users, a 3% conversion = 150 paying users — break-even at $1.50/mo price point.

---

*Hosting cost estimates updated May 2026. Prices based on published rates from Vercel, CockroachDB, ChromaDB, Clerk, Cloudflare, OpenAI, Typesense, Resend, and Sentry as of May 2026.*
