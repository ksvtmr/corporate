# syntax=docker/dockerfile:1

# ---------- Build stage ----------
FROM node:20.18-alpine AS build
WORKDIR /app

# Build-time configuration (Vite inlines VITE_* vars into the bundle)
ARG VITE_USE_MOCK=true
ARG VITE_API_BASE_URL=/api
ARG VITE_APP_VERSION=docker
ENV VITE_USE_MOCK=$VITE_USE_MOCK \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_APP_VERSION=$VITE_APP_VERSION \
    VITE_DEPLOY_ENV=production \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
LABEL org.opencontainers.image.source="https://github.com/ksvtmr/corporate" \
      org.opencontainers.image.title="iclever-corporate-web" \
      org.opencontainers.image.description="iClever Corporate Frontend (static SPA served by nginx)"

COPY --link nginx.conf /etc/nginx/conf.d/default.conf
COPY --link --from=build --chown=101:101 /app/dist /usr/share/nginx/html

USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
