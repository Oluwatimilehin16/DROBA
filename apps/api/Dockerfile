# Droba API: Express + Socket.io. Build from the repo root: docker build -f apps/api/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --ignore-scripts --workspace @droba/api --workspace @droba/shared --include-workspace-root
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @droba/shared && npx -w @droba/api prisma generate && npm run build -w @droba/api && npm prune --omit=dev --workspace @droba/api --workspace @droba/shared

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production UV_THREADPOOL_SIZE=16
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/api/package.json apps/api/package.json
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/prisma apps/api/prisma
WORKDIR /app/apps/api
EXPOSE 4000
USER node
# Apply pending migrations, then start. Run several replicas behind a load balancer; Redis links them.
CMD ["sh", "-c", "node ../../node_modules/prisma/build/index.js migrate deploy && node dist/server.js"]
