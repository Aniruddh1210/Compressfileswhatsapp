const express = require('express');

// Create a simple web server to keep the service alive
const createHealthServer = () => {
    const app = express();
    const PORT = process.env.PORT || 3000;

    // Health check endpoint
    app.get('/', (req, res) => {
        res.json({
            status: 'healthy',
            message: 'WhatsApp File Compressor Bot is running',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    });

    // Status endpoint
    app.get('/status', (req, res) => {
        res.json({
            status: 'active',
            service: 'WhatsApp File Compressor Bot',
            version: '1.0.0',
            features: [
                'Image compression (JPEG, PNG)',
                'PDF compression',
                'File size optimization to ≤2MB',
                'Automatic file type detection'
            ]
        });
    });

    // Keep-alive endpoint (for monitoring services)
    app.get('/ping', (req, res) => {
        res.send('pong');
    });

    const server = app.listen(PORT, () => {
        console.log(`🌐 Health server running on port ${PORT}`);
        console.log(`📡 Health check: http://localhost:${PORT}`);
    });

    return server;
};

module.exports = { createHealthServer };