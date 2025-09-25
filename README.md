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
