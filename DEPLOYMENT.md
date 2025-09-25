# 🚀 Cloud Deployment Guide

## Quick Deploy to Render (Free)

### Step 1: Prepare Your Code

1. Push your code to GitHub:

```bash
git init
git add .
git commit -m "Initial WhatsApp File Compressor Bot"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/whatsapp-file-compressor
git push -u origin main
```

### Step 2: Deploy to Render

1. Go to [Render.com](https://render.com) and sign up (free)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `whatsapp-file-compressor`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

### Step 3: First Time Setup (Important!)

1. After deployment, your bot will be running in the cloud
2. **One-time QR code scan**:
   - Go to your Render service logs
   - Look for the QR code in the logs
   - Scan it with your WhatsApp Business number
   - After scanning, the session will be saved for future use

### Step 4: Test Your Bot

1. Your bot URL will be: `https://your-service-name.onrender.com`
2. Visit the URL to see if it's healthy
3. Send a file to your WhatsApp Business number from any phone
4. Bot should compress and send it back automatically!

## Alternative: Railway Deployment

### Railway (Another Free Option)

1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "Deploy from GitHub repo"
4. Select your repository
5. Railway will auto-detect and deploy

## Environment Variables (Optional)

If you need custom configuration, add these in your cloud service:

- `NODE_ENV=production`
- `PORT=3000` (usually auto-set)

## Important Notes

- **First deployment**: You must scan QR code once in cloud logs
- **Session persistence**: WhatsApp session is saved and will reconnect automatically
- **File processing**: Works with images, PDFs, and basic video files
- **Free tier limits**: ~750 hours/month (enough for 24/7 operation)

## Monitoring Your Bot

- Health check: `https://your-bot-url.onrender.com/`
- Status: `https://your-bot-url.onrender.com/status`
- Ping: `https://your-bot-url.onrender.com/ping`

## Troubleshooting

- **Bot not responding**: Check service logs in Render dashboard
- **QR code needed again**: Session expired, scan new QR code from logs
- **Files not compressing**: Check logs for compression errors

Your bot will now run 24/7 in the cloud! 🎉
