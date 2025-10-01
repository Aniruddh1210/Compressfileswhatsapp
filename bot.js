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

// Keep the latest QR code (raw + ASCII) so we can expose it via HTTP
let latestQr = null; // raw QR string
let latestQrAscii = null; // pre-rendered ASCII for browsers/terminals

// Track which chats have requested compression
const enabledChats = new Set();

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
// Serve the current QR as ASCII when available
app.get('/qr', (_req, res) => {
    if (!runtimeState.hasQr || !latestQr) {
        return res.status(404).json({ message: runtimeState.authenticated ? 'Already authenticated' : 'QR not available yet' });
    }
    try {
        let ascii = '';
        qrcode.generate(latestQr, { small: true }, (q) => { ascii = q; });
        ascii = ascii || latestQrAscii || '';
        if (!ascii) throw new Error('ASCII not ready');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(200).send(ascii);
    } catch (e) {
        return res.status(500).json({ message: 'Failed to render QR', error: e?.message });
    }
});

// Logout and re-initialize to show a fresh QR
app.post('/logout', async (_req, res) => {
    try {
        console.log('🔄 Logout requested via API...');
        await client.logout();
        // The 'disconnected' event will handle state changes and re-initialization
        res.status(200).json({ message: 'Logged out. Client will re-initialize.' });
    } catch (e) {
        console.error('❌ Logout failed:', e);
        res.status(500).json({ error: 'Logout failed', details: e?.message });
    }
});

// Dangerous: clear LocalAuth data on disk and re-create client for a full reset
app.post('/reset-auth', async (_req, res) => {
    try {
        console.log('🧹 Full auth reset requested via API...');
        if (client) {
            try {
                await client.destroy();
                console.log('✅ Previous client instance destroyed.');
            } catch (e) {
                console.error('⚠️ Could not destroy previous client instance:', e.message);
            }
        }
        await fs.remove(AUTH_DIR);
        await fs.ensureDir(AUTH_DIR);
        console.log('📁 Auth directory cleared.');
        
        // Restart the client creation and initialization process
        start();

        res.status(200).json({ message: 'Auth reset. Waiting for new QR...' });
    } catch (e) {
        console.error('❌ Reset auth failed:', e);
        res.status(500).json({ error: 'Reset auth failed', details: e?.message });
    }
});
app.listen(PORT, () => console.log(`🩺 Health server listening on :${PORT}`));

console.log('🚀 Starting WhatsApp File Compressor Bot...');

console.log('🔧 Creating WhatsApp client...');

// Prepare persistent storage paths
const DATA_DIR = process.env.DATA_DIR || './data';
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
            // Prefer an explicit CHROME_PATH (useful on macOS). If not set, fall back to
            // @sparticuz/chromium's path (which is Linux-focused). This avoids ENOEXEC
            // when the packaged chromium is a Linux ELF on macOS.
            executablePath: process.env.CHROME_PATH || await chromium.executablePath(),
            // Note: Do NOT set puppeteer.userDataDir with LocalAuth.
            // LocalAuth manages its own storage and is incompatible with a custom userDataDir.
        },
        webVersionCache: {
            type: 'remote',
            remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html`,
        }
    });
    return client;
}

// Initialize client
let client;

function setupEventListeners() {

    client.on('qr', qr => {
        qrcode.generate(qr, { small: true });
        console.log('📱 Scan this QR code with your WhatsApp account to authenticate.');
        runtimeState.hasQr = true;
        latestQr = qr;
        try {
            // Render a small ASCII QR similar to terminal output
            // qrcode-terminal doesn't give us the string directly, so we generate via a temporary capture
            let ascii = '';
            qrcode.generate(qr, { small: true }, (q) => { ascii = q; });
            latestQrAscii = ascii || 'QR available but ASCII render failed';
        } catch (e) {
            latestQrAscii = 'QR available but failed to render ASCII';
        }
    });

    client.on('ready', () => {
        console.log('✅ WhatsApp File Compressor Bot is ready!');
        console.log('💡 Users need to send "help compress" to enable file compression in their chat.');
        runtimeState.ready = true;
        runtimeState.hasQr = false; // once ready, QR should no longer be presented
        latestQr = null;
        latestQrAscii = null;
    });

    client.on('authenticated', () => {
        console.log('🔐 WhatsApp authentication successful!');
        runtimeState.authenticated = true;
        runtimeState.hasQr = false;
        latestQr = null;
        latestQrAscii = null;
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
        if (message.body.trim().toLowerCase() === 'help compress') {
            enabledChats.add(message.from);
            await message.reply('✅ Compression enabled for this chat! Send me a file and I will compress it to under 2MB for you.');
            return;
        }

        // If chat is not enabled, silently ignore all other messages
        if (!enabledChats.has(message.from)) {
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

    client.on('disconnected', (reason) => {
        console.log('🔌 Client was logged out:', reason);
        runtimeState.ready = false;
        runtimeState.authenticated = false;
        runtimeState.hasQr = false;
        latestQr = null;
        latestQrAscii = null;
        enabledChats.clear();
        // Re-initialize to get a new QR code
        initializeClient();
    });
}

function initializeClient() {
    console.log('🚀 Initializing WhatsApp client...');
    client.initialize().catch(err => {
        console.error('❌ Initialization failed:', err);
    });
}

async function start() {
    try {
        console.log('🔧 Creating WhatsApp client...');
        client = await createClient();
        console.log('✅ Client created, setting up event listeners...');
        setupEventListeners();
        initializeClient();
    } catch (err) {
        console.error('❌ Failed during startup:', err);
    }
}

start();