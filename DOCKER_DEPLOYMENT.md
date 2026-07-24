# Docker Deployment Guide

## Overview

This project uses Docker with multi-stage builds for optimal production performance. The setup includes:
- **Production Dockerfile**: Multi-stage build with non-root user, signal handling, and minimal final image (~255MB)
- **Production docker-compose.yml**: Single-container setup with healthcheck
- **Development docker-compose.dev.yml**: Hot-reload with separate frontend/backend services

## Production Deployment

### 1. Build the Image

```bash
docker build -t sbg-website:latest .
```

Optional: Pass build arguments for custom API URL and build ID:
```bash
docker build -t sbg-website:latest \
  --build-arg VITE_API_URL=https://api.example.com \
  --build-arg BUILD_ID=$(date +%s) .
```

### 2. Run with Docker Compose (Production)

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
# Edit .env with your actual values
```

Start the container:

```bash
docker compose up -d --pull always
```

Verify it's running:
```bash
docker compose logs -f app
docker compose ps
```

### 3. Docker Compose Environment Variables

Create `.env`:
```env
DATABASE_URL=postgresql://user:pass@neon-host/database
JWT_SECRET=your-secret-key
CORS_ORIGIN=https://yourdomain.com
NODE_ENV=production
BUILD_ID=my-build-id-123
```

## Development Deployment

### 1. Run Development Stack

Start both frontend (port 5173) and backend (port 3006) with hot-reload:

```bash
docker compose -f docker-compose.dev.yml up
```

The backend auto-rebuilds on file changes in `server/src/`.
The frontend auto-rebuilds on file changes in `client/src/`.

### 2. View Logs

```bash
# All services
docker compose -f docker-compose.dev.yml logs -f

# Specific service
docker compose -f docker-compose.dev.yml logs -f server
docker compose -f docker-compose.dev.yml logs -f client
```

## Docker Compose Features

### Production (docker-compose.yml)
- Single unified container (backend serves static frontend)
- Healthcheck on port 3006 every 30s
- Automatic restart on failure
- Non-root user for security
- Proper signal handling (dumb-init)
- --pull always to fetch latest base image

### Development (docker-compose.dev.yml)
- Separate frontend and backend containers
- Volume mounts for source code hot-reload
- `develop.watch` for automatic rebuilds
- Named volumes to persist node_modules

## Image Optimization

The production Dockerfile includes:
- **Multi-stage builds**: Separate client/server build stages, minimal final layer
- **Non-root user**: Runs as `nodejs:nodejs` (uid 1001)
- **dumb-init**: Proper signal handling for graceful shutdown
- **--omit=dev**: Production dependencies only (154 packages vs 257 dev)
- **Layer caching**: Package.json copied before source code
- **package*.json pattern**: Works with npm-shrinkwrap.json or lock files

## Troubleshooting

### Container won't start
```bash
docker compose logs app
docker compose ps
```

### Port already in use
Change the port mapping in docker-compose.yml:
```yaml
ports:
  - "8080:3006"  # Host:Container
```

### Database connection issues
Verify DATABASE_URL in .env:
```bash
docker compose exec app env | grep DATABASE
```

### Out of memory
Check container stats:
```bash
docker stats sbg-website
```

Increase Docker memory limit in Docker Desktop settings → Resources.

## Pushing to Registry

Tag and push to Docker Hub or private registry:

```bash
docker tag sbg-website:latest your-registry/sbg-website:latest
docker push your-registry/sbg-website:latest
```

## CI/CD Integration

The `.github/workflows/deploy-backend.yml` already exists. To add Docker builds to CI:

```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: your-registry/sbg-website:${{ github.sha }}
```
