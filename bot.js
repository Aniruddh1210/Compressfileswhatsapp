const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { enhancedPDFCompression } = require('./compression-enhanced');
const { compressImageEnhanced } = require('./compression-enhanced');
const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const chromium = require('@sparticuz/chromium');
const app = express();

// Track simple runtime status for ops
const runtimeState = {
    ready: false,
    authenticated: false,
    hasQr: false,
};

// Minimal HTTP server for health checks and uptime
const PORT = process.env.PORT || 3000;
app.get('/', (_req, res) => res.status(200).send('OK'));
app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok' }));
app.get('/status', (_req, res) => {
    res.status(200).json({
        ready: runtimeState.ready,
        authenticated: runtimeState.authenticated,
        hasQr: runtimeState.hasQr,
    });
});
app.listen(PORT, () => console.log(`🩺 Health server listening on :${PORT}`));

console.log('🚀 Starting WhatsApp File Compressor Bot...');

console.log('🔧 Creating WhatsApp client...');

// Prepare persistent storage paths
const DATA_DIR = process.env.DATA_DIR || '/data';
const AUTH_DIR = process.env.AUTH_DIR || path.join(DATA_DIR, 'auth');
const CACHE_DIR = process.env.CACHE_DIR || path.join(DATA_DIR, 'puppeteer');

// Ensure directories exist (no-op if already present)
try {
    fs.ensureDirSync(AUTH_DIR);
    fs.ensureDirSync(CACHE_DIR);
    console.log(`📁 Persistence enabled -> AUTH_DIR: ${AUTH_DIR}, CACHE_DIR: ${CACHE_DIR}`);
} catch (e) {
    console.warn('⚠️ Could not prepare persistence directories; session may not persist:', e.message);
}

// Create client with serverless-friendly Chromium
async function createClient() {
    const client = new Client({
        authStrategy: new LocalAuth({
            // Store session under AUTH_DIR
            dataPath: AUTH_DIR,
        }),
        puppeteer: { 
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ],
            executablePath: await chromium.executablePath(),
            // Note: Do NOT set puppeteer.userDataDir with LocalAuth.
            // LocalAuth manages its own storage and is incompatible with a custom userDataDir.
        }
    });
    return client;
}

// Initialize client
let client;
createClient().then(c => {
    client = c;
    console.log('✅ Client created, setting up event listeners...');
    setupEventListeners();
    initializeClient();
}).catch(err => {
    console.error('❌ Failed to create client:', err);
});

function setupEventListeners() {

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('📱 Scan this QR code with your WhatsApp account to authenticate.');
    runtimeState.hasQr = true;
});

client.on('ready', () => {
    console.log('✅ WhatsApp File Compressor Bot is ready!');
    console.log('💡 Users need to send "help compress" to enable file compression in their chat.');
    runtimeState.ready = true;
    runtimeState.hasQr = false; // once ready, QR should no longer be presented
});

client.on('authenticated', () => {
    console.log('🔐 WhatsApp authentication successful!');
    runtimeState.authenticated = true;
    runtimeState.hasQr = false;
});

client.on('auth_failure', msg => {
    console.error('❌ Authentication failed:', msg);
    runtimeState.authenticated = false;
});

client.on('message', async message => {
    console.log('📨 Message received from:', message.from, '| Body:', message.body);

    // Ignore group messages
    if (message.from.includes('@g.us')) {
        console.log('❌ Ignoring group message.');
        return;
    }

    // Only enable compression for chats that send 'help compress'
    // Track which chats have requested compression
    if (!global.enabledChats) global.enabledChats = new Set();

    // Enable compression for this chat if they send 'help compress'
    if (message.body.trim().toLowerCase() === 'help compress') {
        global.enabledChats.add(message.from);
        await message.reply('✅ Compression enabled for this chat! Send me a file and I will compress it to under 2MB for you.');
        return;
    }

    // If chat is not enabled, silently ignore all other messages
    if (!global.enabledChats.has(message.from)) {
        console.log('⚪ Chat not enabled, ignoring message silently.');
        return;
    }

    // File compression (only for enabled chats)
    if (message.hasMedia) {
        await message.reply('🔄 Compressing your file...');
        try {
            const media = await message.downloadMedia();
            const mediaBuffer = Buffer.from(media.data, 'base64');
            let result;
            
            if (media.mimetype === 'application/pdf') {
                // Use enhanced PDF compression
                result = await enhancedPDFCompression(mediaBuffer, media.filename);
            } else if (media.mimetype.startsWith('image/')) {
                // Use enhanced image compression
                result = await compressImageEnhanced(mediaBuffer, media.mimetype, media.filename);
            } else {
                throw new Error(`Unsupported file type: ${media.mimetype}`);
            }

            const compressedMedia = new MessageMedia(
                result.mimetype,
                result.buffer.toString('base64'),
                result.filename
            );
            await message.reply(compressedMedia, undefined, { caption: '✅ Compressed file ready!' });
        } catch (err) {
            console.error('❌ Compression error:', err);
            await message.reply('❌ Failed to compress your file.');
        }
    }
});
}

function initializeClient() {
    console.log('🚀 Initializing WhatsApp client...');
    client.initialize().catch(err => {
        console.error('❌ Initialization failed:', err);
    });
}