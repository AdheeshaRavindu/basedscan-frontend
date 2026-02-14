import { useState } from "react";

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

function buildSummary(tx: any) {
    const amount = tx.valueEth;
    const from = shortAddress(tx.from);
    const to = shortAddress(tx.to);
    const when = timeAgo(tx.timestamp);

    if (tx.status === "success") {
        return (
            <div>
                <div style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12, color: "#059669" }}>
                    ✅ Transaction successful
                </div>
                <div style={{ fontSize: 20, fontWeight: "bold", marginBottom: 12 }}>
                    {amount} ETH sent
                </div>
                <div style={{ marginBottom: 4 }}>
                    <strong>From:</strong> {from}
                </div>
                <div style={{ marginBottom: 4 }}>
                    <strong>To:</strong> {to}
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
                    Attempted to send {amount} ETH
                </div>
                <div style={{ marginBottom: 4 }}>
                    <strong>From:</strong> {from}
                </div>
                <div style={{ marginBottom: 4 }}>
                    <strong>To:</strong> {to}
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
                Attempting to send {amount} ETH
            </div>
            <div style={{ marginBottom: 4 }}>
                <strong>From:</strong> {from}
            </div>
            <div style={{ marginBottom: 4 }}>
                <strong>To:</strong> {to}
            </div>
        </div>
    );
}

function buildRisks(tx: any) {
    const risks: string[] = [];

    if (tx.status === "failed") {
        risks.push("❌ This transaction failed. No funds were transferred.");
    }

    if (tx.status === "pending") {
        risks.push("⏳ This transaction is still pending and may fail or be replaced.");
    }

    if (tx.valueEth === "0.000000") {
        risks.push(
            "⚠️ Zero ETH transferred. This is often a contract interaction (approvals, swaps, mints)."
        );
    }

    if (tx.to && tx.to !== tx.from) {
        risks.push(
            "⚠️ The recipient may be a smart contract. Interacting with contracts can carry additional risk."
        );
    }

    return risks;
}

/* -----------------------------
   App Component
------------------------------ */

function App() {
    const [hash, setHash] = useState("");
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const lookupTx = async () => {
        setLoading(true);
        setError(null);
        setData(null);

        try {
            const res = await fetch(
                `https://basedscan-api.adheesharavindu001.workers.dev/tx/${hash}`
            );

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Transaction not found");
            }

            const json = await res.json();
            setData(json);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const risks = data ? buildRisks(data) : [];

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
                placeholder="Paste transaction hash"
                value={hash}
                onChange={(e) => setHash(e.target.value)}
            />

            <button
                style={{
                    marginTop: 12,
                    padding: "10px 18px",
                    fontSize: 16,
                    cursor: "pointer",
                }}
                onClick={lookupTx}
                disabled={!hash || loading}
            >
                {loading ? "Loading…" : "Search"}
            </button>

            {/* Error */}
            {error && <p style={{ color: "red", marginTop: 16 }}>{error}</p>}

            {/* Result */}
            {data && (
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
                        {buildSummary(data)}
                    </div>


                    {/* Network Fee */}
                    {data.gasFeeEth !== null && (
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
                            <div style={{ fontSize: 20, fontWeight: "bold", marginBottom: 8 }}>
                                {data.gasFeeEth} ETH
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
                    {risks.length > 0 && (
                        <div
                            style={{
                                marginTop: 16,
                                padding: 16,
                                borderRadius: 8,
                                background: "#fff4e5",
                                border: "1px solid #ffd591",
                            }}
                        >
                            <strong>Risk checks</strong>
                            <ul style={{ marginTop: 8 }}>
                                {risks.map((risk, idx) => (
                                    <li key={idx} style={{ marginBottom: 6 }}>
                                        {risk}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

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
        </div>
    );
}

export default App;
