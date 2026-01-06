# Deployment Guide - Reminder Tool

## Overview
Reminder Tool is a Vite + React + Gemini AI application that can be deployed to both **Vercel** (PRIMARY) and **Cloudflare Pages** (BACKUP).

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Deployment to Vercel](#deployment-to-vercel)
3. [Deployment to Cloudflare Pages](#deployment-to-cloudflare-pages)
4. [Integration & Dual Deployment](#integration--dual-deployment)
5. [Environment Variables](#environment-variables)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required
- Node.js 16+ and npm/yarn
- Git account (GitHub)
- Google Gemini API Key ([Get it here](https://makersuite.google.com/app/apikey))
- Vercel account ([Sign up](https://vercel.com))
- Cloudflare account ([Sign up](https://dash.cloudflare.com/sign-up))

### Local Setup
```bash
# Clone repository
git clone https://github.com/Coachraj/Reminder-tool.git
cd Reminder-tool

# Install dependencies
npm install

# Create .env.local
cp .env.example .env.local

# Edit .env.local with your Gemini API Key
VITE_GEMINI_API_KEY=your_actual_gemini_api_key

# Test locally
npm run dev
```

---

## Deployment to Vercel

### Step 1: Connect GitHub Repository to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Select "Import Git Repository"
4. Search for and select `Coachraj/Reminder-tool`
5. Click "Import"

### Step 2: Configure Project Settings

Vercel should auto-detect:
- **Framework Preset**: Vite ✓
- **Build Command**: `npm install && npm run build` ✓
- **Output Directory**: `dist` ✓

### Step 3: Add Environment Variables

1. In Vercel Project Settings → Environment Variables
2. Add the following:
   - **Name**: `VITE_GEMINI_API_KEY`
   - **Value**: Your actual Gemini API key
   - **Environments**: Production + Preview
3. Click "Save"

### Step 4: Deploy

1. Click "Deploy"
2. Wait for build to complete (typically 1-2 minutes)
3. Get your live URL: `https://your-project.vercel.app`

### Step 5: Verify Deployment

```bash
# Test the live app
curl https://your-project.vercel.app
# Should return HTML content
```

---

## Deployment to Cloudflare Pages

### Step 1: Connect GitHub to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select "Pages" from sidebar
3. Click "Create a project" → "Connect to Git"
4. Authorize GitHub & select `Coachraj/Reminder-tool`
5. Click "Connect account"

### Step 2: Configure Build Settings

- **Production branch**: `main`
- **Framework preset**: Vite
- **Build command**: `npm install && npm run build`
- **Build output directory**: `dist`

### Step 3: Add Environment Variables

1. Go to **Settings** → **Environment variables**
2. Add:
   - **Variable name**: `VITE_GEMINI_API_KEY`
   - **Value**: Your Gemini API key
   - **Environments**: Production + Preview
3. Click "Save"

### Step 4: Deploy

1. Click "Save and Deploy"
2. Wait for build (typically 2-3 minutes)
3. Get your live URL: `https://reminder-tool.pages.dev`

---

## Integration & Dual Deployment

### Why Both?
- **Vercel (PRIMARY)**: Faster deployments, better Node.js support, more generous free tier
- **Cloudflare Pages (BACKUP)**: Edge-native deployment, automatic DDoS protection, global CDN

### Automatic Deployment Flow

```
GitHub Push (main branch)
        ↓
   Webhook Triggers
     ↙          ↘
  Vercel      Cloudflare
    ↓              ↓
  Build         Build
    ↓              ↓
  Deploy        Deploy
    ↓              ↓
vercel.app   pages.dev
```

### DNS Setup (Optional)

Use your custom domain with both:

```
Example.com
     ↓
  CNAME to vercel.app (Primary)
  CNAME to pages.dev (Backup)
```

Or use Cloudflare as DNS:
1. Update domain nameservers to Cloudflare
2. Add CNAME: `reminder` → `vercel.app`
3. Cloudflare will proxy to Vercel

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|----------|
| `VITE_GEMINI_API_KEY` | Google Gemini API Key | `AIzaSy...` |

### Optional

| Variable | Description | Default |
|----------|-------------|----------|
| `VITE_APP_ENV` | Environment | `production` |
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:3000` |
| `VITE_ENABLE_ANALYTICS` | Enable analytics | `false` |
| `VITE_ENABLE_SENTRY` | Enable error tracking | `false` |

---

## Troubleshooting

### Build Fails on Vercel/Cloudflare

**Problem**: `ERR! Could not resolve dependency`

**Solution**:
```bash
# Ensure package-lock.json is up to date
rm package-lock.json
npm install
git add package-lock.json
git commit -m "Update lock file"
git push
```

### Gemini API Key Not Working

**Problem**: "Invalid API key" error in browser

**Solution**:
1. Verify key in Vercel/Cloudflare settings
2. Check key hasn't been regenerated
3. Ensure no extra spaces in environment variable
4. Redeploy after updating

### Build Takes Too Long

**Optimize**:
```bash
# Remove unused dependencies
npm prune

# Check bundle size
npm run build -- --report

# Clear build cache
# In Vercel: Settings → Deployments → Clear cache
# In Cloudflare: Settings → Build cache → Purge everything
```

### Local Dev vs Production Issues

**Ensure parity**:
```bash
# Test production build locally
npm run build
npm run preview

# Check if issues persist
```

---

## Monitoring Deployments

### Vercel Analytics
- Dashboard → Analytics
- Monitor API calls, Core Web Vitals
- Real-time error tracking

### Cloudflare Insights
- Dashboard → Pages → reminder-tool
- View deployment history
- Real User Metrics (RUM)

---

## Rollback Procedures

### Vercel
1. Deployments → Select previous deployment
2. Click "Promote to Production"

### Cloudflare
1. Pages → Deployments
2. Select previous deployment
3. Click "Rollback"

---

## Next Steps

1. ✅ Configure both Vercel and Cloudflare
2. ✅ Set up environment variables
3. ✅ Verify both deployments are live
4. ✅ Test Gemini API functionality
5. ✅ Monitor error logs
6. Add custom domain (optional)
7. Set up monitoring/alerts

---

## Support

For issues:
- Check Vercel/Cloudflare build logs
- Review environment variables
- Test locally with `npm run dev`
- Check GitHub Issues

**Happy deploying! 🚀**
