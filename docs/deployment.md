# Deployment Guide

## Overview

This guide covers deploying BasedScan to production using Cloudflare Pages (frontend) and Cloudflare Workers (backend API).

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Frontend Deployment (Cloudflare Pages)](#frontend-deployment-cloudflare-pages)
- [Backend Deployment (Cloudflare Workers)](#backend-deployment-cloudflare-workers)
- [Environment Configuration](#environment-configuration)
- [Custom Domain Setup](#custom-domain-setup)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Required Accounts

1. **Cloudflare Account**
   - Sign up at [cloudflare.com](https://cloudflare.com)
   - Free tier is sufficient for MVP

2. **Alchemy Account**
   - Sign up at [alchemy.com](https://alchemy.com)
   - Create Base Mainnet app
   - Copy API key

3. **GitHub Account** (for CI/CD)
   - Repository must be public or have Cloudflare access

### Required Tools

```bash
# Node.js 18+
node --version  # Should be v18.0.0 or higher

# npm 9+
npm --version   # Should be 9.0.0 or higher

# Wrangler CLI
npm install -g wrangler
wrangler --version
```

### Repository Setup

```bash
# Clone repository
git clone https://github.com/AdheeshaRavindu/basedscan-frontend.git
cd basedscan-frontend

# Install dependencies
npm install

# Verify build works
npm run build
```

---

## Frontend Deployment (Cloudflare Pages)

### Option 1: GitHub Integration (Recommended)

**Step 1: Push to GitHub**

```bash
# Ensure code is committed
git add .
git commit -m "chore: prepare for deployment"
git push origin main
```

**Step 2: Connect to Cloudflare Pages**

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **Create Application** → **Pages**
3. Click **Connect to Git**
4. Select **GitHub** and authorize Cloudflare
5. Choose repository: `basedscan-frontend`

**Step 3: Configure Build Settings**

```
Project name: basedscan
Production branch: main

Build settings:
  Framework preset: Vite
  Build command: npm run build
  Build output directory: dist
  Root directory: /

Environment variables:
  NODE_VERSION: 18
```

**Step 4: Deploy**

1. Click **Save and Deploy**
2. Wait for build to complete (1-3 minutes)
3. Access deployment at `https://basedscan.pages.dev`

**Step 5: Verify Deployment**

```bash
# Test homepage
curl https://basedscan.pages.dev

# Should return HTML with "BasedScan" title
```

---

### Option 2: Direct Upload (Manual)

**Step 1: Build Locally**

```bash
npm run build
```

**Step 2: Install Wrangler**

```bash
npm install -g wrangler
wrangler login
```

**Step 3: Deploy**

```bash
wrangler pages deploy dist --project-name=basedscan
```

**Output:**
```
✨ Success! Uploaded 5 files (2.34 sec)

✨ Deployment complete! Take a peek over at https://abc123.basedscan.pages.dev
```

**Step 4: Set Production Alias**

```bash
wrangler pages deployment list --project-name=basedscan
# Copy deployment ID

wrangler pages deployment alias set <DEPLOYMENT_ID> production
```

---

## Backend Deployment (Cloudflare Workers)

### Step 1: Create Worker Project

**Option A: New Project**

```bash
# Create new directory
mkdir basedscan-api
cd basedscan-api

# Initialize Worker
wrangler init
# Select: Fetch handler
# TypeScript: No (using JavaScript)
# Git: Yes
```

**Option B: Existing Project**

If you have Worker code from conversation history, create `src/index.js` with the API implementation.

---

### Step 2: Configure Worker

**Create `wrangler.toml`:**

```toml
name = "basedscan-api"
main = "src/index.js"
compatibility_date = "2024-01-01"

# Account details (get from Cloudflare dashboard)
account_id = "YOUR_ACCOUNT_ID"

# Worker settings
workers_dev = true

[env.production]
name = "basedscan-api"
route = "basedscan-api.adheesharavindu001.workers.dev/*"
```

**Get Account ID:**

```bash
wrangler whoami
# Copy Account ID from output
```

---

### Step 3: Add Worker Code

**Create `src/index.js`:**

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };
    
    // Handle OPTIONS (CORS preflight)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Health check
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({ status: 'ok' }),
        { headers: corsHeaders }
      );
    }
    
    // Transaction lookup
    if (url.pathname.startsWith('/tx/')) {
      const hash = url.pathname.split('/tx/')[1];
      // Implementation here (see conversation history)
      return new Response(
        JSON.stringify({ hash, status: 'success' }),
        { headers: corsHeaders }
      );
    }
    
    // Address lookup
    if (url.pathname.startsWith('/address/')) {
      const address = url.pathname.split('/address/')[1];
      // Implementation here (see conversation history)
      return new Response(
        JSON.stringify({ address, balanceEth: '0.000000', type: 'wallet' }),
        { headers: corsHeaders }
      );
    }
    
    // 404
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: corsHeaders }
    );
  }
};
```

---

### Step 4: Set Secrets

**Add Alchemy API Key:**

```bash
wrangler secret put ALCHEMY_API_KEY
# Paste your Alchemy API key when prompted
```

**Verify Secret:**

```bash
wrangler secret list
# Should show: ALCHEMY_API_KEY
```

---

### Step 5: Deploy Worker

```bash
wrangler deploy
```

**Output:**
```
Total Upload: 2.34 KiB / gzip: 1.12 KiB
Uploaded basedscan-api (1.23 sec)
Published basedscan-api (0.45 sec)
  https://basedscan-api.adheesharavindu001.workers.dev
```

---

### Step 6: Test Worker

```bash
# Health check
curl https://basedscan-api.adheesharavindu001.workers.dev/health

# Expected: {"status":"ok"}

# Transaction lookup (use real hash)
curl https://basedscan-api.adheesharavindu001.workers.dev/tx/0xabc123...

# Address lookup (use real address)
curl https://basedscan-api.adheesharavindu001.workers.dev/address/0x1234...
```

---

## Environment Configuration

### Frontend Environment Variables

**Cloudflare Pages:**

1. Dashboard → Pages → basedscan → Settings → Environment Variables
2. Add variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NODE_VERSION` | `18` | Production & Preview |

**Local Development:**

```bash
# .env.local (gitignored)
VITE_API_URL=https://basedscan-api.adheesharavindu001.workers.dev
```

**Update `src/App.tsx`:**

```typescript
const API_URL = import.meta.env.VITE_API_URL || 
  'https://basedscan-api.adheesharavindu001.workers.dev';

const endpoint = `${API_URL}/tx/${cleanInput}`;
```

---

### Worker Environment Variables

**Secrets (Encrypted):**

```bash
# Production
wrangler secret put ALCHEMY_API_KEY

# Staging (if using environments)
wrangler secret put ALCHEMY_API_KEY --env staging
```

**Plain Variables (wrangler.toml):**

```toml
[env.production]
vars = { 
  ENVIRONMENT = "production",
  LOG_LEVEL = "error"
}

[env.staging]
vars = { 
  ENVIRONMENT = "staging",
  LOG_LEVEL = "debug"
}
```

---

## Custom Domain Setup

### Frontend Custom Domain

**Step 1: Add Domain to Cloudflare**

1. Dashboard → Websites → Add Site
2. Enter your domain (e.g., `basedscan.com`)
3. Update nameservers at your registrar

**Step 2: Configure Pages Custom Domain**

1. Pages → basedscan → Custom Domains
2. Click **Set up a custom domain**
3. Enter domain: `basedscan.com`
4. Click **Activate Domain**

**DNS Records (Auto-Created):**

```
Type: CNAME
Name: basedscan.com
Target: basedscan.pages.dev
Proxy: Enabled (orange cloud)
```

**Step 3: Enable HTTPS**

1. SSL/TLS → Overview → Full (strict)
2. Edge Certificates → Always Use HTTPS: On
3. Wait 5-10 minutes for certificate provisioning

---

### Worker Custom Domain

**Step 1: Add Route**

1. Workers & Pages → basedscan-api → Settings → Triggers
2. Click **Add Route**
3. Enter route: `api.basedscan.com/*`
4. Select zone: `basedscan.com`

**Step 2: Create DNS Record**

```
Type: CNAME
Name: api
Target: basedscan-api.adheesharavindu001.workers.dev
Proxy: Enabled
```

**Step 3: Update Frontend**

```typescript
// src/App.tsx
const API_URL = 'https://api.basedscan.com';
```

---

## CI/CD Pipeline

### Automatic Deployments (Cloudflare Pages)

**Trigger:** Push to `main` branch

**Process:**
1. GitHub webhook triggers Cloudflare build
2. Cloudflare runs `npm run build`
3. Deploys to production
4. Updates `basedscan.pages.dev`

**Preview Deployments:**

- Every PR gets a unique preview URL
- Format: `https://abc123.basedscan.pages.dev`
- Automatically deleted when PR is merged

---

### GitHub Actions (Advanced)

**Create `.github/workflows/deploy.yml`:**

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: basedscan
          directory: dist

  deploy-worker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy Worker
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: worker
```

**Setup Secrets:**

1. GitHub → Repository → Settings → Secrets
2. Add secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

---

## Monitoring

### Cloudflare Analytics

**Pages Analytics:**

1. Dashboard → Pages → basedscan → Analytics
2. Metrics available:
   - Requests per second
   - Bandwidth usage
   - Geographic distribution
   - Top pages

**Worker Analytics:**

1. Dashboard → Workers → basedscan-api → Metrics
2. Metrics available:
   - Requests per second
   - CPU time
   - Errors
   - Success rate

---

### Real User Monitoring (RUM)

**Cloudflare Web Analytics (Free):**

1. Dashboard → Analytics → Web Analytics
2. Click **Add a site**
3. Enter domain: `basedscan.com`
4. Copy JavaScript snippet
5. Add to `index.html`:

```html
<!-- Cloudflare Web Analytics -->
<script defer src='https://static.cloudflareinsights.com/beacon.min.js' 
        data-cf-beacon='{"token": "YOUR_TOKEN"}'></script>
```

---

### Logging

**Worker Logs (Development):**

```bash
# Tail logs in real-time
wrangler tail

# Filter by status
wrangler tail --status error

# Filter by method
wrangler tail --method POST
```

**Production Logging:**

```javascript
// src/index.js
export default {
  async fetch(request, env, ctx) {
    const startTime = Date.now();
    
    try {
      const response = await handleRequest(request, env);
      
      // Log successful requests
      console.log({
        method: request.method,
        url: request.url,
        status: response.status,
        duration: Date.now() - startTime
      });
      
      return response;
    } catch (error) {
      // Log errors
      console.error({
        method: request.method,
        url: request.url,
        error: error.message,
        stack: error.stack
      });
      
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500 }
      );
    }
  }
};
```

---

## Troubleshooting

### Common Issues

#### 1. Build Fails on Cloudflare Pages

**Error:** `npm ERR! code ELIFECYCLE`

**Solution:**

```bash
# Test build locally first
npm run build

# Check Node version
node --version  # Must be 18+

# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Fix in Cloudflare:**

1. Pages → Settings → Environment Variables
2. Set `NODE_VERSION = 18`
3. Retry deployment

---

#### 2. Worker Returns 500 Error

**Error:** `{"error": "RPC request failed"}`

**Diagnosis:**

```bash
# Check Worker logs
wrangler tail

# Test RPC connection
curl -X POST https://base-mainnet.g.alchemy.com/v2/YOUR_KEY \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

**Solutions:**

1. **Invalid API Key:**
   ```bash
   wrangler secret put ALCHEMY_API_KEY
   # Re-enter correct key
   ```

2. **Rate Limit Exceeded:**
   - Check Alchemy dashboard for usage
   - Upgrade to paid tier if needed

3. **Network Issue:**
   - Verify Alchemy service status
   - Try different RPC endpoint

---

#### 3. CORS Errors in Browser

**Error:** `Access to fetch at '...' has been blocked by CORS policy`

**Solution:**

Ensure Worker includes CORS headers:

```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

// Handle OPTIONS
if (request.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}

// Add to all responses
return new Response(body, { headers: corsHeaders });
```

---

#### 4. Custom Domain Not Working

**Error:** `DNS_PROBE_FINISHED_NXDOMAIN`

**Diagnosis:**

```bash
# Check DNS propagation
dig basedscan.com

# Check Cloudflare DNS
nslookup basedscan.com 1.1.1.1
```

**Solutions:**

1. **Nameservers Not Updated:**
   - Verify nameservers at registrar match Cloudflare
   - Wait 24-48 hours for propagation

2. **DNS Record Missing:**
   - Add CNAME record in Cloudflare DNS
   - Enable proxy (orange cloud)

3. **SSL Certificate Pending:**
   - Wait 10-15 minutes for certificate issuance
   - Check SSL/TLS → Edge Certificates

---

## Rollback Procedures

### Frontend Rollback

**Cloudflare Pages:**

1. Dashboard → Pages → basedscan → Deployments
2. Find previous working deployment
3. Click **⋮** → **Rollback to this deployment**
4. Confirm rollback

**Time to Rollback:** ~30 seconds

---

### Worker Rollback

**Option 1: Redeploy Previous Version**

```bash
# Checkout previous commit
git log --oneline
git checkout <COMMIT_HASH>

# Redeploy
cd worker
wrangler deploy

# Return to latest
git checkout main
```

**Option 2: Version Management (Future)**

```toml
# wrangler.toml
[env.production]
name = "basedscan-api-v2"

[env.production-v1]
name = "basedscan-api-v1"
```

---

### Emergency Rollback

**If Production is Completely Broken:**

1. **Disable Worker Route:**
   - Dashboard → Workers → basedscan-api → Settings → Triggers
   - Delete route temporarily

2. **Revert Frontend:**
   - Pages → Deployments → Rollback to last known good

3. **Fix Issue:**
   - Debug locally
   - Test thoroughly
   - Redeploy

4. **Re-enable Worker:**
   - Add route back

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests pass locally
- [ ] Build succeeds (`npm run build`)
- [ ] No TypeScript errors
- [ ] Dependencies updated (`npm audit`)
- [ ] Environment variables configured
- [ ] Secrets set in Cloudflare

### Deployment

- [ ] Code pushed to GitHub
- [ ] Cloudflare build succeeds
- [ ] Worker deployed successfully
- [ ] Health check passes
- [ ] Manual smoke tests completed

### Post-Deployment

- [ ] Monitor error rates (first 30 minutes)
- [ ] Check analytics for traffic spikes
- [ ] Verify custom domain works
- [ ] Test key user flows
- [ ] Update documentation if needed

---

## Production URLs

**Frontend:**
- Production: `https://basedscan.pages.dev`
- Custom Domain: `https://basedscan.com` (if configured)

**Backend:**
- Production: `https://basedscan-api.adheesharavindu001.workers.dev`
- Custom Domain: `https://api.basedscan.com` (if configured)

**Health Check:**
```bash
curl https://basedscan-api.adheesharavindu001.workers.dev/health
```

---

## Support

**Deployment Issues:**
- Check [Cloudflare Status](https://www.cloudflarestatus.com/)
- Review [Cloudflare Docs](https://developers.cloudflare.com/)
- Open GitHub issue with `deployment` label

**Emergency Contact:**
- GitHub Issues: [basedscan-frontend/issues](https://github.com/AdheeshaRavindu/basedscan-frontend/issues)
