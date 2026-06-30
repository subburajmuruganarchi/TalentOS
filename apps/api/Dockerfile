# TalentOS API — production image
# Build from repository root:
#   docker build -f apps/api/Dockerfile .

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY .npmrc ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared-types/package*.json ./packages/shared-types/

RUN npm ci --workspace=@talentos/api --include-workspace-root

COPY packages/shared-types ./packages/shared-types
COPY apps/api ./apps/api

RUN npm run build --workspace=@talentos/shared-types
RUN npm run build --workspace=@talentos/api

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3001/api/v1/health || exit 1

CMD ["node", "dist/main.js"]
