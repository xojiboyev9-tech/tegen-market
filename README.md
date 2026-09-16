# TEGEN Market

Telegram Mini App marketplace with Telegram bot, admin panel, NestJS backend and Prisma database.

## Structure

- `apps/admin` — admin panel
- `apps/bot` — Telegram bot
- `apps/mini-app` — Telegram Mini App
- `server` — NestJS API
- `server/prisma/schema.prisma` — Prisma database schema

## Main features

- Product catalog
- Categories
- Orders and order statuses
- Telegram Mini App
- Telegram bot
- Admin management
- Owner / Admin / Worker roles
- Banners
- TEGEN Nakopitel
- 2% cashback
- Cashback transactions
- Support messages
- Audit logs

## Requirements

- Node.js
- npm
- PostgreSQL
- Telegram Bot Token

## Environment variables

See the `.env.example` files inside:

- `server`
- `apps/bot`
- `apps/mini-app`

Do not commit real `.env` files or secrets to GitHub.

## Server

```bash
cd server
npm install
npx prisma generate --schema=./prisma/schema.prisma
npm run build
npm run start:prod
