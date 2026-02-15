# API Documentation

## Overview

BasedScan API is a RESTful JSON API for querying Base Mainnet blockchain data. All endpoints return JSON responses and support CORS for browser-based applications.

**Base URL:** `https://basedscan-api.adheesharavindu001.workers.dev`

**Protocol:** HTTPS only  
**Format:** JSON  
**Authentication:** None (public API)

---

## Table of Contents

- [Endpoints](#endpoints)
  - [GET /health](#get-health)
  - [GET /tx/:hash](#get-txhash)
  - [GET /address/:address](#get-addressaddress)
- [Data Types](#data-types)
- [Error Handling](#error-handling)
- [Rate Limits](#rate-limits)
- [Examples](#examples)

---

## Endpoints

### GET /health

Health check endpoint for monitoring and uptime verification.

**URL:** `/health`

**Method:** `GET`

**Authentication:** None

**Parameters:** None

**Success Response:**

```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "ok"
}
```

**Example Request:**

```bash
curl https://basedscan-api.adheesharavindu001.workers.dev/health
```

**Use Cases:**
- Uptime monitoring
- Load balancer health checks
- CI/CD pipeline verification

---

### GET /tx/:hash

Retrieve detailed information about a specific transaction on Base Mainnet.

**URL:** `/tx/:hash`

**Method:** `GET`

**Authentication:** None

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `hash` | string | Yes | Transaction hash (64 hexadecimal characters, with or without `0x` prefix) |

**Valid Hash Formats:**
- `0xabc123...` (with prefix)
- `abc123...` (without prefix)

**Success Response:**

```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "hash": "0x...",
  "from": "0x...",
  "to": "0x...",
  "valueEth": "string",
  "status": "success" | "failed" | "pending",
  "timestamp": number,
  "gasUsed": number,
  "gasFeeEth": "string",
  "risks": string[]
}
```

**Response Fields:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `hash` | string | Transaction hash | `"0xabc123..."` |
| `from` | string | Sender address | `"0x1234..."` |
| `to` | string \| null | Recipient address (null for contract deployments) | `"0x5678..."` |
| `valueEth` | string | ETH transferred (6 decimal places) | `"0.500000"` |
| `status` | string | Transaction status | `"success"`, `"failed"`, or `"pending"` |
| `timestamp` | number | Unix timestamp in seconds (null if pending) | `1707998400` |
| `gasUsed` | number | Gas units consumed | `21000` |
| `gasFeeEth` | string | Total gas cost in ETH (6 decimals) | `"0.000042"` |
| `risks` | string[] | Array of detected risk warnings | `["⚠️ High gas fee"]` |

**Example Request:**

```bash
curl https://basedscan-api.adheesharavindu001.workers.dev/tx/0xabc123...
```

**Example Response (Successful Transaction):**

```json
{
  "hash": "0xabc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc",
  "from": "0x1234567890abcdef1234567890abcdef12345678",
  "to": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  "valueEth": "0.500000",
  "status": "success",
  "timestamp": 1707998400,
  "gasUsed": 21000,
  "gasFeeEth": "0.000042",
  "risks": []
}
```

**Example Response (Failed Transaction):**

```json
{
  "hash": "0xdef4567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "from": "0x9876543210fedcba9876543210fedcba98765432",
  "to": "0xfedcbafedcbafedcbafedcbafedcbafedcbafed",
  "valueEth": "1.000000",
  "status": "failed",
  "timestamp": 1707998500,
  "gasUsed": 45000,
  "gasFeeEth": "0.000090",
  "risks": [
    "❌ This transaction failed. No funds were transferred."
  ]
}
```

**Example Response (Contract Deployment):**

```json
{
  "hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "from": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  "to": null,
  "valueEth": "0.000000",
  "status": "success",
  "timestamp": 1707998600,
  "gasUsed": 1200000,
  "gasFeeEth": "0.002400",
  "risks": [
    "🔨 Contract deployment",
    "⚠️ High gas fee (>0.001 ETH)"
  ]
}
```

**Error Responses:**

| HTTP Status | Error Message | Cause |
|-------------|---------------|-------|
| `400 Bad Request` | `{"error": "Invalid transaction hash"}` | Malformed hash (not 64 hex characters) |
| `404 Not Found` | `{"error": "Transaction not found"}` | Hash not found on Base Mainnet |
| `500 Internal Server Error` | `{"error": "RPC request failed"}` | Alchemy API error or timeout |

**Risk Detection:**

The `risks` array may contain the following warnings:

| Risk | Condition | Icon |
|------|-----------|------|
| Transaction failed | `status === "failed"` | ❌ |
| Transaction pending | `status === "pending"` | ⏳ |
| Zero ETH transfer | `valueEth === "0.000000"` | ⚠️ |
| Contract deployment | `to === null` | 🔨 |
| Self-transfer | `from === to` | 🔄 |
| High gas fee | `gasFeeEth > 0.001` | ⚠️ |

---

### GET /address/:address

Query ETH balance and type (wallet vs. contract) for a given address.

**URL:** `/address/:address`

**Method:** `GET`

**Authentication:** None

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `address` | string | Yes | Ethereum address (40 hexadecimal characters, with or without `0x` prefix) |

**Valid Address Formats:**
- `0x1234567890abcdef1234567890abcdef12345678` (with prefix)
- `1234567890abcdef1234567890abcdef12345678` (without prefix)

**Success Response:**

```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "address": "0x...",
  "balanceEth": "string",
  "type": "wallet" | "contract"
}
```

**Response Fields:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `address` | string | Queried address (normalized with `0x` prefix) | `"0x1234..."` |
| `balanceEth` | string | ETH balance (6 decimal places) | `"12.345678"` |
| `type` | string | Address type: `"wallet"` (EOA) or `"contract"` | `"wallet"` |

**Type Detection Logic:**

```javascript
// Pseudocode
const code = await eth_getCode(address);
const type = code.length > 2 ? "contract" : "wallet";
// "0x" = no bytecode (wallet)
// "0x60806040..." = has bytecode (contract)
```

**Example Request:**

```bash
curl https://basedscan-api.adheesharavindu001.workers.dev/address/0x1234567890abcdef1234567890abcdef12345678
```

**Example Response (Wallet):**

```json
{
  "address": "0x1234567890abcdef1234567890abcdef12345678",
  "balanceEth": "12.345678",
  "type": "wallet"
}
```

**Example Response (Contract):**

```json
{
  "address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  "balanceEth": "0.000000",
  "type": "contract"
}
```

**Error Responses:**

| HTTP Status | Error Message | Cause |
|-------------|---------------|-------|
| `400 Bad Request` | `{"error": "Invalid address"}` | Malformed address (not 40 hex characters) |
| `500 Internal Server Error` | `{"error": "RPC request failed"}` | Alchemy API error or timeout |

---

## Data Types

### Ethereum Address

**Format:** 40 hexadecimal characters (20 bytes)

**Validation Regex:**
```javascript
/^(0x)?[a-f0-9]{40}$/i
```

**Examples:**
- Valid: `0x1234567890abcdef1234567890abcdef12345678`
- Valid: `1234567890ABCDEF1234567890ABCDEF12345678`
- Invalid: `0x123` (too short)
- Invalid: `0xGHIJ...` (non-hex characters)

**Note:** Addresses are case-insensitive but checksummed addresses (EIP-55) are recommended.

---

### Transaction Hash

**Format:** 64 hexadecimal characters (32 bytes)

**Validation Regex:**
```javascript
/^(0x)?[a-f0-9]{64}$/i
```

**Examples:**
- Valid: `0xabc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc`
- Valid: `ABC1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABC`
- Invalid: `0xabc123` (too short)
- Invalid: `0x...XYZ` (non-hex characters)

---

### ETH Amount

**Format:** String with 6 decimal places

**Unit:** ETH (not Wei)

**Conversion:**
```javascript
// Wei to ETH
const eth = (weiValue / 1e18).toFixed(6);

// Example
// 500000000000000000 Wei = "0.500000" ETH
```

**Examples:**
- `"0.000000"` (0 ETH)
- `"0.500000"` (0.5 ETH)
- `"12.345678"` (12.345678 ETH, rounded to 6 decimals)

**Note:** Values are always positive. Negative balances are impossible on Ethereum.

---

### Transaction Status

**Type:** String enum

**Possible Values:**

| Value | Description | Receipt Status |
|-------|-------------|----------------|
| `"success"` | Transaction executed successfully | `status: 1` |
| `"failed"` | Transaction reverted or ran out of gas | `status: 0` |
| `"pending"` | Transaction not yet mined | No receipt |

---

### Unix Timestamp

**Type:** Number (integer)

**Unit:** Seconds since Unix epoch (January 1, 1970 00:00:00 UTC)

**Example:**
```javascript
1707998400 // February 15, 2024 12:00:00 UTC
```

**Conversion to Date:**
```javascript
const date = new Date(timestamp * 1000); // Multiply by 1000 for milliseconds
```

---

## Error Handling

### Error Response Format

All errors return a JSON object with an `error` field:

```json
{
  "error": "Human-readable error message"
}
```

### HTTP Status Codes

| Code | Meaning | When to Expect |
|------|---------|----------------|
| `200 OK` | Success | Valid request with data found |
| `400 Bad Request` | Invalid input | Malformed hash/address |
| `404 Not Found` | Resource not found | Valid hash but not on Base Mainnet |
| `500 Internal Server Error` | Server error | RPC failure, timeout, or unexpected error |
| `504 Gateway Timeout` | Request timeout | RPC took >50 seconds (rare) |

### Common Error Scenarios

**1. Invalid Transaction Hash**

```bash
curl https://basedscan-api.adheesharavindu001.workers.dev/tx/0xinvalid
```

Response:
```json
HTTP/1.1 400 Bad Request

{
  "error": "Invalid transaction hash"
}
```

**2. Transaction Not Found**

```bash
curl https://basedscan-api.adheesharavindu001.workers.dev/tx/0x0000000000000000000000000000000000000000000000000000000000000000
```

Response:
```json
HTTP/1.1 404 Not Found

{
  "error": "Transaction not found"
}
```

**3. RPC Failure**

Response:
```json
HTTP/1.1 500 Internal Server Error

{
  "error": "RPC request failed"
}
```

**Recommended Client Handling:**

```javascript
async function fetchTransaction(hash) {
  try {
    const response = await fetch(`/tx/${hash}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error.message);
    // Show user-friendly error message
  }
}
```

---

## Rate Limits

### Current Limits

**Cloudflare Workers (Free Tier):**
- 100,000 requests per day
- No per-second limit (burst allowed)

**Alchemy RPC (Free Tier):**
- 300 compute units per second
- 1 transaction lookup = 2 compute units

**Effective API Limit:**
- ~150 requests/second (sustained)
- ~600 requests/second (burst, 10 seconds)

### Rate Limit Headers

Currently **not implemented**. Future versions may include:

```
X-RateLimit-Limit: 150
X-RateLimit-Remaining: 142
X-RateLimit-Reset: 1707998460
```

### Best Practices

1. **Implement Client-Side Caching**
   ```javascript
   const cache = new Map();
   const CACHE_TTL = 60000; // 1 minute
   
   async function getCachedTx(hash) {
     if (cache.has(hash)) {
       const { data, timestamp } = cache.get(hash);
       if (Date.now() - timestamp < CACHE_TTL) {
         return data;
       }
     }
     
     const data = await fetchTransaction(hash);
     cache.set(hash, { data, timestamp: Date.now() });
     return data;
   }
   ```

2. **Debounce User Input**
   ```javascript
   const debouncedSearch = debounce(async (hash) => {
     await fetchTransaction(hash);
   }, 500); // Wait 500ms after user stops typing
   ```

3. **Batch Requests (Future)**
   - Not currently supported
   - Planned: `POST /batch` endpoint

---

## Examples

### JavaScript (Fetch API)

```javascript
// Transaction lookup
async function getTransaction(hash) {
  const response = await fetch(
    `https://basedscan-api.adheesharavindu001.workers.dev/tx/${hash}`
  );
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  
  return await response.json();
}

// Usage
const tx = await getTransaction('0xabc123...');
console.log(`Status: ${tx.status}`);
console.log(`Value: ${tx.valueEth} ETH`);
```

### Python (requests)

```python
import requests

def get_transaction(hash):
    url = f"https://basedscan-api.adheesharavindu001.workers.dev/tx/{hash}"
    response = requests.get(url)
    response.raise_for_status()
    return response.json()

# Usage
tx = get_transaction('0xabc123...')
print(f"Status: {tx['status']}")
print(f"Value: {tx['valueEth']} ETH")
```

### cURL

```bash
# Transaction lookup
curl -X GET \
  https://basedscan-api.adheesharavindu001.workers.dev/tx/0xabc123... \
  -H "Accept: application/json"

# Address lookup
curl -X GET \
  https://basedscan-api.adheesharavindu001.workers.dev/address/0x1234... \
  -H "Accept: application/json"

# Health check
curl https://basedscan-api.adheesharavindu001.workers.dev/health
```

### TypeScript (with Types)

```typescript
interface Transaction {
  hash: string;
  from: string;
  to: string | null;
  valueEth: string;
  status: 'success' | 'failed' | 'pending';
  timestamp: number | null;
  gasUsed: number;
  gasFeeEth: string;
  risks: string[];
}

interface Address {
  address: string;
  balanceEth: string;
  type: 'wallet' | 'contract';
}

async function getTransaction(hash: string): Promise<Transaction> {
  const response = await fetch(
    `https://basedscan-api.adheesharavindu001.workers.dev/tx/${hash}`
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return await response.json();
}

async function getAddress(address: string): Promise<Address> {
  const response = await fetch(
    `https://basedscan-api.adheesharavindu001.workers.dev/address/${address}`
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return await response.json();
}
```

---

## CORS Configuration

### Allowed Origins

Currently: `*` (all origins)

**Headers:**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### Preflight Requests

The API handles `OPTIONS` requests for CORS preflight:

```bash
curl -X OPTIONS \
  https://basedscan-api.adheesharavindu001.workers.dev/tx/0xabc123... \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: GET"
```

Response:
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

---

## Versioning

### Current Version

**Version:** v1 (implicit)

**URL Format:** No version prefix (e.g., `/tx/:hash`, not `/v1/tx/:hash`)

### Future Versioning Strategy

When breaking changes are introduced:

- v1: `https://basedscan-api.adheesharavindu001.workers.dev/tx/:hash`
- v2: `https://basedscan-api.adheesharavindu001.workers.dev/v2/tx/:hash`

**Deprecation Policy:**
- 6 months notice before deprecation
- 12 months support for legacy versions

---

## Changelog

### v1.0.0 (Current)

**Released:** February 2026

**Endpoints:**
- `GET /health` - Health check
- `GET /tx/:hash` - Transaction lookup
- `GET /address/:address` - Address lookup

**Features:**
- Transaction status detection
- Gas fee calculation
- Risk intelligence
- Address type detection (wallet vs. contract)

---

## Support

**Issues:** [GitHub Issues](https://github.com/AdheeshaRavindu/basedscan-frontend/issues)

**API Status:** No status page (planned for future)

**Contact:** Open a GitHub issue for API-related questions
