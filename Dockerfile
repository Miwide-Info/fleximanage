# Multi-stage Dockerfile for FlexiManage
FROM node:18-alpine AS frontend-builder

# Build Frontend
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ ./
RUN npm run build

# Backend stage
FROM node:18-alpine

# Install necessary system dependencies
RUN apk add --no-cache \
    curl \
    bash \
    openssl \
    ca-certificates

WORKDIR /app

# Copy backend package files and install dependencies
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --only=production
# Install nodemon globally for development hot reloading
RUN npm install -g nodemon

# Copy backend source code
COPY backend/ ./

# Copy frontend build from previous stage
COPY --from=frontend-builder /frontend/build ../frontend/build

# Create necessary directories
RUN mkdir -p logs /var/log/mongodb

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S flexiwan -u 1001 -G nodejs

# Change ownership of the app directory
RUN chown -R flexiwan:nodejs /app

# Switch to non-root user
USER flexiwan

# Expose ports
EXPOSE 3000 3443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the backend application
WORKDIR /app/backend
# Use nodemon in development, regular node in production
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = \"development\" ]; then nodemon --watch . --ext js ./bin/www; else npm start; fi"]