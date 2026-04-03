# Deployment Guide

## Overview

ReBook is a Next.js app deployed to Vercel, backed by Supabase (database, auth, storage, realtime) and Meilisearch Cloud.

---

## 1. Supabase Setup

1. Create a project at [app.supabase.com](https://app.supabase.com)
2. Go to **Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
3. Apply migrations:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
4. Enable **Row Level Security** — migrations handle this automatically.
5. Create the storage bucket:
   - Go to **Storage → New bucket**
   - Name: `book-images`, set to **Public**

### OAuth Providers (Supabase Auth)

Go to **Authentication → Providers** and enable:

- **Google** — create OAuth credentials at [console.cloud.google.com](https://console.cloud.google.com), add redirect URL: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
- **Apple** — requires Apple Developer account
- **Microsoft** — create app at [portal.azure.com](https://portal.azure.com)

---

## 2. Meilisearch Setup

**Option A — Meilisearch Cloud (recommended)**
1. Sign up at [cloud.meilisearch.com](https://cloud.meilisearch.com)
2. Create a project, copy the host URL and admin API key

**Option B — Self-hosted**
```bash
docker run -d -p 7700:7700 getmeili/meilisearch:latest
```

Set `MEILISEARCH_HOST` and `MEILISEARCH_API_KEY` accordingly.

---

## 3. Razorpay Setup

1. Sign up at [razorpay.com](https://razorpay.com)
2. Go to **Settings → API Keys** → generate keys
3. For webhooks: **Settings → Webhooks → Add webhook**
   - URL: `https://your-domain.com/api/payments/webhook`
   - Events: `payment.captured`, `payment.failed`, `refund.processed`
   - Copy the webhook secret → `RAZORPAY_WEBHOOK_SECRET`

---

## 4. Shiprocket Setup

1. Sign up at [app.shiprocket.in](https://app.shiprocket.in)
2. Go to **Settings → API User → Create API User**
3. Use the email/password as `SHIPROCKET_EMAIL` / `SHIPROCKET_PASSWORD`
4. For webhooks: **Settings → Webhooks**
   - URL: `https://your-domain.com/api/shipping/webhook`

---

## 5. Google Gemini API

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Create an API key → `GEMINI_API_KEY`

---

## 6. Deploy to Vercel

```bash
npm install -g vercel
cd frontend
vercel
```

Or connect your GitHub repo at [vercel.com](https://vercel.com) for automatic deployments.

### Environment Variables on Vercel

Go to your Vercel project → **Settings → Environment Variables** and add all variables from `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
MEILISEARCH_HOST
MEILISEARCH_API_KEY
GEMINI_API_KEY
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
NEXT_PUBLIC_RAZORPAY_KEY_ID
SHIPROCKET_EMAIL
SHIPROCKET_PASSWORD
SHIPROCKET_API_URL
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET
NEXT_PUBLIC_APP_URL
```

Set `NEXT_PUBLIC_APP_URL` to your production domain (e.g. `https://rebook.vercel.app`).

---

## 7. Post-Deployment Checklist

- [ ] Supabase migrations applied
- [ ] Storage bucket `book-images` created and public
- [ ] OAuth redirect URLs updated to production domain in Supabase dashboard
- [ ] Razorpay webhook URL updated to production domain
- [ ] Shiprocket webhook URL updated to production domain
- [ ] `RAZORPAY_WEBHOOK_SECRET` set in Vercel env vars
- [ ] Test a full order flow end-to-end
- [ ] Verify Meilisearch index is populated (approve a listing)

---

## Troubleshooting

**Supabase auth redirect loop**
- Ensure `NEXT_PUBLIC_APP_URL` matches the domain configured in Supabase Auth → URL Configuration → Site URL

**Razorpay webhook 400 "Invalid signature"**
- Verify `RAZORPAY_WEBHOOK_SECRET` matches exactly what's in the Razorpay dashboard

**Shiprocket 401 errors**
- The JWT token expires every 10 days — the service auto-refreshes, but verify `SHIPROCKET_EMAIL` and `SHIPROCKET_PASSWORD` are correct

**Meilisearch search returns no results**
- Approve at least one listing via the admin dashboard to trigger indexing
- Check `MEILISEARCH_HOST` and `MEILISEARCH_API_KEY` are correct

**Images not loading**
- Verify the `book-images` bucket is set to public in Supabase Storage
- Check `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` matches the bucket name
