# Build stage: frontend (Vite)
FROM node:20-alpine AS client-builder

WORKDIR /build/client

ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

ARG BUILD_ID=
ENV VITE_BUILD_ID=$BUILD_ID

COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Build stage: backend (Express + TypeScript)
FROM node:20-alpine AS server-builder

WORKDIR /build/server

COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# Final stage: single service – BE serves API + FE static on one port
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Backend: copy dist and package files, install prod dependencies
COPY --chown=nodejs:nodejs server/package*.json ./server/
RUN cd ./server && npm ci --omit=dev --no-audit --no-fund

# Copy backend compiled code
COPY --from=server-builder --chown=nodejs:nodejs /build/server/dist ./server/dist

# Frontend dist copied into app (served by Express)
COPY --from=client-builder --chown=nodejs:nodejs /build/client/dist ./client

# Same build id the client was compiled with
ARG BUILD_ID=
ENV BUILD_ID=$BUILD_ID

ENV NODE_ENV=production
ENV PORT=3005
ENV CLIENT_DIST_DIR=/app/client

# Switch to non-root user
USER nodejs

EXPOSE 3005

WORKDIR /app/server

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
