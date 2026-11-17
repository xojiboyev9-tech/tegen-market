# Build kontekst: repo ildizi  (docker build -f apps/mini-app/Dockerfile --build-arg VITE_API_URL=https://API/api .)
FROM node:22-slim AS build
WORKDIR /app
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY package.json ./
COPY apps/mini-app/package.json apps/mini-app/package.json
COPY server/package.json server/package.json
COPY apps/bot/package.json apps/bot/package.json
RUN npm install --workspace apps/mini-app --include-workspace-root=false
COPY apps/mini-app apps/mini-app
RUN npm run build -w apps/mini-app

FROM nginx:1.27-alpine
COPY apps/mini-app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/mini-app/dist /usr/share/nginx/html
EXPOSE 8080
