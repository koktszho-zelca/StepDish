# StepDish — Pricing Models

> **Version 1.0 | May 2026**
> Four pricing models are evaluated below, each with tier structure, projected revenue, pros/cons, and a final recommendation. All cost figures reference [`docs/infra/HOSTING_COST.md`](../infra/HOSTING_COST.md).

---

## Table of Contents

1. [Principles & Constraints](#1-principles--constraints)
2. [Model A — Freemium (Feature-Gated)](#2-model-a--freemium-feature-gated)
3. [Model B — Usage-Based (Pay-as-you-cook)](#3-model-b--usage-based-pay-as-you-cook)
4. [Model C — Subscription Tiers (Free / Home / Pro)](#4-model-c--subscription-tiers-free--home--pro)
5. [Model D — Lifetime Deal + Subscription](#5-model-d--lifetime-deal--subscription)
6. [Model Comparison](#6-model-comparison)
7. [Recommendation](#7-recommendation)
8. [Pricing by Phase](#8-pricing-by-phase)

---

## 1. Principles & Constraints

Before selecting a model, three constraints shape what works for StepDish:

- **Infrastructure cost floor:** ~$2/mo at MVP, ~$221/mo at Phase 3 midpoint. Any pricing model must cover this before profit.
- **Consumer app conversion reality:** Typical free-to-paid conversion for consumer apps is 3–5%. At 5,000 total users, that's 150–250 paying users maximum at Phase 2.
- **Value drivers:** The features users will pay for are AI import (saves time), unlimited recipe storage, cook mode with timers, and recipe similarity search. These map cleanly onto tiers.
- **Side project positioning:** StepDish is a side project. The pricing must be simple to implement and explain. Complex metered billing (like Stripe usage-based) adds significant engineering overhead.

---

## 2. Model A — Freemium (Feature-Gated)

### Overview

A generous free tier with hard feature walls that push power users to upgrade. The free tier is useful enough to attract users; the paid tier unlocks the most time-saving features.

### Tier Structure

| | **Free** | **Home** ($4.99/mo) | **Pro** ($9.99/mo) |
|---|---|---|---|
| Recipes | Up to 20 | Unlimited | Unlimited |
| AI imports from URL | 5/mo | 30/mo | Unlimited |
| Steps per recipe | Up to 10 | Unlimited | Unlimited |
| Cook mode (timers + reminders) | ✅ Basic | ✅ Full | ✅ Full |
| Revision history | Last 3 versions | Last 30 versions | Full history |
| Recipe similarity search | ❌ | ✅ | ✅ |
| Public profile page | ❌ | ✅ | ✅ |
| Recipe export (PDF/JSON) | ❌ | ✅ | ✅ |
| Priority AI processing | ❌ | ❌ | ✅ |
| API access | ❌ | ❌ | ✅ |
| **Price** | **$0** | **$4.99/mo** | **$9.99/mo** |

### Revenue Projection

| Phase | Total Users | Conversion | Paying Mix | MRR |
|---|---|---|---|---|
| Phase 1 | 500 | 0% | 0 | $0 |
| Phase 2 | 5,000 | 3% | 100 Home / 50 Pro | ~$1,000 |
| Phase 3 | 50,000 | 4% | 1,200 Home / 800 Pro | ~$13,988 |

### Pros
- Simple to understand and communicate
- Feature walls create natural upgrade moments (e.g. "You've used 5/5 AI imports this month")
- Low friction — users can try before committing
- Recipe limit (20) is a strong, concrete nudge to upgrade

### Cons
- Free users cost real money at scale (AI import calls, storage)
- Recipe limit (20) may frustrate legitimate free users who just cook a lot
- Harder to predict MRR than pure subscription

---

## 3. Model B — Usage-Based (Pay-as-you-cook)

### Overview

Free to start, pay only for AI-powered features consumed. Core recipe management is always free. This is a "usage-first" model — no hard feature walls, just pay for what you use.

### Tier Structure

| Feature | Free allowance | Pay-as-you-go rate |
|---|---|---|
| Recipe storage | Unlimited | Free |
| Manual recipe creation | Unlimited | Free |
| Cook mode (timers + reminders) | Unlimited | Free |
| **AI recipe import** | 3/mo free | **$0.15/import** after free allowance |
| **AI step normalization** | 3/mo free | **$0.10/recipe** |
| **Recipe similarity search** | 5 searches/mo | **$0.05/search** after free allowance |
| Revision history | Last 5 versions | Free |
| Recipe export | Unlimited | Free |

**Starter credit:** New users receive $2.00 credit on signup (covers ~13 AI imports).

### Revenue Projection

Assumes average power user spends ~$3–8/mo on AI features:

| Phase | Total Users | Active AI users (10%) | Avg spend | MRR |
|---|---|---|---|---|
| Phase 1 | 500 | 50 | $2 | ~$100 |
| Phase 2 | 5,000 | 500 | $3 | ~$1,500 |
| Phase 3 | 50,000 | 5,000 | $5 | ~$25,000 |

### Pros
- Zero barrier to entry — no credit card, no limit on core features
- Revenue scales directly with value delivered (AI usage)
- Power users who import many recipes self-select into high-revenue segment
- Lower churn risk — no "subscription guilt" for inactive months

### Cons
- **Highest engineering complexity** — requires Stripe metered billing, credit balance tracking, usage webhooks
- Unpredictable MRR — hard to forecast
- Users may feel anxious about unexpected charges; need clear billing UI
- Not suitable for Phase 1 — too much infrastructure to build before validating the product

---

## 4. Model C — Subscription Tiers (Free / Home / Pro)

### Overview

The most common SaaS model. Three clean tiers. No usage meters. Users pay a flat monthly fee for a bundle of features. Simplest to implement and explain.

### Tier Structure

| | **Free** | **Home** ($3.99/mo · $39/yr) | **Chef** ($8.99/mo · $89/yr) |
|---|---|---|---|
| Recipes | Up to 15 | Unlimited | Unlimited |
| AI imports from URL | 3/mo | 20/mo | Unlimited |
| Steps per recipe | Up to 8 | Unlimited | Unlimited |
| Cook mode | ✅ | ✅ | ✅ |
| Timers & reminders | ✅ Basic (1 at a time) | ✅ Parallel timers | ✅ Parallel timers |
| Revision history | Last 3 | Last 20 | Full + named snapshots |
| Recipe similarity search | ❌ | ✅ | ✅ |
| Public profile + shareable link | ❌ | ✅ | ✅ |
| Recipe export (PDF/JSON) | ❌ | ✅ | ✅ |
| Custom collections & tags | ❌ | ✅ | ✅ |
| Priority support | ❌ | ❌ | ✅ |
| Early access to new features | ❌ | ❌ | ✅ |
| Annual discount | — | Save 18% | Save 17% |
| **Price** | **$0** | **$3.99/mo** | **$8.99/mo** |

### Revenue Projection

| Phase | Total Users | Conversion | Paying Mix | MRR |
|---|---|---|---|---|
| Phase 1 | 500 | 0% | 0 | $0 |
| Phase 2 | 5,000 | 3% | 100 Home / 50 Chef | ~$849 |
| Phase 3 | 50,000 | 5% | 1,500 Home / 1,000 Chef | ~$14,975 |

Annual plan adoption (target 30% of paid users):
- Phase 3 with 30% annual = lower MRR but better cash flow and lower churn

### Pros
- **Simplest implementation** — Stripe Checkout with two products and a free tier
- Predictable, forecastable MRR
- Annual plan creates upfront cash flow for infrastructure investment
- Easy to A/B test price points (just update Stripe product price)

### Cons
- Binary upgrade decision — users either upgrade or don't
- "20 AI imports/mo" limit may feel arbitrary vs usage-based
- Less revenue upside from heavy power users compared to Model B

---

## 5. Model D — Lifetime Deal + Subscription

### Overview

Launch with a one-time Lifetime Deal (LTD) to generate upfront cash and early adopters, then transition to a recurring subscription model. Common for indie/side projects launched on platforms like AppSumo or Gumroad.

### Tier Structure

**Phase 1–2 Launch Period (LTD available):**

| | **Free** | **Lifetime Home** (one-time $49) | **Lifetime Chef** (one-time $99) |
|---|---|---|---|
| All Home / Chef features | As per Model C | ✅ Home features | ✅ Chef features |
| Future feature updates | Free tier only | ✅ Included | ✅ Included |
| Price | $0 | **$49 once** | **$99 once** |
| LTD availability | — | Limited (first 200 buyers) | Limited (first 100 buyers) |

**Phase 3 onwards (subscription only, LTD closed):**

Same as Model C subscription tiers ($3.99/mo Home · $8.99/mo Chef).

### Revenue Projection

| Period | Event | Revenue |
|---|---|---|
| LTD launch (Month 2–4) | 200 Home LTD + 100 Chef LTD | ~$19,700 one-time |
| Phase 2 monthly (after LTD) | New subscribers at Model C rates | ~$849/mo |
| Phase 3 monthly | Full subscription + LTD cohort retained | ~$14,975/mo |

**LTD cash flow advantage:** $19,700 upfront covers ~89 months of Phase 1 infrastructure cost or ~4 months of Phase 3 infrastructure cost.

### Pros
- Generates significant upfront cash before recurring revenue is established
- Creates a loyal early-adopter community with skin in the game
- Early adopters provide feedback and word-of-mouth
- Well-suited to side project launch on ProductHunt, AppSumo, or IndieHackers

### Cons
- LTD buyers permanently reduce MRR ceiling (they never convert to subscription)
- Risk of over-selling: if product pivots or shuts down, LTD holders feel cheated
- Requires careful LTD cap management — too many LTD users creates a free-rider problem at scale
- AppSumo takes ~30% commission if sold through their platform

---

## 6. Model Comparison

| | **Model A** (Freemium gated) | **Model B** (Usage-based) | **Model C** (Subscription) ✅ | **Model D** (LTD + Subscription) |
|---|---|---|---|---|
| **Implementation complexity** | Low–Medium | High | Low | Medium |
| **Phase 2 MRR** | ~$1,000 | ~$1,500 | ~$849 | ~$849 + $19.7k upfront |
| **Phase 3 MRR** | ~$13,988 | ~$25,000 | ~$14,975 | ~$14,975 |
| **Predictability** | Medium | Low | High | Medium |
| **User friction** | Medium (feature walls) | Low | Medium | Low (early adopters) |
| **Churn risk** | Medium | Low | Medium | Low (LTD cohort) |
| **Engineering overhead** | Low | High | Low | Low–Medium |
| **Best for** | Side project with clear power features | API-first or high-volume AI tools | Side project wanting clean SaaS | Indie launch / early traction |
| **Break-even (Phase 3 infra ~$221/mo)** | 45 paying users ($4.99) | 45 active AI users ($5/mo avg) | 56 paying users ($3.99) | Covered by LTD upfront |

### Revenue Ceiling Comparison (Phase 3, 50k users)

```
Model B (Usage-based)        ~$25,000/mo   ████████████████████████████████
Model C (Subscription)       ~$14,975/mo   ████████████████████
Model A (Freemium gated)     ~$13,988/mo   ███████████████████
Model D (LTD + Sub)          ~$14,975/mo   ████████████████████  + $19.7k upfront
```

---

## 7. Recommendation

### ✅ Model C — Subscription Tiers, with Model D LTD at launch

**Recommended strategy: Launch with Model D (LTD) to generate early cash and traction, then close the LTD and settle into Model C (Subscription) from Phase 2 onwards.**

**Rationale:**

1. **Lowest engineering overhead.** Model C is two Stripe products and a free tier — implementable in a day. Model B requires metered billing infrastructure that is a distraction at Phase 1 when you should be building product.

2. **LTD at launch (Model D element) solves the cold-start problem.** $49–99 one-time is a compelling offer for early adopters. Even 50 LTD buyers = ~$3,700 upfront, covering ~1.5 years of Phase 1 infrastructure.

3. **Predictable MRR from Phase 2 onwards.** Subscription MRR is forecastable and bankable. It lets you confidently commit to infrastructure upgrades.

4. **Feature gate choices are natural.** The limits (15 free recipes, 3 AI imports/mo) map directly to natural upgrade moments — users hit the wall when they're already engaged and invested.

5. **Annual plan reduces churn.** Offering 17–18% annual discount moves churnable monthly users to a committed yearly cohort.

**Recommended price points (final):**

| Tier | Monthly | Annual | Target user |
|---|---|---|---|
| **Free** | $0 | $0 | Casual cooks; evaluation |
| **Home** | $3.99/mo | $39/yr | Regular home cooks; 1–2 recipe imports/week |
| **Chef** | $8.99/mo | $89/yr | Power users; frequent AI imports; similarity search |
| **LTD Home** *(launch only)* | — | $49 once | Early adopters; ProductHunt / IndieHackers audience |
| **LTD Chef** *(launch only)* | — | $99 once | Power early adopters; cap at 200 buyers total |

**What to build first (Phase 1):**
- No paywall yet — validate the product with 100% free users
- Add Stripe integration at Phase 2 when you have evidence of willingness to pay
- Run LTD at the Phase 2 launch announcement

---

## 8. Pricing by Phase

| Phase | Pricing action | Goal |
|---|---|---|
| **Phase 1 (0–3 months)** | 100% free — no paywall | Validate core recipe workflow; gather user feedback |
| **Phase 2 launch (Month 3)** | Launch LTD ($49/$99) for 30 days; then open subscription tiers | Generate upfront cash; convert early adopters |
| **Phase 2 ongoing (Month 4–9)** | Model C subscription live ($3.99/$8.99) | Build recurring MRR |
| **Phase 3 (Month 9+)** | Close LTD; maintain subscription; introduce annual plans | Scale MRR; reduce churn with annual cohort |
| **Phase 3 growth** | Consider adding a **Teams** tier ($19.99/mo, up to 5 users) | Capture household / small cooking school use case |

### Future Tier Consideration — Teams

| | **Teams** ($19.99/mo) |
|---|---|
| Users | Up to 5 shared accounts |
| Shared recipe library | ✅ |
| All Chef features | ✅ |
| Shared cook mode sessions | ✅ (Phase 4 feature) |
| Target | Couples, families, small cooking classes |

---

*Pricing models drafted May 2026. Review price points at Phase 2 launch based on willingness-to-pay interviews with early users.*
