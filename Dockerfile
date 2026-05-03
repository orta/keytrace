# syntax=docker/dockerfile:1.7

# --- Build the Tap binary from indigo ---
FROM golang:1.23-alpine AS tap-build
RUN apk add --no-cache git
ENV CGO_ENABLED=0
RUN go install github.com/bluesky-social/indigo/cmd/tap@latest

# --- Install deps and build the Nuxt app ---
FROM node:22-alpine AS node-build
RUN apk add --no-cache python3 make g++ libc6-compat
WORKDIR /app

COPY .yarnrc.yml package.json yarn.lock ./
COPY .yarn ./.yarn
COPY turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps

RUN corepack enable && yarn install --immutable
RUN yarn build

# --- Runtime image: Node + tap binary + built outputs ---
FROM node:22-alpine AS runtime
RUN apk add --no-cache libc6-compat tini
WORKDIR /app

COPY --from=tap-build /go/bin/tap /usr/local/bin/tap
COPY --from=node-build /app/apps/keytrace.dev/.output ./apps/keytrace.dev/.output
COPY --from=node-build /app/apps/host ./apps/host

ENV NODE_ENV=production
ENV KEYTRACE_DATA_DIR=/keytrace-data
ENV NITRO_PORT=3000
ENV NITRO_HOST=0.0.0.0

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/host/index.mjs"]
