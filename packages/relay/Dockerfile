# Ingester sidecar — connects to Matterbridge SSE stream
# and POSTs DID-containing messages to keytrace.dev
FROM node:20-slim
WORKDIR /app
COPY dist/ ./dist/
COPY package.json ./
ENV NODE_ENV=production
CMD ["node", "dist/ingester.js"]
