# 🔧 StepDish — Manual Setup Guide

> **For the project owner (you).** This guide walks through every account registration and API key you need to get StepDish running locally and in production.
>
> Estimated time: **60–90 minutes** for all services (most of it is waiting for confirmation emails).

---

## ✅ Setup Checklist

Tick each item off as you go. Come back to this list any time.

- [ ] 1. Node.js & pnpm installed locally
- [ ] 2. GitHub repo cloned
- [ ] 3. Vercel account + project created
- [ ] 4. CockroachDB account + cluster + connection string
- [ ] 5. Clerk account + application keys
- [ ] 6. OpenAI account + API key
- [ ] 7. Azure OpenAI resource (HK local dev only)
- [ ] 8. Cloudflare account + R2 bucket + API token
- [ ] 9. Resend account + API key + domain
- [ ] 10. ChromaDB Cloud account + API key *(Phase 3 only — skip for MVP)*
- [ ] 11. Sentry project + DSN *(Phase 3 only — skip for MVP)*
- [ ] 12. `.env.local` file created and filled in
- [ ] 13. Vercel environment variables set
- [ ] 14. First local `pnpm dev` runs without errors

---

## 0. Prerequisites

Before anything else, make sure your local machine is ready.

### Install Node.js
1. Go to [https://nodejs.org](https://nodejs.org) and download the **LTS** version.
2. Verify: `node -v` should print `v20.x.x` or higher.

### Install pnpm
```bash
npm install -g pnpm
pnpm -v   # should print 9.x.x or higher
```

### Clone the repo
```bash
git clone https://github.com/koktszho-zelca/StepDish.git
cd StepDish
pnpm install
```

### Create your `.env.local`
```bash
cp .env.example .env.local
```
You will fill this in as you complete each section below.

---

## 1. Vercel — Hosting

> **Purpose:** Deploys the Next.js app. Singapore `sin1` region gives low latency from HK.

### Sign up
1. Go to [https://vercel.com/signup](https://vercel.com/signup).
2. Click **Continue with GitHub** and authorise Vercel.

### Create a project
1. In the Vercel dashboard click **Add New → Project**.
2. Import the `koktszho-zelca/StepDish` repository.
3. Leave all build settings as default (Vercel auto-detects Next.js).
4. Click **Deploy** — the first deploy will fail (env vars not set yet). That's fine.

### Set the Singapore region
1. Go to your project → **Settings → Functions**.
2. Set **Function Region** to **Singapore (sin1)**.

### Get your deployment URL
- It will look like `https://step-dish.vercel.app` or your custom domain.
- Save it — you will use it as `NEXT_PUBLIC_APP_URL` in production.

> **No API key needed for Vercel.** Environment variables are set in the Vercel dashboard (see Section 13).

---

## 2. CockroachDB — Database

> **Purpose:** Primary relational database. Free tier: 5 GiB + 50M RUs/month.

### Sign up
1. Go to [https://cockroachlabs.cloud/signup](https://cockroachlabs.cloud/signup).
2. Sign up with GitHub or email. **No credit card required** for Serverless.

### Create a Serverless cluster
1. Click **Create Cluster**.
2. Choose **Serverless**.
3. Select **Google Cloud → Singapore (asia-southeast1)**.
4. Name it `stepdish-prod`.
5. Click **Create Cluster**.

### Create a database user
1. After the cluster is created, go to **SQL Users**.
2. Click **Add User**.
3. Username: `stepdish`.
4. Click **Generate & Save Password** — copy the password now, you won’t see it again.

### Get the connection string
1. Click **Connect** on your cluster.
2. Choose **Connection String** tab.
3. Select your `stepdish` SQL user.
4. Copy the connection string. It looks like:
   ```
   postgresql://stepdish:<password>@free-tier14.gcp-asia-southeast1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full
   ```
5. Change `defaultdb` to `stepdish` in the string:
   ```
   postgresql://stepdish:<password>@free-tier14.gcp-asia-southeast1.cockroachlabs.cloud:26257/stepdish?sslmode=verify-full
   ```

### Create the database
1. Click **Connect → SQL Shell** (web-based terminal).
2. Run:
   ```sql
   CREATE DATABASE stepdish;
   ```

### Update `.env.local`
```bash
DATABASE_URL="postgresql://stepdish:<password>@free-tier14.gcp-asia-southeast1.cockroachlabs.cloud:26257/stepdish?sslmode=verify-full"
```

---

## 3. Clerk — Authentication

> **Purpose:** User sign-up, sign-in, and session management. Free tier: 50,000 MAU.

### Sign up
1. Go to [https://clerk.com](https://clerk.com) and click **Sign Up**.
2. Create an account with GitHub or email.

### Create an application
1. Click **Create application**.
2. Name it `StepDish`.
3. Enable sign-in methods: **Email**, **Google** (optional but recommended).
4. Click **Create application**.

### Get your API keys
1. In the Clerk dashboard, go to **API Keys**.
2. Copy:
   - **Publishable key** — starts with `pk_test_...`
   - **Secret key** — starts with `sk_test_...`

### Update `.env.local`
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"
```

---

## 4. OpenAI — AI Extraction

> **Purpose:** GPT-4o powers recipe step extraction and normalization.
> ⚠️ **HK note:** OpenAI blocks direct API calls from HK IP addresses. This is only a local dev issue — production works fine via Vercel Singapore. For local dev, use a VPN or set up Azure OpenAI (Section 5).

### Sign up
1. Go to [https://platform.openai.com/signup](https://platform.openai.com/signup).
2. Create an account. You will need to use a **VPN** if signing up from HK.

### Add billing
1. Go to **Settings → Billing → Add payment method**.
2. Add a credit card. Recommend setting a **usage limit** of $20/month to avoid surprises.
3. Go to **Settings → Billing → Usage limits** and set a monthly cap.

### Create an API key
1. Go to **API Keys** in the left sidebar.
2. Click **Create new secret key**.
3. Name it `stepdish-prod`.
4. Copy the key — it starts with `sk-...` and you won’t see it again.

### Update `.env.local`
```bash
OPENAI_API_KEY="sk-..."
OPENAI_PROVIDER="openai"   # change to "azure" if testing locally from HK without VPN
```

---

## 5. Azure OpenAI — HK Local Dev Fallback

> **Purpose:** Lets you test AI extraction locally from HK without a VPN.
> **Skip this if** you have a VPN or won’t be testing AI features locally.

### Sign up for Azure
1. Go to [https://azure.microsoft.com/en-us/free](https://azure.microsoft.com/en-us/free).
2. Create a free account. You get $200 credit for 30 days.
3. Azure officially supports HK customers — no VPN needed.

### Request Azure OpenAI access
1. Go to [https://aka.ms/oai/access](https://aka.ms/oai/access) and fill in the access request form.
2. Approval usually takes **1–3 business days**.

### Create an Azure OpenAI resource
1. In the Azure portal, search for **Azure OpenAI**.
2. Click **Create**.
3. Settings:
   - **Subscription:** your subscription
   - **Resource group:** create new `stepdish-rg`
   - **Region:** `East Asia` (Hong Kong) or `Southeast Asia` (Singapore)
   - **Name:** `stepdish-openai`
   - **Pricing tier:** Standard S0
4. Click **Review + Create → Create**.

### Deploy GPT-4o
1. Once the resource is created, click **Go to resource**.
2. Click **Model deployments → Manage deployments**.
3. Click **Deploy model**.
4. Select `gpt-4o`, name the deployment `gpt-4o`, click **Deploy**.

### Get your endpoint and key
1. In your Azure OpenAI resource, go to **Keys and Endpoint**.
2. Copy **Key 1** and **Endpoint**.

### Update `.env.local`
```bash
# Switch to Azure for local dev:
OPENAI_PROVIDER="azure"

AZURE_OPENAI_ENDPOINT="https://stepdish-openai.openai.azure.com"
AZURE_OPENAI_KEY="..."
AZURE_OPENAI_DEPLOYMENT="gpt-4o"
```

> Remember to set `OPENAI_PROVIDER="openai"` (not `"azure"`) in your Vercel production env vars.

---

## 6. Cloudflare R2 — Image Storage

> **Purpose:** Stores recipe images. Free tier: 10 GB storage + 10M read operations/month. Zero egress fees.

### Sign up
1. Go to [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up).
2. Create a free account.

### Enable R2
1. In the Cloudflare dashboard, click **R2 Object Storage** in the left sidebar.
2. Click **Purchase R2 Plan** — the free tier is $0, just requires a credit card on file.

### Create a bucket
1. Click **Create bucket**.
2. Name: `stepdish-images`
3. Location: leave as **Automatic** (Cloudflare picks the nearest PoP to HK).
4. Click **Create bucket**.

### Enable public access (for serving images)
1. Inside your bucket, go to **Settings → Public Access**.
2. Click **Allow Access** and confirm.
3. Copy the **Public bucket URL** — it looks like `https://pub-xxxx.r2.dev`.

### Create an API token
1. Go back to the **R2** main page.
2. Click **Manage R2 API Tokens → Create API Token**.
3. Permissions: **Object Read & Write**.
4. Specify bucket: `stepdish-images`.
5. Click **Create API Token**.
6. Copy the **Access Key ID** and **Secret Access Key** — you won’t see them again.
7. Also note your **Account ID** (visible in the URL: `dash.cloudflare.com/<account-id>/`).

### Update `.env.local`
```bash
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key-id"
R2_SECRET_ACCESS_KEY="your-secret-access-key"
R2_BUCKET_NAME="stepdish-images"
R2_PUBLIC_URL="https://pub-xxxx.r2.dev"
```

---

## 7. Resend — Transactional Email

> **Purpose:** Sends welcome emails, password resets, and notification emails. Free tier: 3,000 emails/month.

### Sign up
1. Go to [https://resend.com/signup](https://resend.com/signup).
2. Create a free account.

### Add and verify your domain *(recommended)*
1. Go to **Domains → Add Domain**.
2. Enter your domain (e.g. `stepdish.app`).
3. Add the DNS records shown to your domain registrar.
4. Click **Verify** once DNS has propagated (can take up to 48 hours).

> If you don’t have a domain yet, Resend provides a shared `onboarding@resend.dev` address for testing. Use that for now and add your domain later.

### Create an API key
1. Go to **API Keys → Create API Key**.
2. Name: `stepdish-prod`.
3. Permission: **Sending access**.
4. Click **Add**.
5. Copy the key — starts with `re_...`.

### Update `.env.local`
```bash
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@yourdomain.com"   # or onboarding@resend.dev for testing
```

---

## 8. ChromaDB Cloud — Vector Search *(Phase 3 only)*

> **Purpose:** AI-powered recipe similarity search. Free tier: 1M embeddings/month.
> **Skip this for now.** You will not need it until you start T-039 in Phase 3.

### Sign up
1. Go to [https://trychroma.com](https://trychroma.com) and click **Get Started**.
2. Create a free account.

### Create a collection
1. In the Chroma dashboard, create a new collection named `stepdish-recipes`.
2. Copy the **Cluster Endpoint URL** and **API Key**.

### Update `.env.local`
```bash
CHROMA_HOST="https://your-cluster.chromadb.io"
CHROMA_API_KEY="chroma_..."
CHROMA_COLLECTION_NAME="stepdish-recipes"
```

---

## 9. Sentry — Error Monitoring *(Phase 3 only)*

> **Purpose:** Captures runtime errors and performance issues. Free tier: 5,000 errors/month.
> **Skip this for now.** Set it up when you go live with real users.

### Sign up
1. Go to [https://sentry.io/signup](https://sentry.io/signup).
2. Create a free account.

### Create a project
1. Click **Create Project**.
2. Platform: **Next.js**.
3. Name: `stepdish`.
4. Copy the **DSN** — it looks like `https://xxxx@oxxxx.ingest.sentry.io/xxxx`.

### Update `.env.local`
```bash
SENTRY_DSN="https://xxxx@oxxxx.ingest.sentry.io/xxxx"
```

---

## 10. Complete `.env.local` Template

Once all accounts are created, your `.env.local` should look like this:

```bash
# ── App ──────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# ── Database (CockroachDB Serverless) ────────────────────────
DATABASE_URL="postgresql://stepdish:<password>@free-tier14.gcp-asia-southeast1.cockroachlabs.cloud:26257/stepdish?sslmode=verify-full"

# ── Auth (Clerk) ─────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# ── AI — choose one provider for local dev ───────────────────
# Option A: VPN + OpenAI direct
OPENAI_API_KEY="sk-..."
OPENAI_PROVIDER="openai"

# Option B: Azure OpenAI (HK local dev, no VPN needed)
# OPENAI_PROVIDER="azure"
# AZURE_OPENAI_ENDPOINT="https://stepdish-openai.openai.azure.com"
# AZURE_OPENAI_KEY="..."
# AZURE_OPENAI_DEPLOYMENT="gpt-4o"

# ── Storage (Cloudflare R2) ───────────────────────────────────
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="stepdish-images"
R2_PUBLIC_URL="https://pub-xxxx.r2.dev"

# ── Email (Resend) ────────────────────────────────────────────
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# ── Vector Search (ChromaDB) — Phase 3 only ──────────────────
# CHROMA_HOST="https://your-cluster.chromadb.io"
# CHROMA_API_KEY="chroma_..."
# CHROMA_COLLECTION_NAME="stepdish-recipes"

# ── Monitoring (Sentry) — Phase 3 only ───────────────────────
# SENTRY_DSN="https://xxxx@oxxxx.ingest.sentry.io/xxxx"
```

---

## 11. Set Vercel Environment Variables

Once your `.env.local` is working locally, copy the same values to Vercel for production.

> ⚠️ **Important differences for production:**
> - `NEXT_PUBLIC_APP_URL` → use your Vercel URL, e.g. `https://step-dish.vercel.app`
> - `NODE_ENV` → `production`
> - `OPENAI_PROVIDER` → `openai` (not `azure` — production runs on Vercel Singapore, no HK block)
> - Do NOT set `AZURE_OPENAI_*` keys in Vercel unless you want Azure in production too.

### Steps
1. Go to your project in [https://vercel.com/dashboard](https://vercel.com/dashboard).
2. Click **Settings → Environment Variables**.
3. Add each variable one by one. Set **Environment** to **Production**, **Preview**, and **Development** for most keys.
4. Click **Save**.
5. Go to **Deployments** and click **Redeploy** to pick up the new env vars.

---

## 12. Run Prisma Migrations

Once `DATABASE_URL` is in `.env.local`, run:

```bash
# Generate the Prisma client
pnpm prisma generate

# Push the schema to CockroachDB (first time setup)
pnpm prisma db push

# Or use migrations (recommended for team/production)
pnpm prisma migrate dev --name init
```

Verify by opening the CockroachDB SQL shell and running:
```sql
USE stepdish;
SHOW TABLES;
```
You should see all the StepDish tables.

---

## 13. Verify Local Setup

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the StepDish home page with no console errors.

Quick smoke tests:
- [ ] Home page loads
- [ ] `/sign-in` page loads (Clerk)
- [ ] You can sign up for an account
- [ ] No `DATABASE_URL` errors in terminal
- [ ] No `CLERK_SECRET_KEY` errors in terminal

---

## 🚨 Troubleshooting

| Problem | Fix |
|---|---|
| `Error: DATABASE_URL is not set` | Check `.env.local` has the full CockroachDB connection string |
| `Prisma: Can’t reach database server` | Check the CockroachDB cluster is running and the password is correct |
| `ClerkError: Missing publishable key` | Check `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set (must start with `NEXT_PUBLIC_`) |
| `OpenAI 403 Forbidden` (local dev) | You are on a HK IP. Use a VPN or switch to Azure (`OPENAI_PROVIDER="azure"`) |
| `R2: Access Denied` | Check `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` are correct; confirm the token has write access to the bucket |
| `Resend: domain not verified` | Use `onboarding@resend.dev` temporarily while waiting for DNS propagation |
| Vercel deploy fails | Check all required env vars are set in Vercel dashboard; redeploy after saving |

---

## 🔗 Quick Links

| Service | Dashboard | Docs |
|---|---|---|
| Vercel | [vercel.com/dashboard](https://vercel.com/dashboard) | [vercel.com/docs](https://vercel.com/docs) |
| CockroachDB | [cockroachlabs.cloud](https://cockroachlabs.cloud) | [cockroachlabs.com/docs](https://www.cockroachlabs.com/docs/) |
| Clerk | [dashboard.clerk.com](https://dashboard.clerk.com) | [clerk.com/docs](https://clerk.com/docs) |
| OpenAI | [platform.openai.com](https://platform.openai.com) | [platform.openai.com/docs](https://platform.openai.com/docs) |
| Azure OpenAI | [portal.azure.com](https://portal.azure.com) | [learn.microsoft.com/azure/ai-services/openai](https://learn.microsoft.com/en-us/azure/ai-services/openai/) |
| Cloudflare R2 | [dash.cloudflare.com](https://dash.cloudflare.com) | [developers.cloudflare.com/r2](https://developers.cloudflare.com/r2/) |
| Resend | [resend.com/overview](https://resend.com/overview) | [resend.com/docs](https://resend.com/docs) |
| ChromaDB | [trychroma.com](https://trychroma.com) | [docs.trychroma.com](https://docs.trychroma.com) |
| Sentry | [sentry.io](https://sentry.io) | [docs.sentry.io](https://docs.sentry.io) |

---

*Setup guide v1.0 — May 2026. For infrastructure decisions and cost estimates see [`docs/infra/INFRA.md`](../infra/INFRA.md).*
