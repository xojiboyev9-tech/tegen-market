FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npx nest build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./
EXPOSE 8080
# Cloud Run PORT ni beradi; migratsiya avval ishga tushadi
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
