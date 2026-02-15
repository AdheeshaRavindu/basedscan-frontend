# Architecture Documentation

## Overview

BasedScan is a serverless blockchain explorer built on Cloudflare's edge infrastructure. The architecture prioritizes simplicity, performance, and cost-efficiency through static frontend hosting and edge-computed API responses.

---

## System Architecture

### High-Level Design

```
┌──────────────────────────────────────────────────────────────┐
│                         End User                              │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ HTTPS (TLS 1.3)
                         ▼
┌──────────────────────────────────────────────────────────────┐
│              Cloudflare Global Network (CDN)                  │
│  ┌────────────────────┐         ┌──────────────────────┐    │
│  │  Static Assets     │         │   Worker Runtime     │    │
│  │  (Cloudflare Pages)│         │  (V8 Isolates)       │    │
│  │                    │         │                      │    │
│  │  - index.html      │         │  - API Endpoints     │    │
│  │  - JavaScript      │         │  - RPC Orchestration │    │
│  │  - CSS             │         │  - Risk Detection    │    │
│  └────────────────────┘         └──────────┬───────────┘    │
└─────────────────────────────────────────────┼───────────────┘
                                              │
                         ┌────────────────────┴────────────────┐
                         │                                     │
                         ▼                                     ▼
              ┌──────────────────┐                  ┌──────────────────┐
              │  Alchemy RPC     │                  │  Environment     │
              │  (Base Mainnet)  │                  │  Secrets         │
              │                  │                  │                  │
              │  - eth_*         │                  │  - API Keys      │
              │  - JSON-RPC 2.0  │                  │  (Encrypted)     │
              └──────────────────┘                  └──────────────────┘
```

---

## Component Details

### 1. Frontend (Cloudflare Pages)

**Technology Stack:**
- React 18.2.0 (UI framework)
- TypeScript 5.2.2 (type safety)
- Vite 5.0.8 (build tool)

**Deployment Model:**
- Static site generation (SSG)
- Global CDN distribution (300+ edge locations)
- Automatic HTTPS with Cloudflare Universal SSL

**Responsibilities:**

| Function | Implementation |
|----------|----------------|
| Input Validation | Regex-based detection of tx hash (64 hex) vs address (40 hex) |
| API Communication | Fetch API with error handling |
| Data Presentation | React components with inline styles |
| State Management | React hooks (`useState`) - no external state library |
| Routing | Single-page app (no routing library) |

**Key Files:**
```
src/
├── App.tsx           # Main component (362 lines)
│   ├── shortAddress()      # Address truncation utility
│   ├── timeAgo()           # Relative timestamp formatter
│   ├── buildSummary()      # Transaction summary renderer
│   ├── buildRisks()        # Risk aggregation logic
│   └── lookup()            # API fetch handler
├── main.tsx          # React entry point
└── vite-env.d.ts     # TypeScript definitions
```

**Build Output:**
```bash
npm run build
# Generates dist/ directory:
# - index.html (minified)
# - assets/*.js (code-split, tree-shaken)
# - assets/*.css (extracted, minified)
```

---

### 2. Backend (Cloudflare Workers)

**Runtime Environment:**
- V8 JavaScript engine (Chrome isolates)
- No Node.js APIs (Web Standards only)
- Cold start: <1ms (vs. 100-500ms for containers)
- Execution limit: 50ms CPU time (free tier)

**API Endpoints:**

| Endpoint | Method | Purpose | RPC Calls |
|----------|--------|---------|-----------|
| `/health` | GET | Health check | 0 |
| `/tx/:hash` | GET | Transaction details | 2 (parallel) |
| `/address/:address` | GET | Address balance | 2 (parallel) |

**Request Flow (Transaction Lookup):**

```javascript
// Pseudocode
async function handleTxRequest(hash) {
  // 1. Validate input
  if (!isValidTxHash(hash)) return 400;
  
  // 2. Parallel RPC calls
  const [txData, receipt] = await Promise.all([
    alchemyRPC('eth_getTransactionByHash', [hash]),
    alchemyRPC('eth_getTransactionReceipt', [hash])
  ]);
  
  // 3. Data transformation
  const valueEth = formatEth(txData.value);
  const gasFeeEth = formatEth(receipt.gasUsed * receipt.effectiveGasPrice);
  
  // 4. Risk detection
  const risks = detectRisks(txData, receipt);
  
  // 5. Return JSON
  return {
    hash, from, to, valueEth, status,
    timestamp, gasUsed, gasFeeEth, risks
  };
}
```

**RPC Communication:**

```javascript
// JSON-RPC 2.0 Request Format
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "eth_getTransactionByHash",
  "params": ["0x..."]
}

// Alchemy Endpoint
POST https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}
Content-Type: application/json
```

**Error Handling Strategy:**

| Error Type | HTTP Status | Response |
|------------|-------------|----------|
| Invalid input | 400 | `{"error": "Invalid transaction hash"}` |
| Not found | 404 | `{"error": "Transaction not found"}` |
| RPC failure | 500 | `{"error": "RPC request failed"}` |
| Timeout | 504 | `{"error": "Request timeout"}` |

---

### 3. External Dependencies

#### Alchemy RPC

**Purpose:** Blockchain data provider for Base Mainnet

**Endpoints Used:**

| RPC Method | Purpose | Response Time (p95) |
|------------|---------|---------------------|
| `eth_getTransactionByHash` | Fetch transaction data | 50-150ms |
| `eth_getTransactionReceipt` | Fetch execution status | 50-150ms |
| `eth_getBalance` | Query ETH balance | 30-100ms |
| `eth_getCode` | Detect contract bytecode | 30-100ms |

**Rate Limits (Free Tier):**
- 300 compute units/second
- 1 compute unit = 1 standard RPC call
- Burst allowance: 600 CU/s for 10 seconds

**Failover Strategy:**
- No automatic failover (single provider)
- Manual fallback: Switch API key in Worker secrets
- Future: Multi-provider support (Alchemy + QuickNode)

---

## Data Flow Diagrams

### Transaction Lookup Flow

```
User Input (0xabc123...)
    │
    ▼
Frontend Validation
    │ (Regex: /^(0x)?[a-f0-9]{64}$/i)
    ▼
API Request
    │ GET /tx/0xabc123...
    ▼
Worker Receives Request
    │
    ├─► eth_getTransactionByHash ──┐
    │                               │
    └─► eth_getTransactionReceipt ─┤
                                    │
                    ┌───────────────┘
                    ▼
            Parallel RPC Responses
                    │
                    ▼
            Data Transformation
                    │
                    ├─► Format ETH values (Wei → ETH)
                    ├─► Calculate gas fee
                    ├─► Detect risks
                    └─► Build JSON response
                    │
                    ▼
            Return to Frontend
                    │
                    ▼
            React Rendering
                    │
                    ├─► buildSummary()
                    ├─► buildRisks()
                    └─► Display UI
```

### Address Lookup Flow

```
User Input (0x1234...)
    │
    ▼
Frontend Validation
    │ (Regex: /^(0x)?[a-f0-9]{40}$/i)
    ▼
API Request
    │ GET /address/0x1234...
    ▼
Worker Receives Request
    │
    ├─► eth_getBalance ──────────┐
    │                             │
    └─► eth_getCode ──────────────┤
                                  │
                  ┌───────────────┘
                  ▼
          Parallel RPC Responses
                  │
                  ▼
          Type Detection
                  │
                  ├─► code.length > 0 ? "contract" : "wallet"
                  └─► Format balance (Wei → ETH)
                  │
                  ▼
          Return JSON
                  │
                  ▼
          Frontend Display
```

---

## Performance Characteristics

### Latency Breakdown (p95)

| Stage | Time | Notes |
|-------|------|-------|
| DNS Resolution | 5-20ms | Cloudflare DNS (1.1.1.1) |
| TLS Handshake | 10-30ms | TLS 1.3 with 0-RTT |
| Worker Cold Start | <1ms | V8 isolate initialization |
| RPC Call (parallel) | 100-200ms | Alchemy Base Mainnet |
| Data Processing | 5-10ms | JSON parsing + transformation |
| Response Transfer | 10-30ms | Gzip compression |
| **Total (end-to-end)** | **130-290ms** | Measured from user's browser |

### Optimization Techniques

1. **Parallel RPC Calls**
   - Before: 200ms (sequential)
   - After: 100ms (parallel)
   - Improvement: 50% reduction

2. **Edge Computing**
   - Traditional server (us-east-1): 150ms latency from Asia
   - Cloudflare Worker: 20-50ms (nearest edge location)
   - Improvement: 70% reduction for global users

3. **Static Asset Caching**
   - Cache-Control: `public, max-age=31536000, immutable`
   - Subsequent page loads: <50ms (cached)

---

## Scalability Considerations

### Current Limits (Free Tier)

| Resource | Limit | Current Usage |
|----------|-------|---------------|
| Worker Requests | 100,000/day | ~500/day |
| Worker CPU Time | 10ms/request | ~5ms/request |
| Pages Bandwidth | 100GB/month | <1GB/month |
| Alchemy RPC | 300 req/sec | <10 req/sec |

### Scaling Strategy

**Phase 1 (0-1,000 users/day):**
- Current architecture sufficient
- No changes needed

**Phase 2 (1,000-10,000 users/day):**
- Upgrade Alchemy to paid tier ($49/month)
- Enable Cloudflare Workers KV for caching
- Implement request deduplication

**Phase 3 (10,000+ users/day):**
- Multi-region RPC providers
- Redis-based caching layer
- Rate limiting per IP address

---

## Security Architecture

### Threat Model

| Threat | Mitigation |
|--------|------------|
| API key exposure | Cloudflare Worker secrets (encrypted at rest) |
| DDoS attacks | Cloudflare DDoS protection (automatic) |
| Malicious RPC responses | Input validation + type checking |
| XSS attacks | React auto-escaping + CSP headers |
| CORS abuse | Strict origin validation |

### Data Flow Security

```
User Browser
    │ (HTTPS only)
    ▼
Cloudflare Edge
    │ (DDoS protection, WAF)
    ▼
Worker Runtime
    │ (Isolated V8 context)
    ├─► Secrets (encrypted)
    └─► RPC (HTTPS + API key)
    │
    ▼
Alchemy RPC
    (TLS 1.3, API key auth)
```

### Secrets Management

**Storage:** Cloudflare Workers Secrets
- Encryption: AES-256-GCM
- Access: Runtime only (not in logs)
- Rotation: Manual via Wrangler CLI

**Best Practices:**
```bash
# Never commit secrets
echo "ALCHEMY_API_KEY=..." >> .env
echo ".env" >> .gitignore

# Use Wrangler for deployment
wrangler secret put ALCHEMY_API_KEY
```

---

## Deployment Architecture

### CI/CD Pipeline

```
GitHub Push (main branch)
    │
    ▼
Cloudflare Pages Build
    │
    ├─► npm install
    ├─► npm run build
    └─► Deploy to edge
    │
    ▼
Automatic Deployment
    │ (300+ locations)
    ▼
Production Live
```

**Build Configuration:**
```toml
# wrangler.toml (Worker)
name = "basedscan-api"
main = "src/index.js"
compatibility_date = "2024-01-01"

[env.production]
vars = { ENVIRONMENT = "production" }
```

**Pages Configuration:**
- Build command: `npm run build`
- Build output: `dist`
- Node version: 18
- Environment: Production

---

## Monitoring & Observability

### Metrics Collected

| Metric | Source | Retention |
|--------|--------|-----------|
| Request count | Cloudflare Analytics | 30 days |
| Error rate | Worker logs | 7 days |
| Response time | Real User Monitoring | 30 days |
| RPC usage | Alchemy dashboard | 90 days |

### Alerting (Future)

- [ ] Worker error rate > 5%
- [ ] RPC rate limit approaching (>80%)
- [ ] Response time p95 > 500ms

---

## Technology Decisions

### Why Cloudflare Workers?

| Alternative | Reason for Rejection |
|-------------|---------------------|
| AWS Lambda | Higher cold start (100-500ms), more complex setup |
| Vercel Functions | Limited free tier, vendor lock-in |
| Traditional VPS | Requires maintenance, single region |
| Heroku | Expensive, slower than edge compute |

**Winner:** Cloudflare Workers
- Sub-millisecond cold starts
- Global edge deployment
- Generous free tier
- Simple deployment (Wrangler CLI)

### Why React (not Vue/Svelte)?

| Framework | Pros | Cons |
|-----------|------|------|
| React | Large ecosystem, TypeScript support | Larger bundle size |
| Vue | Smaller bundle, simpler syntax | Less TypeScript tooling |
| Svelte | Smallest bundle, fastest runtime | Smaller ecosystem |

**Winner:** React
- Team familiarity
- TypeScript integration
- Future component library compatibility

### Why Vite (not Webpack)?

- 10-100x faster dev server (ESM-based)
- Simpler configuration
- Built-in TypeScript support
- Optimized production builds (Rollup)

---

## Future Architecture Enhancements

### Planned Improvements

1. **Caching Layer (Q1 2026)**
   - Cloudflare Workers KV for transaction cache
   - TTL: 1 hour for confirmed transactions
   - Reduces RPC calls by ~60%

2. **WebSocket Support (Q2 2026)**
   - Real-time transaction updates
   - Cloudflare Durable Objects for state
   - Pending transaction monitoring

3. **Multi-Chain Support (Q3 2026)**
   - Abstract RPC layer
   - Chain-specific Workers
   - Unified API interface

4. **GraphQL API (Q4 2026)**
   - Replace REST endpoints
   - Client-side query optimization
   - Reduced over-fetching

---

## Appendix

### Glossary

| Term | Definition |
|------|------------|
| **V8 Isolate** | Lightweight JavaScript runtime context (not a full VM) |
| **Edge Computing** | Running code at CDN locations (near users) |
| **RPC** | Remote Procedure Call (JSON-RPC 2.0 for Ethereum) |
| **Wei** | Smallest ETH unit (1 ETH = 10^18 Wei) |
| **EOA** | Externally Owned Account (wallet with private key) |

### References

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Alchemy API Reference](https://docs.alchemy.com/reference/api-overview)
- [Ethereum JSON-RPC Spec](https://ethereum.org/en/developers/docs/apis/json-rpc/)
- [Base Network Docs](https://docs.base.org/)
