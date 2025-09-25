# Use Node.js 20 LTS version
FROM node:20-slim

# Install system dependencies for Ghostscript, curl and Chromium
RUN apt-get update && apt-get install -y \
  ghostscript \
  curl \
  libnss3 \
  libnspr4 \
  libgconf-2-4 \
  libxss1 \
  libappindicator1 \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libgtk-3-0 \
  libgtk-4-1 \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p temp .wwebjs_auth .wwebjs_cache /data /data/auth /data/puppeteer

# Set permissions
RUN chmod -R 755 /app

# Expose port for health check
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000} || exit 1

# Declare a volume for persistence (mount this in Railway for durable sessions)
VOLUME ["/data"]

# Start the application
CMD ["npm", "start"]