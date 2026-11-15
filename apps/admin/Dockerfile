# Build kontekst: repo ildizi  (docker build -f apps/admin/Dockerfile --build-arg VITE_API_URL=https://API/api .)
FROM node:22-slim AS build
WORKDIR /app
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY package.json ./
COPY apps/admin/package.json apps/admin/package.json
COPY server/package.json server/package.json
COPY apps/bot/package.json apps/bot/package.json
RUN npm install --workspace apps/admin --include-workspace-root=false
COPY apps/admin apps/admin
RUN npm run build -w apps/admin

FROM nginx:1.27-alpine
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
EXPOSE 8080
