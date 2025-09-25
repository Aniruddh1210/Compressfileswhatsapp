# 🤖 WhatsApp File Compressor Bot

A smart WhatsApp bot that automatically compresses files to 2MB or less, perfect for sharing on apps with file size limits!

## ✨ Features

- 🔄 **Automatic Processing**: Send any file → Get compressed version back
- 🗜️ **Smart Compression**: Images, PDFs, and other files optimized intelligently
- 📊 **Size Reports**: Shows original vs compressed size with reduction percentage
- ☁️ **Cloud Ready**: Deploy once, runs 24/7 without your computer
- 📱 **WhatsApp Native**: Works directly in WhatsApp - no app installation needed

## 🚀 Quick Start

### Local Testing

```bash
# Install dependencies
npm install

# Start the bot
npm start

# Scan QR code with your WhatsApp Business number
# Send a file to test compression!
```

### Cloud Deployment (Recommended)

```bash
# Prepare for deployment
./deploy-setup.sh

# Follow DEPLOYMENT.md for Render.com setup
cat DEPLOYMENT.md
```

### Enable Persistent WhatsApp Session (Recommended)

To avoid re-scanning the QR after restarts, persist the session data and Chromium profile:

1. The image defines a persistent mount at `/data` with subfolders:

- `/data/auth` (WhatsApp LocalAuth session)
- `/data/puppeteer` (Chromium user profile/cache)

2. On Railway (or any host), add a volume and mount it to `/data`.

3. Optional environment overrides:

- `DATA_DIR` (default `/data`)
- `AUTH_DIR` (default `${DATA_DIR}/auth`)
- `CACHE_DIR` (default `${DATA_DIR}/puppeteer`)

After mounting, scan the QR once. The session will survive restarts.

## 💡 How It Works

1. **Send a file** to your WhatsApp Business number from any phone
2. **Bot processes** and compresses the file intelligently:
   - 🖼️ **Images**: Quality reduction + resizing (JPEG/PNG)
   - 📄 **PDFs**: Optimization + page reduction if needed
   - 🎥 **Videos**: Basic handling (coming soon: full compression)
   - 📦 **Other files**: Size checking and basic compression
3. **Receive compressed file** with detailed stats

## 📁 File Types Supported

| Type             | Method                        | Target Size |
| ---------------- | ----------------------------- | ----------- |
| Images (JPG/PNG) | Quality + Resize              | ≤2MB        |
| PDFs             | Optimization + Page reduction | ≤2MB        |
| Videos (MP4)     | Basic handling\*              | ≤2MB        |
| Other files      | Zip compression               | ≤2MB        |

\*Full video compression coming in next update

## 🛠️ Requirements

- Node.js 18+
- WhatsApp Business number
- Cloud service (Render/Railway) for 24/7 operation

## 📱 Perfect For

- **Family sharing**: Help relatives compress files easily
- **Business use**: Quick file optimization for team sharing
- **App uploads**: Prepare files for size-limited platforms
- **Storage saving**: Reduce file sizes before backup

## 🎯 Example Usage

**Dad sends a 5MB photo →**  
Bot: "🔄 Processing your file..."  
Bot: "✅ **File Compressed Successfully!**  
📁 Original: 5.2MB  
📦 Compressed: 1.8MB  
💾 Saved: 3.4MB  
📊 Reduction: 65%"

## 📋 Commands

- Send **any file** → Automatic compression
- Send **"help"** → Usage instructions
- Send **"start"** → Welcome message

Ready to compress? Let's get started! 🚀

## 🆓 Run It Free (Indefinitely)

If you want to avoid 30‑day limits and keep costs at $0 for your low daily usage, here are practical options:

### Option A: Oracle Cloud Always Free VM (recommended free cloud)

Oracle Cloud offers an "Always Free" compute VM that can run 24/7 at no cost if capacity is available in your region.

High level steps:

1. Create an Oracle Cloud account and enable Always Free (pick a region with free Ampere A1 availability).
2. Provision an Always Free VM (Ubuntu 22.04 works well).
3. Install Docker and Compose plugin on the VM.
4. Clone this repo and start with Docker Compose. Data persists in `/data` (bind‑mounted `./data`).

```bash
# On the VM (Ubuntu):
sudo apt-get update && sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
   "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
   $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
   sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Pull code and run
git clone <your-fork-or-repo-url>.git whatsapp2mbautomation
cd whatsapp2mbautomation
docker compose up -d --build

# The bot runs; open logs to grab QR and scan with WhatsApp
docker compose logs -f
```

Notes:

- No public port is required for WhatsApp; the bot only needs outbound internet. The HTTP port is just for health.
- The QR scan is one‑time when `/data` is persisted.

### Option B: Home/NAS/Old Mini‑PC (zero hosting cost)

Run it on any always‑on device at home. Requirements: Docker and outbound internet.

1. On the device, install Docker + Docker Compose.
2. Clone this repo and run `docker compose up -d --build`.
3. Open logs, scan the QR once, done. The `./data` folder will persist the session.

Bonus: If you later want a web URL, add Cloudflare Tunnel (free) to expose `/status` without opening ports.

### Why not the common "free hosting" platforms?

- Most free hobby plans (Railway, Render, etc.) now sleep or have time/credit limits and don’t support 24/7 background processes reliably.
- Serverless platforms (Vercel/Netlify/Workers) don’t support always‑on Node processes with headless Chromium.

The two options above are the most realistic “free forever” routes today.
