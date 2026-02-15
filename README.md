# BasedScan

**A lightweight blockchain transaction explorer for Base Mainnet with human-readable explanations and risk intelligence.**

BasedScan is a minimal, production-ready blockchain explorer that decodes Ethereum transactions on Base Mainnet, providing clear summaries, gas fee calculations, and risk detection—without the complexity of traditional block explorers.

## 🚀 Live Demo

**Try it now:** [https://basedscan-frontend.pages.dev/](https://basedscan-frontend.pages.dev/)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [API Documentation](#api-documentation)
- [Environment Variables](#environment-variables)
- [Setup Guide](#setup-guide)
- [Design Philosophy](#design-philosophy)
- [Security Considerations](#security-considerations)
- [Performance & Optimization](#performance--optimization)
- [Future Roadmap](#future-roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

### What is BasedScan?

BasedScan is a read-only blockchain explorer designed to make Ethereum transactions understandable for non-technical users. It translates raw blockchain data into plain-language summaries and highlights potential risks.

### Core Purpose

- **Transaction Decoding**: Fetch and explain any transaction on Base Mainnet
- **Address Lookup**: Query ETH balances and detect wallet vs. contract addresses
- **Risk Intelligence**: Identify failed transactions, high gas fees, self-transfers, and contract deployments

### Target Use Case

Designed for users who need to verify transactions, understand gas costs, or check wallet balances without navigating complex blockchain explorers. Ideal for educational purposes, wallet verification, and transaction auditing.

### Supported Network

- **Base Mainnet** (Chain ID: 8453)
- RPC provider: Alchemy

---

## Architecture

### High-Level System Design

```
┌─────────────┐
│   Browser   │
│  (React UI) │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────────┐
│ Cloudflare Pages    │
│ (Static Frontend)   │
└─────────────────────┘
       │
       │ API Calls
       ▼
┌─────────────────────┐
│ Cloudflare Workers  │
│ (Backend API)       │
└──────┬──────────────┘
       │
       └──► Alchemy RPC (Base Mainnet)
            - eth_getTransactionByHash
            - eth_getTransactionReceipt
            - eth_getBalance
            - eth_getCode
```

### Component Breakdown

#### Frontend (Cloudflare Pages)
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Deployment**: Cloudflare Pages (static hosting)
- **Responsibilities**:
  - User input validation (transaction hash / address detection)
  - API request orchestration
  - Human-readable transaction summaries
  - Risk visualization
  - Responsive UI rendering

#### Backend (Cloudflare Workers)
- **Runtime**: Cloudflare Workers (V8 isolates)
- **Language**: JavaScript (ES modules)
- **Responsibilities**:
  - RPC request batching and parallelization
  - Gas fee calculation (gasUsed × effectiveGasPrice)
  - Risk detection logic
  - CORS handling

#### External Dependencies

| Service | Purpose | Rate Limits |
|---------|---------|-------------|
| **Alchemy RPC** | Base Mainnet blockchain data | 300 req/sec (free tier) |

### Data Flow

1. **User Input** → Frontend validates format (40-char address or 64-char tx hash)
2. **API Request** → Frontend calls `/tx/:hash` or `/address/:address`
3. **RPC Calls** → Worker makes parallel requests to Alchemy:
   - Transaction data (`eth_getTransactionByHash`)
   - Receipt data (`eth_getTransactionReceipt`)
   - Balance query (`eth_getBalance`)
   - Contract detection (`eth_getCode`)
4. **Risk Analysis** → Worker applies heuristics (failed tx, high gas, self-transfer)
5. **Response** → Structured JSON returned to frontend
6. **Rendering** → Frontend displays human-readable summary

---

## Features

### 1. Transaction Lookup
- **Input**: 64-character transaction hash (with or without `0x` prefix)
- **Output**:
  - Transaction status (success/failed/pending)
  - ETH value transferred
  - Sender and recipient addresses (shortened)
  - Confirmation timestamp (relative time)
  - Gas fee in ETH
  - Gas units consumed

### 2. Gas Fee Calculation
- **Formula**: `gasUsed × effectiveGasPrice`
- **Display**: ETH values
- **Context**: Explains that gas is the network processing fee

### 3. Risk Intelligence System
Automatic detection of:
- ❌ **Failed Transactions**: Status check from receipt
- ⏳ **Pending Transactions**: No receipt available
- ⚠️ **Zero ETH Transfers**: Likely contract interactions (approvals, swaps)
- 🔨 **Contract Deployments**: `to` address is `null`
- 🔄 **Self-Transfers**: `from` === `to`
- ⚠️ **High Gas Fees**: Gas cost > 0.001 ETH

### 4. Address Lookup
- **Input**: 40-character Ethereum address
- **Output**:
  - ETH balance (formatted to 6 decimals)
  - Address type detection:
    - `wallet`: EOA (Externally Owned Account)
    - `contract`: Smart contract (has bytecode)

### 5. Verified Token Filtering
- **Current Status**: Not yet implemented
- **Planned**: Filter ERC-20 transfers to show only verified tokens (e.g., USDC, DAI)
- **Purpose**: Reduce spam token noise in transaction lists

---

## API Documentation

Base URL: `https://basedscan-api.adheesharavindu001.workers.dev`

### Endpoints

#### `GET /health`

Health check endpoint for monitoring.

**Request**
```bash
curl https://basedscan-api.adheesharavindu001.workers.dev/health
```

**Response**
```json
{
  "status": "ok"
}
```

**Status Codes**
- `200 OK`: Service operational

---

#### `GET /tx/:hash`

Retrieve transaction details with risk analysis.

**Parameters**
- `hash` (path): Transaction hash (64 hex characters, `0x` prefix optional)

**Request**
```bash
curl https://basedscan-api.adheesharavindu001.workers.dev/tx/0xabc123...
```

**Response (Success)**
```json
{
  "hash": "0xabc123...",
  "from": "0x1234...",
  "to": "0x5678...",
  "valueEth": "0.500000",
  "status": "success",
  "timestamp": 1707998400,
  "gasUsed": 21000,
  "gasFeeEth": "0.000042",
  "risks": []
}
```

**Response (Failed Transaction)**
```json
{
  "hash": "0xdef456...",
  "from": "0x9abc...",
  "to": "0xdef0...",
  "valueEth": "1.000000",
  "status": "failed",
  "timestamp": 1707998500,
  "gasUsed": 45000,
  "gasFeeEth": "0.000090",
  "risks": [
    "This transaction failed. No funds were transferred."
  ]
}
```

**Error Responses**

| Status | Error | Cause |
|--------|-------|-------|
| `404` | `Transaction not found` | Invalid hash or not on Base Mainnet |
| `400` | `Invalid transaction hash` | Malformed input |
| `500` | `RPC request failed` | Alchemy API error |

**Field Definitions**

| Field | Type | Description |
|-------|------|-------------|
| `hash` | string | Transaction hash |
| `from` | string | Sender address |
| `to` | string | Recipient address (null for contract deployments) |
| `valueEth` | string | ETH transferred (6 decimals) |
| `status` | string | `success`, `failed`, or `pending` |
| `timestamp` | number | Unix timestamp (seconds) |
| `gasUsed` | number | Gas units consumed |
| `gasFeeEth` | string | Total gas cost in ETH |
| `risks` | string[] | Array of risk warnings |

---

#### `GET /address/:address`

Query address balance and type.

**Parameters**
- `address` (path): Ethereum address (40 hex characters, `0x` prefix optional)

**Request**
```bash
curl https://basedscan-api.adheesharavindu001.workers.dev/address/0x1234...
```

**Response**
```json
{
  "address": "0x1234...",
  "balanceEth": "12.345678",
  "type": "wallet"
}
```

**Error Responses**

| Status | Error | Cause |
|--------|-------|-------|
| `400` | `Invalid address` | Malformed input |
| `500` | `RPC request failed` | Alchemy API error |

**Field Definitions**

| Field | Type | Description |
|-------|------|-------------|
| `address` | string | Queried address |
| `balanceEth` | string | ETH balance (6 decimals) |
| `type` | string | `wallet` (EOA) or `contract` |

---

## Environment Variables

### Required Variables

#### `ALCHEMY_API_KEY`
- **Description**: API key for Alchemy RPC access
- **Obtain**: [alchemy.com](https://alchemy.com) (free tier available)
- **Storage**: Configured in Cloudflare Workers environment variables (encrypted at rest)
- **Usage**: Injected into RPC endpoint URL: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`

### Configuration in Cloudflare Workers

**Via Dashboard**:
1. Navigate to Workers & Pages → Your Worker → Settings → Variables
2. Add `ALCHEMY_API_KEY` as an environment variable
3. Mark as "Encrypted" (default)

**Via Wrangler CLI**:
```bash
wrangler secret put ALCHEMY_API_KEY
# Paste your key when prompted
```

---

## Setup Guide

### Prerequisites
- Node.js 18+ and npm
- Cloudflare account (free tier sufficient)
- Alchemy API key

### 1. Clone Repository
```bash
git clone https://github.com/AdheeshaRavindu/basedscan-frontend.git
cd basedscan-frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Frontend Locally
```bash
npm run dev
```
- Access at `http://localhost:5173`
- Frontend will call production API by default

### 4. Deploy Cloudflare Worker (Backend)

**Prerequisites**: Install Wrangler CLI
```bash
npm install -g wrangler
wrangler login
```

**Create Worker** (if not exists):
```bash
wrangler init basedscan-api
# Select "Fetch handler" template
```

**Add Worker Code**:
Create `src/index.js` with your API logic (see conversation history for implementation).

**Configure Environment**:
```bash
wrangler secret put ALCHEMY_API_KEY
```

**Deploy**:
```bash
wrangler deploy
```

**Output**:
```
Published basedscan-api
  https://basedscan-api.your-subdomain.workers.dev
```

### 5. Deploy Cloudflare Pages (Frontend)

**Option A: GitHub Integration (Recommended)**
1. Push code to GitHub
2. Cloudflare Dashboard → Pages → Create Project
3. Connect GitHub repository
4. Build settings:
   - **Build command**: `npm run build`
   - **Build output**: `dist`
5. Deploy

**Option B: Direct Upload**
```bash
npm run build
wrangler pages deploy dist --project-name=basedscan
```

### 6. Update API Endpoint (if needed)

If your Worker URL differs, update `src/App.tsx`:
```typescript
// Line 162 and 165
endpoint = `https://your-worker.workers.dev/tx/${cleanInput}`;
endpoint = `https://your-worker.workers.dev/address/${cleanInput}`;
```

---

## Design Philosophy

### Why Verified Tokens Only?
**Problem**: ERC-20 transfer events include spam tokens (scam airdrops, honeypots).  
**Solution**: Filter to show only tokens from a curated whitelist (USDC, DAI, WETH, etc.).  
**Benefit**: Reduces user confusion and prevents phishing attempts.

### Why Risk Detection Exists?
**Problem**: Users often don't understand why transactions fail or cost unexpectedly high fees.  
**Solution**: Automated heuristics flag common issues (failed status, high gas, self-transfers).  
**Benefit**: Educational value and fraud prevention.



### Performance Considerations
- **Parallel RPC Calls**: Transaction and receipt fetched simultaneously
- **Minimal Dependencies**: No heavy libraries (ethers.js avoided in Worker)
- **Edge Deployment**: Cloudflare Workers run in 300+ global locations (<50ms latency)
- **Static Frontend**: No server-side rendering overhead

---

## Security Considerations

### API Key Handling
- **Storage**: Alchemy key stored as encrypted Cloudflare Worker secret
- **Exposure**: Never logged or returned in API responses
- **Rotation**: Rotate keys quarterly via Alchemy dashboard + Wrangler CLI

### RPC Usage Limits
- **Free Tier**: 300 compute units/second (Alchemy)
- **Mitigation**: No user-controlled RPC calls; all requests validated
- **Monitoring**: Track usage in Alchemy dashboard



### Avoiding Spam Tokens
- **Current**: No token transfer display (ETH-only)
- **Future**: Whitelist-based ERC-20 filtering
- **Risk**: Without filtering, users may see scam token "balances"

---

## Performance & Optimization

### Parallel RPC Calls
```javascript
const [tx, receipt] = await Promise.all([
  fetch(rpcUrl, { method: 'POST', body: txRequest }),
  fetch(rpcUrl, { method: 'POST', body: receiptRequest })
]);
```
**Impact**: 50% faster than sequential calls

### Token Metadata Limiting
- **Current**: No token metadata fetched
- **Future**: Limit to top 100 tokens by market cap
- **Reason**: Prevents DoS via malicious contracts with infinite loops in `name()` calls

---

## Future Roadmap

### Short-Term (Q1 2026)
- [ ] **Contract Age Detection**: Flag newly deployed contracts (<7 days old)
- [ ] **ENS Name Resolution**: Display human-readable names for addresses
- [ ] **USD Price Integration**: Real-time ETH/USD conversion with CoinGecko API

### Medium-Term (Q2 2026)
- [ ] **NFT Support**: Show ERC-721/1155 transfers with metadata
- [ ] **Block Explorer View**: Browse recent blocks and transactions
- [ ] **Transaction Decoding**: Parse contract method calls (e.g., "Swap 100 USDC for ETH")

### Long-Term (Q3+ 2026)
- [ ] **Multi-Chain Support**: Expand to Optimism, Arbitrum, Polygon
- [ ] **Wallet Labeling**: Identify known exchange/protocol addresses
- [ ] **Historical Price Charts**: ETH/USD price at transaction timestamp

---

## Contributing

### Code Structure

```
basedscan-frontend/
├── src/
│   ├── App.tsx          # Main React component
│   ├── main.tsx         # React entry point
│   └── vite-env.d.ts    # TypeScript definitions
├── index.html           # HTML template
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
└── vite.config.ts       # Vite build config
```

### Branching Strategy
- `main`: Production-ready code (auto-deploys to Cloudflare Pages)
- `dev`: Integration branch for features
- `feature/*`: Individual feature branches

### Pull Request Guidelines
1. **Branch Naming**: `feature/short-description` or `fix/issue-number`
2. **Commits**: Use conventional commits (`feat:`, `fix:`, `docs:`)
3. **Testing**: Verify locally with `npm run dev` before submitting
4. **Description**: Explain what changed and why
5. **Screenshots**: Include UI changes (if applicable)

### Development Workflow
```bash
# Create feature branch
git checkout -b feature/add-ens-support

# Make changes
# ...

# Test locally
npm run dev

# Build production bundle
npm run build

# Commit and push
git add .
git commit -m "feat: add ENS name resolution to address lookup"
git push origin feature/add-ens-support

# Open PR on GitHub
```

### Code Style
- **TypeScript**: Strict mode enabled
- **Formatting**: No enforced formatter (use Prettier if preferred)
- **Linting**: No linter configured (ESLint optional)

---

## License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2026 Adheesha

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

See [LICENSE](LICENSE) for full text.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/AdheeshaRavindu/basedscan-frontend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/AdheeshaRavindu/basedscan-frontend/discussions)

---

**Made with ❤️ by Adheesha**