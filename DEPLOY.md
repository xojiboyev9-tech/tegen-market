# Google Cloud'ga joylash (Cloud Run + Cloud SQL)

> Bu qo'llanma ko'rsatma sifatida yozilgan; buyruqlarni o'z loyihangizga moslang (PROJECT, REGION, nomlar).

## 1. Tayyorgarlik
```bash
gcloud config set project PROJECT
gcloud services enable run.googleapis.com sqladmin.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
```

## 2. Baza (Cloud SQL, Postgres 16)
```bash
gcloud sql instances create tegen-db --database-version=POSTGRES_16 --region=REGION --tier=db-f1-micro
gcloud sql databases create tegen --instance=tegen-db
gcloud sql users create tegen --instance=tegen-db --password=STRONG_PASSWORD
```

## 3. Sirlar (Secret Manager)
`BOT_TOKEN`, `BOT_SECRET`, `JWT_SECRET`, `DATABASE_URL` ni Secret Manager'ga qo'ying.
`BOT_SECRET` va `JWT_SECRET` uchun: `openssl rand -hex 32`.

## 4. Server (migratsiya konteyner ishga tushganda avtomatik: `prisma migrate deploy`)
```bash
gcloud run deploy tegen-server --source server --region REGION \
  --add-cloudsql-instances PROJECT:REGION:tegen-db \
  --set-env-vars NODE_ENV=production,CORS_ORIGINS=https://APP,https://ADMIN,PUBLIC_BASE_URL=https://SERVER,GCS_BUCKET=BUCKET \
  --set-secrets BOT_TOKEN=BOT_TOKEN:latest,BOT_SECRET=BOT_SECRET:latest,JWT_SECRET=JWT_SECRET:latest,DATABASE_URL=DATABASE_URL:latest,SUPER_ADMIN_TELEGRAM_IDS=SUPER_ADMIN_TELEGRAM_IDS:latest
```
Tekshirish: `https://SERVER/api/health` va `https://SERVER/api/health/ready` (bazani ham tekshiradi).

## 5. Bot (har doim ishlashi kerak: min-instances=1)
```bash
gcloud run deploy tegen-bot --source apps/bot --region REGION --min-instances 1 --no-cpu-throttling \
  --set-env-vars NODE_ENV=production,SERVER_URL=https://SERVER,MINI_APP_URL=https://APP,ADMIN_APP_URL=https://ADMIN \
  --set-secrets BOT_TOKEN=BOT_TOKEN:latest,BOT_SECRET=BOT_SECRET:latest
```

## 6. Mini App va Admin (statik, nginx)
```bash
docker build -f apps/mini-app/Dockerfile --build-arg VITE_API_URL=https://SERVER/api -t REGION-docker.pkg.dev/PROJECT/REPO/mini-app .
docker build -f apps/admin/Dockerfile    --build-arg VITE_API_URL=https://SERVER/api -t REGION-docker.pkg.dev/PROJECT/REPO/admin .
```
Yoki `npm run build:app` / `build:admin` dan chiqqan `dist/` ni Firebase Hosting'ga yuklang.

## 7. BotFather
Menu button URL = `MINI_APP_URL`. Birinchi Super Admin: `SUPER_ADMIN_TELEGRAM_IDS`.

## Eslatma
Rasmlar uchun `GCS_BUCKET` bering (Cloud Run diski vaqtinchalik). Bucket'ni ommaviy o'qishga sozlang.
