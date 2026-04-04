# BasedScan Full Technical Documentation

## 1. Introduction

BasedScan is a lightweight blockchain explorer UI focused on Base network transactions and addresses. It is built as a read-only frontend that calls a public backend API running on Cloudflare Workers.

The product goal is simple:
- Let users paste an address or transaction hash.
- Return understandable insights (status, value, fees, and risk notes).
- Keep the UI fast, minimal, and mobile-friendly.

Live frontend:
- https://basedscan-frontend.pages.dev/

Backend API base URL:
- https://basedscan-api.adheesharavindu001.workers.dev

## 2. Scope and Audience

This documentation is for:
- Developers onboarding to the project
- Maintainers and contributors
- DevOps / deployment owners
- Product and technical writers who need implementation-level details

This documentation covers:
- Frontend architecture and behavior
- API contracts currently consumed by the frontend
- Build and deployment process
- Security and operational concerns
- Known limitations and extension points

## 3. Product Overview

### 3.1 Core User Flows

1. Transaction lookup
- User pastes a transaction hash.
- Frontend validates input using regex.
- Frontend requests GET /tx/:hash from backend API.
- UI renders transaction summary, fee, and risk checks.

2. Address lookup
- User pastes a Base address.
- Frontend validates input using regex.
- Frontend requests GET /address/:address from backend API.
- UI renders balance, type, recent activity, and metadata when available.

### 3.2 Network Context

The app is designed for Base network users and includes educational context:
- Base is an Ethereum Layer 2 (OP Stack)
- Announced in February 2023
- Public launch in August 2023

## 4. Technology Stack

Frontend:
- React 18
- TypeScript 5
- Vite 5

Hosting:
- Cloudflare Pages (static frontend)

Backend (separate deployment):
- Cloudflare Workers
- Alchemy Base Mainnet RPC
- Optional price source: CoinGecko (cached)

## 5. Repository Structure

Top-level structure:

```text
index.html
package.json
README.md
src/
  App.tsx
  App.css
  main.tsx
docs/
  README.md
  full-documentation.md
  architecture.md
  api.md
  deployment.md
  contributing.md
  security.md
  worker-updated.md
```

Important frontend files:
- src/App.tsx: Main UI and interaction logic
- src/App.css: Design system tokens and layout styles
- src/main.tsx: React bootstrapping

## 6. Frontend Architecture

### 6.1 App Component Responsibilities

`src/App.tsx` handles:
- Input state and validation
- API request orchestration
- Data-type branching (`tx` vs `address`)
- Copy-to-clipboard interactions for addresses
- Rendering sections for summary, fees, risk checks, technical details

### 6.2 Helper Functions

`shortAddress(addr)`
- Truncates addresses for readability (`0x1234...abcd`).

`timeAgo(timestamp)`
- Converts Unix timestamp to relative text.

`buildSummary(tx, fromNode, toNode)`
- Produces summary UI based on `status`.

`buildRisks(tx)`
- Adds frontend risk notes for failed/pending/zero-value and appends backend-provided risks.

`formatTransferValue(value)`
- Normalizes transfer values and precision for activity feed.

### 6.3 Input Detection Logic

Regex rules used in UI:
- Address: `^(0x)?[a-f0-9]{40}$`
- Tx hash: `^(0x)?[a-f0-9]{64}$`

Routing behavior:
- Address input -> GET `/address/:address`
- Tx hash input -> GET `/tx/:hash`
- Invalid input -> user-facing error message

### 6.4 UI Sections

- Hero: product identity and Base-focused context
- Lookup panel: input and primary search action
- Base network info section
- Results area:
  - Transaction summary card
  - Network fee card
  - Risk/security card
  - Raw technical JSON card
  - Address summary + recent activity list
- Footer signature

## 7. API Integration Contract

The frontend expects these endpoints.

### 7.1 Health Endpoint

GET `/health`

Response:

```json
{ "status": "ok" }
```

### 7.2 Transaction Endpoint

GET `/tx/:hash`

Expected response shape (fields used by frontend):

```json
{
  "hash": "0x...",
  "from": "0x...",
  "to": "0x... or null",
  "valueEth": "0.123456",
  "gasFeeEth": "0.000021",
  "gasUsed": 21000,
  "status": "success | failed | pending",
  "timestamp": 1700000000,
  "risks": ["..."]
}
```

Frontend behavior notes:
- If `to` is null, UI shows contract deployment.
- If `gasFeeEth` is absent, fee card is hidden.
- `risks` are merged with additional frontend checks.

### 7.3 Address Endpoint

GET `/address/:address`

Expected response shape (fields used by frontend):

```json
{
  "address": "0x...",
  "balanceEth": "12.340000",
  "balanceWei": "12340000000000000000",
  "balanceUsd": "12345.67",
  "type": "wallet | contract",
  "codeBytes": 0,
  "fetchedAt": 1700000000,
  "recentTransfers": [
    {
      "uniqueId": "...",
      "from": "0x...",
      "to": "0x...",
      "value": 0.2,
      "asset": "ETH",
      "category": "external | erc20 | erc721 | erc1155",
      "tokenId": null,
      "timestamp": 1700000000,
      "direction": "in | out"
    }
  ],
  "tokenBalances": [],
  "nftCollections": [],
  "warnings": []
}
```

Frontend behavior notes:
- UI currently renders `recentTransfers` from this payload.
- Token and NFT arrays are currently not displayed in UI but are available for future features.

## 8. Backend Behavior Summary

Based on the current Worker implementation documentation:
- RPC calls are made against Alchemy Base mainnet endpoint.
- Transaction endpoint pulls tx + receipt in parallel.
- Address endpoint pulls balance/code plus transfer/token/NFT metadata.
- ETH/USD pricing uses CoinGecko with short in-memory cache (5 minutes).
- Risk notes include checks such as self-transfer, contract deployment, high gas usage/price.

## 9. State Management and UX Behavior

### 9.1 Primary UI State

`App.tsx` tracks:
- Input and loading state
- Data payload and data type
- Error message
- Address expansion/copy states
- Recent list expansion/copy states

### 9.2 Clipboard UX

Clicking address chips:
- Toggles short/full display
- Copies value to clipboard
- Shows transient "Copied!" confirmation
- Uses timeout cleanup to avoid stale indicators

### 9.3 Error Handling

Frontend catches API and validation failures and shows a concise error message under the search controls.

## 10. Build, Run, and Validate

Requirements:
- Node.js 18+
- npm 9+

Install:

```bash
npm install
```

Development:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

Preview build output:

```bash
npm run preview
```

## 11. Deployment

Frontend deployment target:
- Cloudflare Pages

Build settings:
- Build command: `npm run build`
- Output dir: `dist`

Backend deployment target:
- Cloudflare Workers (separate repo/runtime)

Required secret (backend):
- `ALCHEMY_API_KEY`

Reference detailed deployment steps in:
- docs/deployment.md

## 12. Security Considerations

- Frontend is read-only and performs no private-key operations.
- Input validation is applied before API calls.
- API keys must never be committed to repository.
- Backend should enforce rate limits and strict CORS policy where needed.
- Always use HTTPS endpoints only.

Reference:
- docs/security.md

## 13. Performance Characteristics

Current performance profile:
- Lightweight SPA with small dependency footprint
- Fast static asset delivery through CDN
- API latency dominated by RPC and external metadata providers

Current optimization patterns:
- Parallel backend RPC calls
- In-memory short TTL caching for ETH/USD price
- Conditional rendering to avoid unnecessary heavy DOM sections

## 14. Known Limitations

- Frontend has no route-based pages yet (single-screen app).
- No test suite currently checked into this repository.
- API endpoint URL is hardcoded in frontend (not env-driven).
- Token/NFT sections are fetched by backend but not rendered by UI yet.

## 15. Roadmap Suggestions

Recommended next milestones:
1. Add typed API client and interfaces to remove `any` usage in UI.
2. Move API base URL to environment configuration.
3. Add unit tests for helper functions and integration tests for lookup flow.
4. Add UI sections for token balances and NFT collections.
5. Add observability docs for error-rate and latency dashboards.

## 16. Maintenance Checklist

For each release:
1. Run `npm run build` and verify no TypeScript errors.
2. Verify a known tx hash and known address lookup manually.
3. Validate copy-to-clipboard behavior in desktop and mobile.
4. Verify API endpoint health status.
5. Update docs when payload shape changes.

## 17. Glossary

- EOA: Externally Owned Account (wallet)
- L2: Layer 2 blockchain scaling network
- OP Stack: Open-source rollup framework used by Base
- RPC: Remote Procedure Call endpoint used to query blockchain state
- Tx Hash: Unique identifier for a blockchain transaction

## 18. Versioning Note

This documentation reflects the repository state as of April 2026 and the current implementation in `src/App.tsx`.
