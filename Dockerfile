# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies first so they can be cached
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@10.24.0
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY . .
RUN pnpm exec prisma generate
RUN pnpm build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
RUN npm install -g pnpm@10.24.0
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

RUN pnpm exec prisma generate

EXPOSE 3000
ENV NODE_ENV=production
CMD ["pnpm", "start"]
