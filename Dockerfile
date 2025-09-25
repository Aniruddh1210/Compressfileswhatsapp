# Use the official Node.js image with built-in Chrome support
FROM ghcr.io/puppeteer/puppeteer:21.6.1

# Switch to root to install additional packages
USER root

# Install Ghostscript for PDF compression
RUN apt-get update && apt-get install -y \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

# Switch back to pptruser for security
USER pptruser

# Set working directory
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