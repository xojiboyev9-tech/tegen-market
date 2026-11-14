# Tegen Market — Telegram Mini App + Admin Panel

**Versiya:** 1.1 (yaxshilangan)

Telegram bot, Mini App (mijozlar uchun), Admin panel va NestJS server.  
Dizayn asosan **qizil** (TEGEN logotipi rangi `#fb0200`).

```
tegen-market/
├── server/            NestJS + Prisma + PostgreSQL (API)
│   ├── prisma/        schema + tayyor migratsiya + seed
│   └── src/           auth, catalog, orders, engagement, admin, bot, integration
├── apps/bot/          grammY bot
├── apps/mini-app/     React + Vite (Telegram Web App)
└── apps/admin/        React + Vite + Ant Design
```

## Nima o‘zgardi (1.1)

- Admin va Mini App portlari to‘g‘rilandi (5173 / 5174)
- Prisma migratsiyasi tayyor (production uchun)
- dotenv to‘g‘ri sozlandi (lokal ishlatish oson)
- Bot va Integration endpointlarida rate-limit o‘chirildi (`@SkipThrottle`)
- Seed ma’lumotlari kengaytirildi (ko‘proq real mahsulotlar + 3 ta banner)
- Vite `envDir` qo‘shildi
- Kichik type tuzatishlar va barqarorlik yaxshilandi

## Lokal ishga tushirish

```bash
cp .env.example .env
# BOT_TOKEN, BOT_SECRET, JWT_SECRET, SUPER_ADMIN_TELEGRAM_IDS ni to‘ldiring

docker compose up -d db
npm install

npm run db:migrate          # tayyor migratsiya qo‘llanadi
npm run db:seed             # demo kategoriya + mahsulotlar + bannerlar

npm run dev:server          # http://localhost:3000/api/health
npm run dev:app             # http://localhost:5173  (brauzerda "dev:<telegramId>")
npm run dev:admin           # http://localhost:5174
npm run dev:bot
```

**Birinchi Super Admin:** `.env` dagi `SUPER_ADMIN_TELEGRAM_IDS` ga o‘z Telegram ID ingizni yozing.

Mini App haqiqiy Telegram ichida ishlashi uchun HTTPS kerak (`ngrok http 5173` yoki `cloudflared`).  
Keyin `MINI_APP_URL` ga yozing va BotFather’da menyu tugmasini bog‘lang.

Admin panelga bot orqali `/admin` buyrug‘i bilan kirasiz (30 daqiqalik token).

## Asosiy qoidalar

- **Narx faqat serverda hisoblanadi.** Mijoz faqat `productId` + miqdor yuboradi.
- **Dona va og‘irlik.** WEIGHT mahsulotda miqdor grammda: `0.5 kg × 45 000 = 22 500`.  
  Yig‘ishda `0.512 kg` chiqsa `23 040` bo‘ladi.
- **Buyurtma holati**
  - Olib ketish: `NEW → ACCEPTED → PREPARING → READY → COMPLETED`
  - Yetkazish: `NEW → ACCEPTED → PREPARING → DELIVERING → COMPLETED`
- READY bo‘lganda mijozga **ID** (masalan SM-1021) va **4 xonali kod** yuboriladi.
- Xodim (kategoriya admini) faqat o‘z bo‘limlariga mahsulot qo‘sha oladi. Yangi mahsulot `PENDING` holatda keladi.

## Integratsiya (Offline dastur)

`POST /api/integration/products` orqali mahsulotlar keladi (`INTEGRATION_KEY` bilan).  
Yangi mahsulotlar `HIDDEN` holatda saqlanadi — rasm va tavsif qo‘shilgach admin yoqadi.

## Xavfsizlik

- Telegram `initData` HMAC tekshiruvi
- Qisqa muddatli JWT (rol har so‘rovda bazadan olinadi)
- Rol va bo‘lim bo‘yicha ruxsat
- Zod validatsiya, Helmet, CORS, Rate limit
- Bot va Integration sirlarini `timingSafeEqual` bilan solishtirish
- Rasm yuklashda magic-bytes + 5 MB limit
- Audit jurnali
- Productionda `dev:` kirish o‘chiq

## Hali yo‘q / keyingi bosqichlar

- To‘lov integratsiyasi (Click / Payme / Uzum) — hozir faqat buyurtma yig‘ish
- Redis (kesh)
- Ko‘proq avtomatik testlar
- Mini App ichida rasm/ovoz yuborish (hozir bot orqali)
- Push / Socket.io real-time yangilanishlar

## Google Cloud’ga joylash (qisqa)

`server/prisma/migrations/` tayyor. Cloud Run’da `prisma migrate deploy` jadvallarni yaratadi.

```bash
# Cloud SQL + GCS + Cloud Run (server, bot)
# Mini App va Admin → Firebase Hosting yoki boshqa static hosting
```

---

**Muallif eslatmasi:** Bu versiya supermarket (TEGEN) uchun optimallashtirilgan.  
To‘liq multi-vendor marketplace (sotuvchilar, sharhlar, to‘lovlar) alohida katta loyiha bo‘ladi.

Savollar bo‘lsa — yozing.
