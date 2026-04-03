# ReBook — Second-Hand Academic Book Marketplace

A full-stack TypeScript marketplace for buying and selling second-hand academic books, featuring AI-powered book scanning, admin moderation, real-time updates, integrated payments (Razorpay), and shipping (Shiprocket).

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend & API | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth — OAuth 2.0 (Google, Apple, Microsoft) |
| Storage | Supabase Storage |
| Real-time | Supabase Realtime |
| Search | Meilisearch 1.5 |
| AI / Vision | Google Gemini Vision API |
| Payment | Razorpay |
| Shipping | Shiprocket |
| Testing | Vitest, fast-check (property-based) |

## Features

- **AI Book Scanner** — photograph a book and auto-extract title, author, ISBN, publisher, edition, and condition score using Gemini Vision + Tesseract OCR
- **Smart Pricing** — real-time pricing with condition multipliers, live delivery cost from Shiprocket, platform commission, and payment fees
- **Admin Moderation** — all listings require admin approval before going live; admins can approve, reject, or request a rescan
- **Razorpay Checkout** — full payment flow with order creation, Razorpay modal, server-side signature verification, and webhook handling
- **Shiprocket Shipping** — automatic courier selection, label generation, live tracking, and webhook-driven status updates
- **Meilisearch** — typo-tolerant full-text search with filters (category, condition, price), facets, and proximity ranking
- **Supabase Realtime** — live notifications for listing approvals, order status changes, and scan progress
- **Environmental Impact** — tracks trees saved, water conserved, and CO₂ reduced per transaction
- **Seller Portal** — dashboard with listings, orders, earnings, and eco-impact stats
- **Reviews & Wishlist** — post-delivery reviews and per-user wishlists

## Project Structure

```
.
├── frontend/                   # Next.js full-stack app
│   ├── src/
│   │   ├── app/                # Next.js App Router pages + API routes
│   │   │   ├── api/            # All API routes
│   │   │   │   ├── ai/         # AI scanner, image upload, validation
│   │   │   │   ├── admin/      # Admin moderation, stats, analytics
│   │   │   │   ├── listings/   # Listing CRUD
│   │   │   │   ├── orders/     # Order processing
│   │   │   │   ├── payments/   # Razorpay integration
│   │   │   │   ├── search/     # Meilisearch search
│   │   │   │   └── shipping/   # Shiprocket integration
│   │   ├── components/         # React components
│   │   ├── lib/                # Utilities (auth, supabase, shiprocket, cache)
│   │   ├── services/           # Business logic services
│   │   └── types/              # TypeScript types
│   ├── .env.example
│   └── package.json
├── supabase/
│   └── migrations/             # SQL migrations
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Meilisearch](https://www.meilisearch.com) instance (local or cloud)
- A [Razorpay](https://razorpay.com) account (test keys work)
- A [Shiprocket](https://shiprocket.in) account
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini)

### Installation

```bash
cd frontend
npm install
```

### Environment Variables

Copy the example and fill in your values:

```bash
cp frontend/.env.example frontend/.env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `MEILISEARCH_HOST` | Meilisearch instance URL |
| `MEILISEARCH_API_KEY` | Meilisearch admin API key |
| `GEMINI_API_KEY` | Google Gemini Vision API key |
| `RAZORPAY_KEY_ID` | Razorpay key ID (`rzp_test_...`) |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook secret |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Same as `RAZORPAY_KEY_ID` (exposed to browser) |
| `SHIPROCKET_EMAIL` | Shiprocket API user email |
| `SHIPROCKET_PASSWORD` | Shiprocket API user password |
| `SHIPROCKET_API_URL` | `https://apiv2.shiprocket.in/v1/external` |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | Storage bucket name (default: `book-images`) |

### Database Setup

Apply migrations to your Supabase project:

```bash
npx supabase db push
```

Or apply them manually via the Supabase SQL editor in `supabase/migrations/`.

### Development

```bash
cd frontend
npm run dev
# App runs at http://localhost:3001
```

### Tests

```bash
cd frontend
npm test           # run all tests once
npm run test:watch # watch mode
```

## API Overview

See [docs/api.md](docs/api.md) for full endpoint documentation.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/callback` | OAuth callback |
| POST | `/api/listings` | Create listing |
| GET | `/api/search` | Search listings |
| POST | `/api/orders` | Place order |
| POST | `/api/payments/create-intent` | Create Razorpay order |
| POST | `/api/payments/verify` | Verify payment signature |
| POST | `/api/payments/webhook` | Razorpay webhook |
| POST | `/api/shipping/generate-label` | Generate shipping label |
| GET | `/api/shipping/track/:id` | Track shipment |
| POST | `/api/shipping/webhook` | Shiprocket webhook |
| POST | `/api/ai/scan` | AI book scan |
| GET | `/api/admin/listings` | Admin listing queue |

## License

MIT
