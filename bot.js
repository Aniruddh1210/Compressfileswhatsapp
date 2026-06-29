const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { compressFile } = require('./compression');
const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const chromium = require('@sparticuz/chromium');
const app = express();
app.use(express.json({ limit: '64kb' }));

// Track simple runtime status for ops
const runtimeState = {
    ready: false,
    authenticated: false,
    hasQr: false,
    lastReadyAt: null,
    lastEventAt: Date.now(),
    reinitAttempts: 0,
};

// Process-level safety nets: a stray async error or rejected promise should
// not silently kill the bot. We log and keep running; the watchdog handles
// genuinely wedged WhatsApp sessions by forcing a reinit.
process.on('unhandledRejection', (reason) => {
    console.error('🛑 Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('🛑 Uncaught exception:', err);
});

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
        lastReadyAt: runtimeState.lastReadyAt,
        lastEventAt: runtimeState.lastEventAt,
        reinitAttempts: runtimeState.reinitAttempts,
        uptimeSec: Math.floor(process.uptime()),
    });
});
// Proactive outbound send — lets other services (e.g. the job-tracker cron)
// push a WhatsApp message from this logged-in number with no 24h-window or
// template limits. Gated by X-Send-Token so only our callers can use it.
const SEND_TOKEN = process.env.SEND_TOKEN || '';
app.post('/send', async (req, res) => {
    if (SEND_TOKEN && req.headers['x-send-token'] !== SEND_TOKEN) return res.status(401).json({ error: 'bad token' });
    if (!runtimeState.ready || !client) return res.status(503).json({ error: 'whatsapp not ready (scan QR / wait for init)' });
    const { to, text } = req.body || {};
    if (!to || !text) return res.status(400).json({ error: 'need { to, text }' });
    const digits = String(to).replace(/[^0-9]/g, '');   // accept +91-98…, spaces, etc.
    if (!digits) return res.status(400).json({ error: 'invalid recipient number' });
    try {
        await client.sendMessage(`${digits}@c.us`, String(text));
        return res.status(200).json({ ok: true });
    } catch (e) {
        return res.status(500).json({ ok: false, error: e.message });
    }
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
    // Determine a safe executable path for Chromium/Chrome. On macOS prefer
    // the system-installed Chrome/Chromium to avoid trying to run a Linux ELF
    // binary packaged by @sparticuz/chromium.
    async function resolveChromeExecutable() {
        if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
        if (process.platform === 'darwin') {
            const macPaths = [
                '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                '/Applications/Chromium.app/Contents/MacOS/Chromium',
                `${process.env.HOME}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
                `${process.env.HOME}/Applications/Chromium.app/Contents/MacOS/Chromium`
            ];
            for (const p of macPaths) {
                try {
                    if (fs.existsSync(p)) return p;
                } catch (e) {
                    // ignore
                }
            }
            // If none found, fall through to sparticuz chromium (may fail on mac)
        }
        try {
            return await chromium.executablePath();
        } catch (e) {
            // Last resort: undefined so Puppeteer will try its default lookup.
            console.warn('⚠️ Could not resolve @sparticuz/chromium executablePath:', e.message);
            return undefined;
        }
    }

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
            // Resolve an executable path safely (prefer macOS system Chrome when
            // running on darwin). If unresolved, Puppeteer may attempt defaults.
            executablePath: await resolveChromeExecutable(),
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
        runtimeState.lastEventAt = Date.now();
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
        runtimeState.lastReadyAt = Date.now();
        runtimeState.lastEventAt = Date.now();
        runtimeState.reinitAttempts = 0; // reset backoff on a clean ready
        latestQr = null;
        latestQrAscii = null;
    });

    client.on('authenticated', () => {
        console.log('🔐 WhatsApp authentication successful!');
        runtimeState.authenticated = true;
        runtimeState.hasQr = false;
        runtimeState.lastEventAt = Date.now();
        latestQr = null;
        latestQrAscii = null;
    });

    client.on('auth_failure', msg => {
        console.error('❌ Authentication failed:', msg);
        runtimeState.authenticated = false;
    });

    client.on('message', async message => {
        runtimeState.lastEventAt = Date.now();
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

                result = await compressFile(mediaBuffer, media.mimetype, media.filename || 'file');

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
        runtimeState.lastEventAt = Date.now();
        latestQr = null;
        latestQrAscii = null;
        // Keep enabledChats — user opt-ins survive transient disconnects.
        // Rebuild the client from scratch with backoff. Using start() rather
        // than initializeClient() ensures a fresh Client instance, which
        // avoids puppeteer state getting wedged after a hard logout.
        scheduleRestart('disconnected');
    });
}

let restartTimer = null;
function scheduleRestart(reason) {
    if (restartTimer) return; // already pending
    runtimeState.reinitAttempts += 1;
    // Exponential backoff capped at 60s. Retries forever.
    const delay = Math.min(60000, 1000 * Math.pow(2, Math.min(runtimeState.reinitAttempts - 1, 6)));
    console.log(`⏳ Restart scheduled in ${delay}ms (reason: ${reason}, attempt #${runtimeState.reinitAttempts})`);
    restartTimer = setTimeout(async () => {
        restartTimer = null;
        try {
            if (client) {
                try { await client.destroy(); } catch (e) { /* ignore */ }
            }
            await start();
        } catch (err) {
            console.error('❌ Restart failed:', err);
            scheduleRestart('restart-failed');
        }
    }, delay);
}

function initializeClient() {
    console.log('🚀 Initializing WhatsApp client...');
    client.initialize().catch(err => {
        console.error('❌ Initialization failed:', err);
        scheduleRestart('init-failed');
    });
}

// Watchdog: if the client is not ready and not showing a QR for longer than
// WATCHDOG_STALL_MS, assume the session is wedged and force a rebuild.
// Also forces a rebuild if it's been ready but no event arrived for a very
// long stretch (covers silent puppeteer protocol hangs).
const WATCHDOG_INTERVAL_MS = 60 * 1000;       // check every minute
const WATCHDOG_STALL_MS = 5 * 60 * 1000;      // stuck-without-ready threshold
const WATCHDOG_IDLE_MS = 30 * 60 * 1000;      // ready-but-silent threshold
setInterval(() => {
    const now = Date.now();
    const sinceEvent = now - (runtimeState.lastEventAt || now);
    if (!runtimeState.ready && !runtimeState.hasQr && sinceEvent > WATCHDOG_STALL_MS) {
        console.warn(`🐕 Watchdog: client not ready and no QR for ${sinceEvent}ms — forcing restart.`);
        scheduleRestart('watchdog-stall');
        return;
    }
    if (runtimeState.ready && sinceEvent > WATCHDOG_IDLE_MS) {
        // Light ping: ask puppeteer for state. If it throws or returns nothing,
        // the session is likely wedged.
        Promise.resolve()
            .then(() => client && client.getState ? client.getState() : null)
            .then((state) => {
                if (!state) {
                    console.warn('🐕 Watchdog: getState returned empty — forcing restart.');
                    scheduleRestart('watchdog-empty-state');
                } else {
                    runtimeState.lastEventAt = Date.now();
                }
            })
            .catch((err) => {
                console.warn('🐕 Watchdog: getState failed — forcing restart.', err?.message);
                scheduleRestart('watchdog-getstate-failed');
            });
    }
}, WATCHDOG_INTERVAL_MS).unref?.();

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