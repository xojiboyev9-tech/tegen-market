# TEGEN deploy

## Server (Railway)
- Root directory: `server`
- Variables: `DATABASE_URL`, `BOT_TOKEN`, `BOT_SECRET`, `ADMIN_SECRET`
- `server/prisma/schema.prisma` is the Prisma schema. `railway.json` explicitly uses this path for Prisma generate/build and `prisma db push` before start.

## Bot (Railway)
- Root directory: `apps/bot`
- Variables: `BOT_TOKEN`, `BOT_SECRET`, `API_URL`, `MINI_APP_URL`

## Mini App (Railway/static hosting)
- Root directory: `apps/mini-app`
- Variable: `VITE_API_URL`
- Build: `npm run build`

> `ADMIN_SECRET` va `BOT_SECRET` ni kuchli, tasodifiy qiymatlarga almashtiring.
