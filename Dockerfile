# Use Node.js 20 LTS version
FROM node:20-slim

# Install system dependencies for Ghostscript and curl
RUN apt-get update && apt-get install -y \
    ghostscript \
    curl \
    && rm -rf /var/lib/apt/lists/*# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p temp .wwebjs_auth .wwebjs_cache

# Set permissions
RUN chmod -R 755 /app

# Expose port for health check
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Start the application
CMD ["npm", "start"]