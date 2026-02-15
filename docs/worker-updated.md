// =============================
// ETH PRICE CACHE (5 min)
// =============================
let ethPriceCache = {
    price: null,
    timestamp: 0
};

const PRICE_TTL = 5 * 60 * 1000;

async function getEthPrice() {
    const now = Date.now();

    if (ethPriceCache.price && now - ethPriceCache.timestamp < PRICE_TTL) {
        return ethPriceCache.price;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const res = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
            { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        const data = await res.json();
        const price = data?.ethereum?.usd || null;

        if (price) {
            ethPriceCache = { price, timestamp: now };
        }

        return price;
    } catch {
        return ethPriceCache.price;
    }
}

async function rpcCall(baseRpc, method, params, id) {
    const res = await fetch(baseRpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method,
            params,
            id
        })
    });

    const data = await res.json();
    if (data.error) {
        throw new Error(data.error.message || "RPC error");
    }
    return data.result;
}

async function safeRpcCall(baseRpc, method, params, id) {
    try {
        const result = await rpcCall(baseRpc, method, params, id);
        return { result, error: null };
    } catch (error) {
        return { result: null, error: error?.message || "RPC error" };
    }
}

function formatTokenBalance(balanceHex, decimals) {
    if (!balanceHex) return "0";

    const value = BigInt(balanceHex);
    if (!decimals || decimals === 0) {
        return value.toString();
    }

    const base = 10n ** BigInt(decimals);
    const whole = value / base;
    const fraction = value % base;
    let fractionStr = fraction.toString().padStart(decimals, "0");

    if (decimals > 6) {
        fractionStr = fractionStr.slice(0, 6);
    }

    fractionStr = fractionStr.replace(/0+$/, "");
    return fractionStr ? `${whole}.${fractionStr}` : `${whole}`;
}

// =============================
// RISK DETECTION
// =============================
function calculateRisks(tx, receipt, gasUsed, gasPriceWei) {
    const risks = [];

    if (tx.from && tx.to && tx.from.toLowerCase() === tx.to.toLowerCase()) {
        risks.push("Self transfer");
    }

    if (!tx.to || tx.to === null) {
        risks.push("Contract deployment");
    }

    if (gasUsed && gasUsed > 1000000) {
        risks.push("High gas usage");
    }

    if (gasPriceWei) {
        const gasPriceGwei = Number(BigInt(gasPriceWei)) / 1e9;
        if (gasPriceGwei > 100) {
            risks.push("High gas price");
        }
    }

    return risks;
}

function normalizeTransfer(transfer, direction) {
    const blockNumber = transfer.blockNum ? parseInt(transfer.blockNum, 16) : null;
    const timestamp = transfer.metadata?.blockTimestamp
        ? Math.floor(new Date(transfer.metadata.blockTimestamp).getTime() / 1000)
        : null;

    return {
        uniqueId: transfer.uniqueId,
        hash: transfer.hash,
        from: transfer.from,
        to: transfer.to,
        value: transfer.value,
        asset: transfer.asset,
        category: transfer.category,
        tokenId: transfer.tokenId || null,
        blockNumber,
        timestamp,
        direction
    };
}

const VERIFIED_TOKENS = new Map([
    ["0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", { symbol: "USDC" }]
]);

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Content-Type": "application/json"
        };

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        const BASE_RPC = `https://base-mainnet.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`;

        // =============================
        // HEALTH CHECK
        // =============================
        if (url.pathname === "/health") {
            return new Response(JSON.stringify({ status: "ok" }), {
                headers: corsHeaders
            });
        }

        // =============================
        // TRANSACTION LOOKUP
        // =============================
        const txMatch = url.pathname.match(/^\/tx\/0x([a-fA-F0-9]{64})$/);

        if (txMatch) {
            const hash = "0x" + txMatch[1];

            try {
                const [tx, receipt] = await Promise.all([
                    rpcCall(BASE_RPC, "eth_getTransactionByHash", [hash], 1),
                    rpcCall(BASE_RPC, "eth_getTransactionReceipt", [hash], 2)
                ]);

                if (!tx) {
                    return new Response(
                        JSON.stringify({ error: "Transaction not found" }),
                        { status: 404, headers: corsHeaders }
                    );
                }

                let timestamp = null;
                if (tx.blockNumber) {
                    try {
                        const block = await rpcCall(
                            BASE_RPC,
                            "eth_getBlockByNumber",
                            [tx.blockNumber, false],
                            3
                        );
                        if (block) {
                            timestamp = parseInt(block.timestamp, 16);
                        }
                    } catch {
                        timestamp = null;
                    }
                }

                const valueEthRaw = Number(BigInt(tx.value)) / 1e18;
                const valueEth = valueEthRaw.toFixed(6);

                let gasFeeEth = null;
                let gasUsed = null;
                let gasPriceWei = null;

                if (receipt?.gasUsed) {
                    gasUsed = parseInt(receipt.gasUsed, 16);
                    gasPriceWei = receipt.effectiveGasPrice
                        ? BigInt(receipt.effectiveGasPrice)
                        : tx.gasPrice
                            ? BigInt(tx.gasPrice)
                            : null;

                    if (gasPriceWei) {
                        const gasFeeWei = BigInt(gasUsed) * gasPriceWei;
                        const gasFeeEthRaw = Number(gasFeeWei) / 1e18;
                        gasFeeEth = gasFeeEthRaw
                            .toFixed(10)
                            .replace(/\.?0+$/, "");
                    }
                }

                const risks = calculateRisks(
                    tx,
                    receipt,
                    gasUsed,
                    gasPriceWei ? gasPriceWei.toString() : null
                );

                return new Response(
                    JSON.stringify({
                        hash: tx.hash,
                        from: tx.from,
                        to: tx.to,
                        valueEth,
                        valueUsd: null,
                        gasFeeEth,
                        gasFeeUsd: null,
                        gasUsed,
                        blockNumber: tx.blockNumber ? parseInt(tx.blockNumber, 16) : null,
                        status: receipt?.status === "0x1" ? "success" : "failed",
                        timestamp,
                        risks
                    }),
                    { headers: corsHeaders }
                );
            } catch (error) {
                return new Response(
                    JSON.stringify({
                        error: "Transaction lookup failed",
                        message: error?.message
                    }),
                    { status: 500, headers: corsHeaders }
                );
            }
        }

        // =============================
        // ADDRESS LOOKUP (ENHANCED)
        // =============================
        const addressMatch = url.pathname.match(/^\/address\/0x([a-fA-F0-9]{40})$/);

        if (addressMatch) {
            const address = "0x" + addressMatch[1];

            try {
                const warnings = [];

                const [balanceHex, codeHex] = await Promise.all([
                    rpcCall(BASE_RPC, "eth_getBalance", [address, "latest"], 1),
                    rpcCall(BASE_RPC, "eth_getCode", [address, "latest"], 2)
                ]);

                const [
                    outboundTransfersRes,
                    inboundTransfersRes,
                    tokenBalancesRes,
                    nftDataRes,
                    ethPrice
                ] = await Promise.all([
                    safeRpcCall(
                        BASE_RPC,
                        "alchemy_getAssetTransfers",
                        [{
                            fromBlock: "0x0",
                            toBlock: "latest",
                            fromAddress: address,
                            category: ["external", "erc20", "erc721", "erc1155"],
                            withMetadata: true,
                            excludeZeroValue: true,
                            maxCount: "0x0a",
                            order: "desc"
                        }],
                        3
                    ),
                    safeRpcCall(
                        BASE_RPC,
                        "alchemy_getAssetTransfers",
                        [{
                            fromBlock: "0x0",
                            toBlock: "latest",
                            toAddress: address,
                            category: ["external", "erc20", "erc721", "erc1155"],
                            withMetadata: true,
                            excludeZeroValue: true,
                            maxCount: "0x0a",
                            order: "desc"
                        }],
                        4
                    ),
                    safeRpcCall(BASE_RPC, "alchemy_getTokenBalances", [address], 5),
                    safeRpcCall(
                        BASE_RPC,
                        "alchemy_getNftsForOwner",
                        [{
                            owner: address,
                            withMetadata: false,
                            pageSize: 100,
                            excludeFilters: ["SPAM"]
                        }],
                        6
                    ),
                    getEthPrice()
                ]);

                if (outboundTransfersRes.error) warnings.push("outbound_transfers_unavailable");
                if (inboundTransfersRes.error) warnings.push("inbound_transfers_unavailable");
                if (tokenBalancesRes.error) warnings.push("token_balances_unavailable");
                if (nftDataRes.error) warnings.push("nft_data_unavailable");

                const balanceWei = BigInt(balanceHex || "0x0").toString();
                const balanceEthRaw = Number(BigInt(balanceHex || "0x0")) / 1e18;
                const balanceEth = balanceEthRaw.toFixed(6);
                const balanceUsd = ethPrice ? (balanceEthRaw * ethPrice).toFixed(2) : null;

                const isContract = codeHex && codeHex !== "0x";
                const codeBytes = codeHex && codeHex !== "0x" ? (codeHex.length - 2) / 2 : 0;

                const outgoing = (outboundTransfersRes.result?.transfers || []).map((transfer) =>
                    normalizeTransfer(transfer, "out")
                );
                const incoming = (inboundTransfersRes.result?.transfers || []).map((transfer) =>
                    normalizeTransfer(transfer, "in")
                );

                const recentTransfers = [...outgoing, ...incoming]
                    .sort((a, b) => {
                        const blockDelta = (b.blockNumber || 0) - (a.blockNumber || 0);
                        if (blockDelta !== 0) return blockDelta;
                        return (b.timestamp || 0) - (a.timestamp || 0);
                    })
                    .slice(0, 10);

                const tokenCandidates = (tokenBalancesRes.result?.tokenBalances || [])
                    .filter((token) => {
                        if (!token.tokenBalance || token.tokenBalance === "0x0") return false;
                        const addressKey = token.contractAddress?.toLowerCase();
                        return addressKey ? VERIFIED_TOKENS.has(addressKey) : false;
                    })
                    .slice(0, 20);

                const tokenMetadataList = await Promise.all(
                    tokenCandidates.map((token, idx) =>
                        rpcCall(BASE_RPC, "alchemy_getTokenMetadata", [token.contractAddress], 100 + idx)
                            .then((metadata) => ({ token, metadata }))
                            .catch(() => null)
                    )
                );

                const tokenBalances = tokenMetadataList
                    .filter((entry) => entry && entry.metadata)
                    .map((entry) => {
                        const metadata = entry.metadata;
                        const decimals = Number(metadata.decimals);
                        if (!metadata.name || !metadata.symbol || Number.isNaN(decimals)) {
                            return null;
                        }

                        const verified = VERIFIED_TOKENS.has(entry.token.contractAddress.toLowerCase());
                        if (!verified) return null;

                        return {
                            address: entry.token.contractAddress,
                            name: metadata.name,
                            symbol: metadata.symbol,
                            decimals,
                            logo: metadata.logo || null,
                            balance: formatTokenBalance(entry.token.tokenBalance, decimals)
                        };
                    })
                    .filter(Boolean)
                    .slice(0, 10);

                const nftCollectionsMap = new Map();
                for (const nft of nftDataRes.result?.ownedNfts || []) {
                    if (nft?.spamClassifications && nft.spamClassifications.length > 0) {
                        continue;
                    }

                    const contract = nft.contract || {};
                    const addressKey = contract.address;
                    if (!addressKey) continue;

                    const contractMetadata = nft.contractMetadata || {};
                    const name = contractMetadata.name || contract.name || null;
                    const symbol = contractMetadata.symbol || contract.symbol || null;

                    if (!name || !symbol) {
                        continue;
                    }

                    const current = nftCollectionsMap.get(addressKey) || {
                        address: addressKey,
                        name,
                        symbol,
                        tokenType: contract.tokenType || null,
                        count: 0
                    };

                    const balance = nft.balance ? parseInt(nft.balance, 10) : 1;
                    current.count += Number.isNaN(balance) ? 1 : balance;
                    nftCollectionsMap.set(addressKey, current);
                }

                const nftCollections = Array.from(nftCollectionsMap.values())
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10);

                return new Response(
                    JSON.stringify({
                        address,
                        balanceEth,
                        balanceWei,
                        balanceUsd,
                        type: isContract ? "contract" : "wallet",
                        codeBytes,
                        fetchedAt: Math.floor(Date.now() / 1000),
                        recentTransfers,
                        tokenBalances,
                        nftCollections,
                        warnings,
                        assets: []
                    }),
                    { headers: corsHeaders }
                );
            } catch (error) {
                return new Response(
                    JSON.stringify({
                        error: "Address lookup failed",
                        details: error.message
                    }),
                    { status: 500, headers: corsHeaders }
                );
            }
        }

        return new Response(JSON.stringify({ error: "Not found" }), {
            status: 404,
            headers: corsHeaders
        });
    }
};
```
```