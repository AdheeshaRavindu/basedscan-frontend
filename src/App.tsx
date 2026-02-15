import { useRef, useState, type ReactNode } from "react";

/* -----------------------------
   Helper functions
------------------------------ */

function shortAddress(addr: string) {
    if (!addr) return "";
    return addr.slice(0, 6) + "…" + addr.slice(-4);
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
            <div>
                <div style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12, color: "#059669" }}>
                    ✅ Transaction successful
                </div>
                <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 20, fontWeight: "bold", marginBottom: 2 }}>
                        {tx.valueEth || "0"} ETH
                    </div>
                    {tx.valueUsd && (
                        <div style={{ fontSize: 16, color: "#666" }}>
                            ${tx.valueUsd}
                        </div>
                    )}
                </div>
                <div style={{ marginBottom: 4 }}>
                    <strong>From:</strong> {fromNode}
                </div>
                <div style={{ marginBottom: 4 }}>
                    <strong>To:</strong> {toNode}
                </div>
                <div style={{ fontSize: 14, color: "#666", marginTop: 12 }}>
                    Confirmed {when}
                </div>
            </div>
        );
    }

    if (tx.status === "failed") {
        return (
            <div>
                <div style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12, color: "#dc2626" }}>
                    ❌ Transaction failed
                </div>
                <div style={{ marginBottom: 4 }}>
                    Attempted to send {tx.valueEth || "0"} ETH{tx.valueUsd && ` ($${tx.valueUsd})`}
                </div>
                <div style={{ marginBottom: 4 }}>
                    <strong>From:</strong> {fromNode}
                </div>
                <div style={{ marginBottom: 4 }}>
                    <strong>To:</strong> {toNode}
                </div>
            </div>
        );
    }

    return (
        <div>
            <div style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12, color: "#f59e0b" }}>
                ⏳ Transaction pending
            </div>
            <div style={{ marginBottom: 4 }}>
                Attempting to send {tx.valueEth || "0"} ETH{tx.valueUsd && ` ($${tx.valueUsd})`}
            </div>
            <div style={{ marginBottom: 4 }}>
                <strong>From:</strong> {fromNode}
            </div>
            <div style={{ marginBottom: 4 }}>
                <strong>To:</strong> {toNode}
            </div>
        </div>
    );
}

function buildRisks(tx: any) {
    const risks: string[] = [];

    // Status-based risks
    if (tx.status === "failed") {
        risks.push("❌ This transaction failed. No funds were transferred.");
    }

    if (tx.status === "pending") {
        risks.push("⏳ This transaction is still pending and may fail or be replaced.");
    }

    // Zero value warning
    if (tx.valueEth === "0.000000") {
        risks.push(
            "⚠️ Zero ETH transferred. This is often a contract interaction (approvals, swaps, mints)."
        );
    }

    // Add backend-provided risks
    if (tx.risks && Array.isArray(tx.risks)) {
        tx.risks.forEach((risk: string) => {
            const icon = risk.includes("deployment") ? "🔨" :
                risk.includes("Self") ? "🔄" :
                    risk.includes("High gas") ? "⚠️" : "⚠️";
            risks.push(`${icon} ${risk}`);
        });
    }

    return risks;
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
    const copyTimersRef = useRef<{ from?: number; to?: number }>({});

    const lookup = async () => {
        setLoading(true);
        setError(null);
        setData(null);
        setDataType(null);
        setShowFullFrom(false);
        setShowFullTo(false);
        setCopiedFrom(false);
        setCopiedTo(false);

        if (copyTimersRef.current.from) {
            window.clearTimeout(copyTimersRef.current.from);
        }
        if (copyTimersRef.current.to) {
            window.clearTimeout(copyTimersRef.current.to);
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
            style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "#2563eb",
                cursor: "pointer",
                font: "inherit",
            }}
            aria-label="Toggle full from address"
            title={showFullFrom ? "Click to collapse and copy" : "Click to expand and copy"}
        >
            {fromLabel}
            {copiedFrom && (
                <span style={{ marginLeft: 8, fontSize: 12, color: "#16a34a" }}>
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
            style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "#2563eb",
                cursor: "pointer",
                font: "inherit",
            }}
            aria-label="Toggle full to address"
            title={showFullTo ? "Click to collapse and copy" : "Click to expand and copy"}
        >
            {toLabel}
            {copiedTo && (
                <span style={{ marginLeft: 8, fontSize: 12, color: "#16a34a" }}>
                    Copied!
                </span>
            )}
        </button>
    ) : (
        <span>{toLabel}</span>
    );

    return (
        <div
            style={{
                padding: 40,
                fontFamily: "sans-serif",
                maxWidth: 800,
            }}
        >
            <h1>BasedScan</h1>
            <p>Blockchain transactions, explained simply.</p>

            {/* Search */}
            <input
                style={{ width: "100%", padding: 10, fontSize: 16 }}
                placeholder="Paste transaction hash or address"
                value={hash}
                onChange={(e) => setHash(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && hash && !loading) {
                        lookup();
                    }
                }}
            />

            <button
                style={{
                    marginTop: 12,
                    padding: "10px 18px",
                    fontSize: 16,
                    cursor: "pointer",
                }}
                onClick={lookup}
                disabled={!hash || loading}
            >
                {loading ? "Loading…" : "Search"}
            </button>

            {/* Error */}
            {error && <p style={{ color: "red", marginTop: 16 }}>{error}</p>}

            {/* Result */}
            {dataType === "tx" && data && (
                <>
                    {/* Summary */}
                    <div
                        style={{
                            marginTop: 24,
                            padding: 16,
                            borderRadius: 8,
                            background: "#f5f5f5",
                            fontSize: 16,
                            lineHeight: 1.5,
                        }}
                    >
                        {buildSummary(data, fromNode, toNode)}
                    </div>


                    {/* Network Fee */}
                    {data.gasFeeEth && (
                        <div
                            style={{
                                marginTop: 16,
                                padding: 16,
                                borderRadius: 8,
                                background: "#f5f5f5",
                                fontSize: 16,
                                lineHeight: 1.5,
                            }}
                        >
                            <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 8 }}>
                                Network Fee
                            </div>
                            <div style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: 20, fontWeight: "bold", marginBottom: 2 }}>
                                    {data.gasFeeEth} ETH
                                </div>
                                {data.gasFeeUsd && (
                                    <div style={{ fontSize: 16, color: "#666" }}>
                                        ${data.gasFeeUsd}
                                    </div>
                                )}
                            </div>
                            {data.gasUsed && (
                                <div style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>
                                    Gas used: {data.gasUsed.toLocaleString()}
                                </div>
                            )}
                            <div style={{ fontSize: 14, color: "#666" }}>
                                This is the amount paid to the network to process this transaction.
                            </div>
                        </div>
                    )}

                    {/* Risk checks */}
                    <div
                        style={{
                            marginTop: 16,
                            padding: 16,
                            borderRadius: 8,
                            background: risks.length > 0 ? "#fff4e5" : "#e8f5e9",
                            border: risks.length > 0 ? "1px solid #ffd591" : "1px solid #a5d6a7",
                        }}
                    >
                        <strong>{risks.length > 0 ? "Risk checks" : "✓ Security"}</strong>
                        {risks.length > 0 ? (
                            <ul style={{ marginTop: 8 }}>
                                {risks.map((risk, idx) => (
                                    <li key={idx} style={{ marginBottom: 6 }}>
                                        {risk}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div style={{ marginTop: 8, color: "#2e7d32" }}>
                                No known risks detected
                            </div>
                        )}
                    </div>

                    {/* Technical details (collapsible) */}
                    <details
                        style={{
                            marginTop: 16,
                            padding: 12,
                            borderRadius: 8,
                            background: "#111",
                            color: "#0f0",
                        }}
                    >
                        <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
                            Technical details
                        </summary>
                        <pre
                            style={{
                                marginTop: 12,
                                fontSize: 14,
                                overflowX: "auto",
                            }}
                        >
                            {JSON.stringify(data, null, 2)}
                        </pre>
                    </details>
                </>
            )}


            {/* Address Result */}
            {dataType === "address" && data && (
                <div
                    style={{
                        marginTop: 24,
                        padding: 16,
                        borderRadius: 8,
                        background: "#f5f5f5",
                        fontSize: 16,
                        lineHeight: 1.5,
                    }}
                >
                    <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 8, color: "#666" }}>
                        ETH Balance
                    </div>
                    <div style={{ fontSize: 24, fontWeight: "bold", marginBottom: 8 }}>
                        {data.balanceEth} ETH
                    </div>
                    {data.type && (
                        <div style={{ fontSize: 13, color: "#666", marginTop: 8 }}>
                            Type: {data.type}
                        </div>
                    )}
                </div>
            )}

            {/* Footer */}
            <div
                style={{
                    marginTop: 60,
                    paddingTop: 20,
                    borderTop: "1px solid #e0e0e0",
                    textAlign: "center",
                    fontSize: 14,
                    color: "#666",
                }}
            >
                Made with ❤️ by Adheesha
            </div>
        </div>
    );
}

export default App;
