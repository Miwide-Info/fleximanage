# Backend Dockerfile
FROM node:18-alpine

# Install necessary system dependencies
RUN apk add --no-cache \
    curl \
    bash \
    openssl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p logs /var/log/mongodb

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001 -G nodejs

# Change ownership of the app directory
RUN chown -R backend:nodejs /app

# Switch to non-root user
USER backend

# Expose ports
EXPOSE 3000 3443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["npm", "start"]