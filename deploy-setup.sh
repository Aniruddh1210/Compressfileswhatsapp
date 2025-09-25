#!/bin/bash

echo "🚀 WhatsApp File Compressor Bot - Cloud Deployment Setup"
echo "=================================================="

# Check if git is initialized
if [ ! -d .git ]; then
    echo "📦 Initializing Git repository..."
    git init
    echo "✅ Git repository initialized"
fi

# Add all files
echo "📁 Adding files to Git..."
git add .

# Commit if there are changes
if [ -n "$(git status --porcelain)" ]; then
    echo "💾 Committing changes..."
    git commit -m "WhatsApp File Compressor Bot - Ready for deployment"
    echo "✅ Changes committed"
else
    echo "✅ No changes to commit"
fi

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Create a GitHub repository"
echo "2. Add remote: git remote add origin https://github.com/YOUR_USERNAME/whatsapp-file-compressor"
echo "3. Push code: git push -u origin main"
echo "4. Deploy to Render.com (see DEPLOYMENT.md for details)"
echo ""
echo "🔗 Deployment Guide: cat DEPLOYMENT.md"
echo "🧪 Test locally: npm start"