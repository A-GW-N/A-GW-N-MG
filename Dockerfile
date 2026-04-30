FROM node:22-alpine AS node-base
RUN corepack enable && corepack prepare pnpm@10.10.0 --activate

FROM node-base AS web-deps
WORKDIR /app
COPY package.json ./
RUN pnpm install --no-frozen-lockfile

FROM node-base AS web-builder
WORKDIR /app
COPY --from=web-deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM golang:1.24-alpine AS go-builder
WORKDIR /src
COPY backend/go-proxy/go.mod ./
RUN go mod download
COPY backend/go-proxy ./
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/agwn-go-proxy ./cmd/server

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV GO_PROXY_BASE_URL=http://127.0.0.1:8081
ENV GO_PROXY_HOST=127.0.0.1
ENV GO_PROXY_PORT=8081

RUN apk add --no-cache dumb-init && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=web-builder /app/.next/standalone ./
COPY --from=web-builder /app/.next/static ./.next/static
COPY --from=web-builder /app/public ./public
COPY --from=go-builder /out/agwn-go-proxy /usr/local/bin/agwn-go-proxy
COPY docker/start-all.sh /usr/local/bin/start-all.sh

RUN chmod +x /usr/local/bin/start-all.sh && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["start-all.sh"]
