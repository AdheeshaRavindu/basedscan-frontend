# Security Documentation

## Overview

This document outlines the security architecture, threat model, and best practices for BasedScan. As a read-only blockchain explorer, the primary security concerns are API key protection, DDoS mitigation, and preventing malicious data injection.

---

## Table of Contents

- [Threat Model](#threat-model)
- [Security Architecture](#security-architecture)
- [Secrets Management](#secrets-management)
- [API Security](#api-security)
- [Frontend Security](#frontend-security)
- [Infrastructure Security](#infrastructure-security)
- [Incident Response](#incident-response)
- [Security Checklist](#security-checklist)

---

## Threat Model

### Assets

| Asset | Value | Threat Level |
|-------|-------|--------------|
| Alchemy API Key | High | Critical |
| User Privacy | Medium | Moderate |
| Service Availability | Medium | Moderate |
| Data Integrity | Low | Low (read-only) |

### Threat Actors

| Actor | Motivation | Capability |
|-------|------------|------------|
| Script Kiddies | DDoS, defacement | Low |
| Competitors | Service disruption | Medium |
| Malicious Users | API abuse, data scraping | Medium |
| Nation-State | Surveillance (unlikely) | High |

### Attack Vectors

#### 1. API Key Exposure

**Risk:** Alchemy API key leaked → unauthorized RPC usage → rate limit exhaustion

**Attack Scenarios:**
- Key committed to public GitHub repository
- Key logged in Cloudflare Worker logs
- Key exposed in error messages
- Key extracted from Worker source code

**Impact:** High (service disruption, potential billing charges)

**Mitigation:** See [Secrets Management](#secrets-management)

---

#### 2. DDoS Attacks

**Risk:** Overwhelming API with requests → service unavailable

**Attack Scenarios:**
- HTTP flood (millions of requests/second)
- Slowloris attack (slow HTTP requests)
- Layer 7 attack (valid-looking requests)

**Impact:** Medium (Cloudflare provides automatic mitigation)

**Mitigation:** See [Infrastructure Security](#infrastructure-security)

---

#### 3. Malicious RPC Responses

**Risk:** Alchemy compromised → malicious data injected → users misled

**Attack Scenarios:**
- Man-in-the-middle attack on RPC connection
- Alchemy API compromise (extremely unlikely)
- DNS hijacking

**Impact:** Low (read-only data, no financial transactions)

**Mitigation:**
- HTTPS for all RPC connections (TLS 1.3)
- Input validation on all RPC responses
- Type checking with TypeScript

---

#### 4. Cross-Site Scripting (XSS)

**Risk:** Malicious script injected → user data stolen

**Attack Scenarios:**
- Malicious transaction hash containing `<script>` tags
- Crafted address with JavaScript payload
- Reflected XSS via URL parameters

**Impact:** Low (no user authentication, no sensitive data)

**Mitigation:** See [Frontend Security](#frontend-security)

---

#### 5. API Abuse

**Risk:** Excessive requests → rate limit exhaustion → legitimate users blocked

**Attack Scenarios:**
- Automated scraping of all transactions
- Competitor using API for their service
- Malicious user testing rate limits

**Impact:** Medium (service degradation)

**Mitigation:**
- Rate limiting (future implementation)
- Request deduplication
- IP-based throttling (future)

---

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Cloudflare DDoS Protection                         │
│  - Automatic DDoS mitigation                                 │
│  - WAF (Web Application Firewall)                            │
│  - Bot detection                                             │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ Layer 2: TLS Encryption                                      │
│  - TLS 1.3 only                                              │
│  - Perfect Forward Secrecy                                   │
│  - HSTS enabled                                              │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ Layer 3: Worker Runtime Isolation                           │
│  - V8 isolates (process-level isolation)                    │
│  - No filesystem access                                      │
│  - Limited CPU time (50ms)                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ Layer 4: Input Validation                                    │
│  - Regex validation for addresses/hashes                     │
│  - Type checking (TypeScript)                                │
│  - Sanitization of user input                                │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ Layer 5: Secrets Encryption                                  │
│  - AES-256-GCM for API keys                                  │
│  - Runtime-only access                                       │
│  - No logging of secrets                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Secrets Management

### Alchemy API Key

**Storage:** Cloudflare Workers Secrets

**Encryption:** AES-256-GCM (Cloudflare-managed)

**Access Control:**
- Only accessible at Worker runtime
- Not visible in Cloudflare dashboard after creation
- Not included in Worker logs
- Not returned in API responses

### Setting Secrets Securely

**✅ Correct Method (Wrangler CLI):**

```bash
# Interactive prompt (recommended)
wrangler secret put ALCHEMY_API_KEY
# Paste key when prompted (not visible in terminal)

# Verify (will NOT show the actual value)
wrangler secret list
```

**❌ Incorrect Methods:**

```bash
# NEVER commit to Git
echo "ALCHEMY_API_KEY=sk_..." >> .env
git add .env  # ❌ DANGER

# NEVER pass as command-line argument (visible in shell history)
wrangler secret put ALCHEMY_API_KEY --value sk_...  # ❌ DANGER

# NEVER hardcode in Worker source
const API_KEY = "sk_...";  // ❌ DANGER
```

### Secret Rotation

**Frequency:** Quarterly (every 3 months)

**Process:**

1. Generate new API key in Alchemy dashboard
2. Update Worker secret:
   ```bash
   wrangler secret put ALCHEMY_API_KEY
   # Paste new key
   ```
3. Deploy Worker:
   ```bash
   wrangler deploy
   ```
4. Verify new key works:
   ```bash
   curl https://basedscan-api.adheesharavindu001.workers.dev/health
   ```
5. Delete old key from Alchemy dashboard

**Emergency Rotation (if compromised):**

1. Immediately delete old key from Alchemy
2. Generate new key
3. Update Worker secret (as above)
4. Deploy within 5 minutes

### Detecting Key Leaks

**GitHub Secret Scanning:**

```yaml
# .github/workflows/secret-scan.yml
name: Secret Scan
on: [push]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: trufflesecurity/trufflehog@main
        with:
          path: ./
```

**Manual Checks:**

```bash
# Search for potential leaks in codebase
git grep -i "alchemy"
git grep -i "api.key"
git grep -E "sk_[a-zA-Z0-9]{32}"

# Check Git history for committed secrets
git log -p | grep -i "alchemy"
```

**If Leak Detected:**

1. Rotate key immediately (see above)
2. Remove from Git history:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. Force push (if safe):
   ```bash
   git push origin --force --all
   ```

---

## API Security

### Input Validation

**Transaction Hash Validation:**

```javascript
function isValidTxHash(hash) {
  // Remove 0x prefix if present
  const cleanHash = hash.toLowerCase().replace(/^0x/, '');
  
  // Must be exactly 64 hex characters
  if (cleanHash.length !== 64) return false;
  
  // Must contain only hex characters
  return /^[a-f0-9]{64}$/.test(cleanHash);
}

// Example usage
if (!isValidTxHash(userInput)) {
  return new Response(
    JSON.stringify({ error: 'Invalid transaction hash' }),
    { status: 400 }
  );
}
```

**Address Validation:**

```javascript
function isValidAddress(address) {
  const cleanAddress = address.toLowerCase().replace(/^0x/, '');
  
  if (cleanAddress.length !== 40) return false;
  
  return /^[a-f0-9]{40}$/.test(cleanAddress);
}
```

**Why Validation Matters:**

| Attack | Without Validation | With Validation |
|--------|-------------------|-----------------|
| SQL Injection | N/A (no database) | N/A |
| Command Injection | Possible (if passed to shell) | Blocked |
| Path Traversal | Possible (if used in file paths) | Blocked |
| XSS | Possible (if reflected in HTML) | Blocked |

### Rate Limiting (Future)

**Planned Implementation:**

```javascript
// Cloudflare Workers KV for rate limiting
const RATE_LIMIT = 100; // requests per minute
const WINDOW = 60000; // 1 minute in ms

async function checkRateLimit(ip) {
  const key = `ratelimit:${ip}`;
  const count = await KV.get(key) || 0;
  
  if (count >= RATE_LIMIT) {
    return false; // Rate limit exceeded
  }
  
  await KV.put(key, count + 1, { expirationTtl: 60 });
  return true; // Allow request
}
```

**Response:**

```json
HTTP/1.1 429 Too Many Requests

{
  "error": "Rate limit exceeded. Try again in 60 seconds."
}
```

### CORS Security

**Current Configuration:**

```javascript
// Allow all origins (public API)
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};
```

**Future (Restricted Origins):**

```javascript
const ALLOWED_ORIGINS = [
  'https://basedscan.com',
  'https://www.basedscan.com',
  'http://localhost:5173' // Development
];

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin');
  
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
  }
  
  // Reject unknown origins
  return {};
}
```

---

## Frontend Security

### XSS Prevention

**React Auto-Escaping:**

React automatically escapes all values rendered in JSX:

```tsx
// Safe (React escapes automatically)
<div>{tx.hash}</div>

// Dangerous (bypasses escaping)
<div dangerouslySetInnerHTML={{ __html: tx.hash }} />  // ❌ NEVER USE
```

**Content Security Policy (CSP):**

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline'; 
               connect-src 'self' https://basedscan-api.adheesharavindu001.workers.dev;">
```

**Future (Strict CSP):**

```
Content-Security-Policy: 
  default-src 'none';
  script-src 'self' 'sha256-...';
  style-src 'self' 'sha256-...';
  connect-src https://basedscan-api.adheesharavindu001.workers.dev;
  img-src 'self' data:;
  font-src 'self';
```

### Dependency Security

**Current Dependencies:**

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.2.2",
    "vite": "^5.0.8"
  }
}
```

**Vulnerability Scanning:**

```bash
# Check for known vulnerabilities
npm audit

# Fix automatically (if possible)
npm audit fix

# Manual review of high/critical issues
npm audit --audit-level=high
```

**Automated Scanning (GitHub Actions):**

```yaml
# .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm audit --audit-level=high
```

### Subresource Integrity (SRI)

**For CDN-hosted libraries (if used):**

```html
<!-- Example (not currently used) -->
<script 
  src="https://cdn.example.com/library.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/ux..."
  crossorigin="anonymous">
</script>
```

---

## Infrastructure Security

### Cloudflare DDoS Protection

**Automatic Mitigation:**
- Layer 3/4 attacks (SYN floods, UDP floods)
- Layer 7 attacks (HTTP floods)
- Volumetric attacks (>100 Gbps)

**Configuration:**

```
Security Level: Medium (default)
Challenge Passage: 30 minutes
Browser Integrity Check: Enabled
```

**Custom Rules (Future):**

```javascript
// Block suspicious user agents
if (request.headers.get('User-Agent').includes('bot')) {
  return new Response('Forbidden', { status: 403 });
}

// Block requests without Referer (potential scraping)
if (!request.headers.get('Referer')) {
  return new Response('Forbidden', { status: 403 });
}
```

### HTTPS Enforcement

**TLS Configuration:**
- Minimum version: TLS 1.2
- Recommended: TLS 1.3
- Cipher suites: Modern only (no RC4, no 3DES)

**HSTS Header:**

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Implementation (Worker):**

```javascript
const headers = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block'
};
```

### Worker Isolation

**V8 Isolates:**
- Each request runs in isolated context
- No shared memory between requests
- No filesystem access
- No network access (except fetch API)

**Resource Limits:**
- CPU time: 50ms (free tier), 50 seconds (paid)
- Memory: 128 MB
- Subrequests: 50 per request

---

## Incident Response

### Security Incident Classification

| Severity | Definition | Response Time |
|----------|------------|---------------|
| **Critical** | API key compromised, service down | Immediate (< 1 hour) |
| **High** | DDoS attack, data breach | 4 hours |
| **Medium** | Vulnerability discovered | 24 hours |
| **Low** | Dependency update needed | 1 week |

### Incident Response Plan

#### 1. Detection

**Monitoring:**
- Cloudflare Analytics (request spikes)
- Alchemy Dashboard (RPC usage spikes)
- GitHub Security Alerts (dependency vulnerabilities)

**Alerting (Future):**
- Email alerts for error rate > 10%
- Slack notifications for RPC rate limit approaching
- PagerDuty for critical incidents

#### 2. Containment

**API Key Compromise:**
```bash
# Immediate actions
1. Delete compromised key from Alchemy
2. Generate new key
3. Update Worker secret
4. Deploy new Worker
5. Monitor RPC usage
```

**DDoS Attack:**
```bash
# Cloudflare automatic mitigation usually sufficient
# If not:
1. Enable "I'm Under Attack" mode in Cloudflare
2. Add rate limiting rules
3. Block offending IPs/countries
```

#### 3. Eradication

**Remove Vulnerability:**
```bash
# Update vulnerable dependency
npm update <package>
npm audit fix

# Rebuild and deploy
npm run build
wrangler deploy
```

#### 4. Recovery

**Restore Service:**
```bash
# Verify health
curl https://basedscan-api.adheesharavindu001.workers.dev/health

# Test endpoints
curl https://basedscan-api.adheesharavindu001.workers.dev/tx/0x...

# Monitor logs
wrangler tail
```

#### 5. Post-Incident Review

**Document:**
- What happened
- How it was detected
- How it was resolved
- Lessons learned
- Preventive measures

---

## Security Checklist

### Development

- [ ] Never commit secrets to Git
- [ ] Use `.gitignore` for `.env` files
- [ ] Run `npm audit` before deploying
- [ ] Validate all user input
- [ ] Use TypeScript for type safety
- [ ] Enable strict mode in TypeScript
- [ ] Review dependencies for known vulnerabilities

### Deployment

- [ ] Secrets stored in Cloudflare Workers Secrets
- [ ] HTTPS enforced (no HTTP)
- [ ] HSTS header enabled
- [ ] CSP header configured
- [ ] CORS properly configured
- [ ] Error messages don't leak sensitive info
- [ ] Logging doesn't include secrets

### Monitoring

- [ ] Cloudflare Analytics enabled
- [ ] Alchemy usage monitored
- [ ] GitHub Dependabot enabled
- [ ] Security alerts configured
- [ ] Incident response plan documented

### Maintenance

- [ ] Rotate API keys quarterly
- [ ] Update dependencies monthly
- [ ] Review access logs weekly
- [ ] Test disaster recovery annually

---

## Reporting Security Vulnerabilities

**Contact:** Open a GitHub issue with the `security` label

**Response Time:** 48 hours for acknowledgment

**Disclosure Policy:**
- Responsible disclosure encouraged
- 90-day disclosure timeline
- Credit given to reporters (if desired)

**Do NOT:**
- Publicly disclose before fix is deployed
- Test vulnerabilities on production (use local setup)
- Attempt to access other users' data

---

## Security Resources

### Tools

- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) - Dependency vulnerability scanning
- [Snyk](https://snyk.io/) - Advanced vulnerability detection
- [OWASP ZAP](https://www.zaproxy.org/) - Web application security testing
- [TruffleHog](https://github.com/trufflesecurity/trufflehog) - Secret scanning

### References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Cloudflare Security Docs](https://developers.cloudflare.com/workers/platform/security/)
- [Alchemy Security Best Practices](https://docs.alchemy.com/docs/security-best-practices)

---

## Compliance

### Data Privacy

**No Personal Data Collected:**
- No user accounts
- No cookies
- No tracking
- No analytics (beyond Cloudflare default)

**GDPR Compliance:**
- Not applicable (no personal data)

**CCPA Compliance:**
- Not applicable (no personal data)

### Open Source License

**MIT License:**
- No warranty
- No liability
- Use at your own risk

See [LICENSE](../LICENSE) for full text.
