import { useRef, useState, type ReactNode } from "react";
import "./App.css";

/* -----------------------------
   Helper functions
------------------------------ */

function shortAddress(addr: string) {
    if (!addr) return "";
    return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function timeAgo(timestamp: number | null) {
    if (!timestamp) return "time unknown";

    const now = Date.now();
    const then = timestamp * 1000;
    const diff = Math.floor((now - then) / 1000);

    if (diff < 10) return "just now";
    if (diff < 60) return `${diff} seconds ago`;

    const minutes = Math.floor(diff / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;

    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
}

function buildSummary(tx: any, fromNode: ReactNode, toNode: ReactNode) {
    const when = timeAgo(tx.timestamp);

    if (tx.status === "success") {
        return (
            <div className="summary-body">
                <div className="summary-status success">Transaction successful</div>
                <div className="summary-value">{tx.valueEth || "0"} ETH</div>
                <div className="detail-row"><strong>From:</strong> {fromNode}</div>
                <div className="detail-row"><strong>To:</strong> {toNode}</div>
                <div className="summary-time">Confirmed {when}</div>
            </div>
        );
    }

    if (tx.status === "failed") {
        return (
            <div className="summary-body">
                <div className="summary-status failed">Transaction failed</div>
                <div className="detail-row">Attempted to send {tx.valueEth || "0"} ETH</div>
                <div className="detail-row"><strong>From:</strong> {fromNode}</div>
                <div className="detail-row"><strong>To:</strong> {toNode}</div>
            </div>
        );
    }

    return (
        <div className="summary-body">
            <div className="summary-status pending">Transaction pending</div>
            <div className="detail-row">Attempting to send {tx.valueEth || "0"} ETH</div>
            <div className="detail-row"><strong>From:</strong> {fromNode}</div>
            <div className="detail-row"><strong>To:</strong> {toNode}</div>
        </div>
    );
}

function buildRisks(tx: any) {
    const risks: string[] = [];

    // Status-based risks
    if (tx.status === "failed") {
        risks.push("This transaction failed. No funds were transferred.");
    }

    if (tx.status === "pending") {
        risks.push("This transaction is still pending and may fail or be replaced.");
    }

    // Zero value warning
    if (tx.valueEth === "0.000000") {
        risks.push(
            "Zero ETH transferred. This is often a contract interaction (approvals, swaps, mints)."
        );
    }

    // Add backend-provided risks
    if (tx.risks && Array.isArray(tx.risks)) {
        tx.risks.forEach((risk: string) => {
            risks.push(risk);
        });
    }

    return risks;
}

function formatTransferValue(value: number | string) {
    if (typeof value === "string") return value;
    if (!Number.isFinite(value)) return String(value);

    const absValue = Math.abs(value);
    const fractionDigits = absValue > 0 && absValue < 0.000001 ? 12 : 6;
    const fixed = value.toFixed(fractionDigits);
    return fixed.replace(/\.?0+$/, "");
}

/* -----------------------------
   App Component
------------------------------ */

function App() {
    const [hash, setHash] = useState("");
    const [data, setData] = useState<any>(null);
    const [dataType, setDataType] = useState<"tx" | "address" | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showFullFrom, setShowFullFrom] = useState(false);
    const [showFullTo, setShowFullTo] = useState(false);
    const [copiedFrom, setCopiedFrom] = useState(false);
    const [copiedTo, setCopiedTo] = useState(false);
    const [expandedRecent, setExpandedRecent] = useState<Record<string, boolean>>({});
    const [copiedRecent, setCopiedRecent] = useState<Record<string, boolean>>({});
    const copyTimersRef = useRef<{ from?: number; to?: number; recent?: Record<string, number> }>({
        recent: {}
    });

    const lookup = async () => {
        setLoading(true);
        setError(null);
        setData(null);
        setDataType(null);
        setShowFullFrom(false);
        setShowFullTo(false);
        setCopiedFrom(false);
        setCopiedTo(false);
        setExpandedRecent({});
        setCopiedRecent({});

        if (copyTimersRef.current.from) {
            window.clearTimeout(copyTimersRef.current.from);
        }
        if (copyTimersRef.current.to) {
            window.clearTimeout(copyTimersRef.current.to);
        }
        if (copyTimersRef.current.recent) {
            Object.values(copyTimersRef.current.recent).forEach((timerId) => {
                window.clearTimeout(timerId);
            });
            copyTimersRef.current.recent = {};
        }

        try {
            // Detect if input is address (40 hex chars) or tx hash (64 hex chars)
            const cleanInput = hash.trim().toLowerCase();
            const isAddress = /^(0x)?[a-f0-9]{40}$/i.test(cleanInput);
            const isTxHash = /^(0x)?[a-f0-9]{64}$/i.test(cleanInput);

            let endpoint = "";
            let type: "tx" | "address" | null = null;

            if (isTxHash) {
                endpoint = `https://basedscan-api.adheesharavindu001.workers.dev/tx/${cleanInput}`;
                type = "tx";
            } else if (isAddress) {
                endpoint = `https://basedscan-api.adheesharavindu001.workers.dev/address/${cleanInput}`;
                type = "address";
            } else {
                throw new Error("Invalid input. Please enter a valid transaction hash or address.");
            }

            const res = await fetch(endpoint);

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Not found");
            }

            const json = await res.json();
            setData(json);
            setDataType(type);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const risks = data ? buildRisks(data) : [];

    const copyToClipboard = async (value: string) => {
        if (!value) return;
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(value);
            return;
        }

        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
    };

    const handleFromClick = async () => {
        setShowFullFrom((prev) => !prev);
        if (data?.from) {
            await copyToClipboard(data.from);
            setCopiedFrom(true);
            if (copyTimersRef.current.from) {
                window.clearTimeout(copyTimersRef.current.from);
            }
            copyTimersRef.current.from = window.setTimeout(() => {
                setCopiedFrom(false);
            }, 1500);
        }
    };

    const handleToClick = async () => {
        setShowFullTo((prev) => !prev);
        if (data?.to) {
            await copyToClipboard(data.to);
            setCopiedTo(true);
            if (copyTimersRef.current.to) {
                window.clearTimeout(copyTimersRef.current.to);
            }
            copyTimersRef.current.to = window.setTimeout(() => {
                setCopiedTo(false);
            }, 1500);
        }
    };

    const handleRecentAddressClick = async (key: string, address: string) => {
        setExpandedRecent((prev) => ({ ...prev, [key]: !prev[key] }));
        await copyToClipboard(address);
        setCopiedRecent((prev) => ({ ...prev, [key]: true }));

        if (!copyTimersRef.current.recent) {
            copyTimersRef.current.recent = {};
        }

        if (copyTimersRef.current.recent[key]) {
            window.clearTimeout(copyTimersRef.current.recent[key]);
        }

        copyTimersRef.current.recent[key] = window.setTimeout(() => {
            setCopiedRecent((prev) => ({ ...prev, [key]: false }));
        }, 1500);
    };

    const fromLabel = data?.from
        ? (showFullFrom ? data.from : shortAddress(data.from))
        : "";
    const toLabel = data?.to
        ? (showFullTo ? data.to : shortAddress(data.to))
        : "contract deployment";

    const fromNode = data?.from ? (
        <button
            type="button"
            onClick={handleFromClick}
            className="address-toggle"
            aria-label="Toggle full from address"
            title={showFullFrom ? "Click to collapse and copy" : "Click to expand and copy"}
        >
            {fromLabel}
            {copiedFrom && (
                <span className="copied-tag">
                    Copied!
                </span>
            )}
        </button>
    ) : (
        <span>{fromLabel}</span>
    );

    const toNode = data?.to ? (
        <button
            type="button"
            onClick={handleToClick}
            className="address-toggle"
            aria-label="Toggle full to address"
            title={showFullTo ? "Click to collapse and copy" : "Click to expand and copy"}
        >
            {toLabel}
            {copiedTo && (
                <span className="copied-tag">
                    Copied!
                </span>
            )}
        </button>
    ) : (
        <span>{toLabel}</span>
    );

    const onSearch = () => {
        if (hash && !loading) {
            lookup();
        }
    };

    return (
        <div className="app-shell">
            <div className="ambient-shape ambient-a" aria-hidden="true" />
            <div className="ambient-shape ambient-b" aria-hidden="true" />

            <header className="hero">
                <div className="hero-anchor">
                    <h1>BasedScan</h1>
                    <p className="hero-subtitle">
                        Explore transactions and addresses on Base with a scanner built for fast reading and clear risk visibility.
                    </p>
                </div>
            </header>

            <section className="lookup-zone" aria-label="Search panel">
                <label className="input-label" htmlFor="lookup-input">
                    Transaction hash or address
                </label>
                <div className="lookup-controls">
                    <input
                        id="lookup-input"
                        className="lookup-input"
                        placeholder="Paste 0x transaction hash or wallet address"
                        value={hash}
                        onChange={(e) => setHash(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                onSearch();
                            }
                        }}
                    />
                    <button
                        className="search-button"
                        onClick={onSearch}
                        disabled={!hash || loading}
                    >
                        {loading ? "Loading..." : "Search"}
                    </button>
                </div>
                {error && <p className="error-text">{error}</p>}
            </section>

            <section className="base-facts" aria-label="About Base network">
                <h2>About Base Network</h2>
                <p className="base-facts-lead">
                    Base is an Ethereum Layer 2 built on the OP Stack. It was announced in February 2023 and publicly launched in August 2023.
                </p>
                <div className="base-facts-grid">
                    <article className="fact-card">
                        <h3>Foundation</h3>
                        <p>Incubated by Coinbase and designed to make onchain apps cheaper and faster than Ethereum mainnet.</p>
                    </article>
                    <article className="fact-card">
                        <h3>How it works</h3>
                        <p>As a rollup, Base batches transactions and settles to Ethereum for security.</p>
                    </article>
                    <article className="fact-card">
                        <h3>Why use it</h3>
                        <p>Lower fees, faster confirmations, and EVM compatibility for wallets, DeFi, NFTs, and social apps.</p>
                    </article>
                </div>
            </section>

            <main className="results-layout">
            {dataType === "tx" && data && (
                <>
                    <section className="panel panel-primary">
                        <h2>Transaction Summary</h2>
                        {buildSummary(data, fromNode, toNode)}
                    </section>

                    {data.gasFeeEth && (
                        <section className="panel">
                            <h2>Network Fee</h2>
                            <div className="summary-value fee">{data.gasFeeEth} ETH</div>
                            {data.gasUsed && (
                                <p className="muted-text">Gas used: {data.gasUsed.toLocaleString()}</p>
                            )}
                            <p className="muted-text">
                                This is the amount paid to the network to process this transaction.
                            </p>
                        </section>
                    )}

                    <section className={`panel ${risks.length > 0 ? "risk-panel" : "safe-panel"}`}>
                        <h2>{risks.length > 0 ? "Risk Checks" : "Security"}</h2>
                        {risks.length > 0 ? (
                            <ul className="risk-list">
                                {risks.map((risk, idx) => (
                                    <li key={idx}>{risk}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="safe-text">No known risks detected.</p>
                        )}
                    </section>

                    <details className="panel technical-panel">
                        <summary>Technical details</summary>
                        <pre>{JSON.stringify(data, null, 2)}</pre>
                    </details>
                </>
            )}

            {dataType === "address" && data && (
                <section className="panel panel-primary">
                    <h2>Address Summary</h2>
                    <p className="label">ETH Balance</p>
                    <div className="summary-value">{data.balanceEth} ETH</div>
                    {data.balanceUsd && <p className="muted-text">~ ${data.balanceUsd}</p>}
                    {data.balanceWei && <p className="meta-row">{data.balanceWei} wei</p>}
                    {data.type && (
                        <p className="meta-row">
                            Type: {data.type === "contract" ? "Contract" : "Wallet"}
                            {data.codeBytes !== null && data.codeBytes !== undefined && (
                                <span> | Bytecode: {data.codeBytes} bytes</span>
                            )}
                        </p>
                    )}
                    {data.fetchedAt && <p className="meta-row">Updated {timeAgo(data.fetchedAt)}</p>}

                    <div className="recent-block">
                        <h3>Recent Activity</h3>
                        {Array.isArray(data.recentTransfers) && data.recentTransfers.length > 0 ? (
                            <ul className="recent-list">
                                {data.recentTransfers.map((transfer: any, idx: number) => {
                                    const key = String(transfer.uniqueId || idx);
                                    const direction = transfer.direction === "out" ? "Sent" : "Received";
                                    const counterparty = transfer.direction === "out" ? transfer.to : transfer.from;
                                    const counterpartyLabel = counterparty
                                        ? (expandedRecent[key] ? counterparty : shortAddress(counterparty))
                                        : "unknown";
                                    const assetLabel = transfer.asset || "ETH";

                                    let amountLabel = "";
                                    if (transfer.category === "erc721" || transfer.category === "erc1155") {
                                        const tokenId = transfer.tokenId ? ` #${transfer.tokenId}` : "";
                                        amountLabel = `${assetLabel}${tokenId}`;
                                    } else if (transfer.value !== null && transfer.value !== undefined) {
                                        const valueLabel = formatTransferValue(transfer.value);
                                        amountLabel = `${valueLabel} ${assetLabel}`;
                                    } else {
                                        amountLabel = assetLabel;
                                    }

                                    const when = transfer.timestamp ? timeAgo(transfer.timestamp) : "time unknown";
                                    const actionWord = direction === "Sent" ? "to" : "from";

                                    return (
                                        <li key={key}>
                                            <span className="activity-lead">{direction} {amountLabel} {actionWord}</span>{" "}
                                            {counterparty ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRecentAddressClick(key, counterparty)}
                                                    className="address-toggle"
                                                    aria-label="Toggle full address"
                                                    title={expandedRecent[key]
                                                        ? "Click to collapse and copy"
                                                        : "Click to expand and copy"}
                                                >
                                                    {counterpartyLabel}
                                                    {copiedRecent[key] && <span className="copied-tag">Copied!</span>}
                                                </button>
                                            ) : (
                                                <span>{counterpartyLabel}</span>
                                            )}
                                            <span className="meta-dot"> | {when}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="muted-text">No recent activity found.</p>
                        )}
                    </div>
                </section>
            )}
            </main>

            <footer className="site-footer">
                <p>Made with &hearts; by Adheesha</p>
            </footer>
        </div>
    );
}

export default App;
