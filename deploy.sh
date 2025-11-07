#!/bin/bash

echo "🚀 Starting deployment..."

echo "📥 Pulling latest changes from git..."
git pull

echo "🚀 NPM install..."
npm i

echo "🔨 Building application..."
npm run build

echo "🔄 Restarting PM2 process..."
pm2 restart mio-nuxt

echo "📋 Showing logs..."
pm2 logs mio-nuxt