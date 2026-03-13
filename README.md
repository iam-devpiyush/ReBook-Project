# Second-Hand Academic Book Marketplace

A full-stack TypeScript application for buying and selling academic books with AI-powered scanning, admin moderation, and integrated payment/shipping.

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Search**: Meilisearch
- **Cache**: Redis
- **Authentication**: OAuth 2.0 (Google, Apple, Microsoft)
- **Real-time**: Socket.io with Redis Pub/Sub
- **Payment**: Stripe/Razorpay
- **Shipping**: Delhivery/Shiprocket

## Project Structure

```
.
├── backend/          # Express.js API server
│   ├── src/
│   ├── prisma/
│   └── package.json
├── frontend/         # Next.js application
│   ├── src/
│   └── package.json
└── package.json      # Root workspace config
```

## Getting Started

### Prerequisites

- Node.js 20.x
- PostgreSQL 15.x
- Redis 7.x
- Meilisearch 1.5.x

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Configure your database and services in the `.env` files

4. Run Prisma migrations:
```bash
npm run prisma:migrate --workspace=backend
```

### Development

Run both frontend and backend:
```bash
npm run dev
```

Or run individually:
```bash
npm run dev:backend
npm run dev:frontend
```

- Backend: http://localhost:3000
- Frontend: http://localhost:3001

### Build

```bash
npm run build
```

## Features

- OAuth authentication (Google, Apple, Microsoft)
- AI-powered book scanning with ISBN detection
- Admin moderation system
- Real-time updates via WebSocket
- Meilisearch-powered search
- Integrated payment processing
- Shipping API integration
- Environmental impact tracking

## License

MIT
