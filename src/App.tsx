import { useState } from "react";

/* -----------------------------
   Helper functions
------------------------------ */

function shortAddress(addr: string) {
    if (!addr) return "";
    return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function timeAgo(timestamp: number | null) {
    if (!timestamp) return "Time unknown";

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
    if (!tx) return "";

    const amount = tx.valueEth;
    const from = shortAddress(tx.from);
    const to = shortAddress(tx.to);
    const when = timeAgo(tx.timestamp);

    if (tx.status === "success") {
        return `✅ Transaction successful. Sent ${amount} ETH from ${from} to ${to}. Confirmed ${when}.`;
    }

    if (tx.status === "failed") {
        return `❌ Transaction failed. Attempted to send ${amount} ETH from ${from} to ${to}. ${when}.`;
    }

    return `⏳ Transaction pending. Attempting to send ${amount} ETH from ${from} to ${to}.`;
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

            {/* Search Input */}
            <input
                style={{
                    width: "100%",
                    padding: 10,
                    fontSize: 16,
                }}
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
            {error && (
                <p style={{ color: "red", marginTop: 16 }}>
                    {error}
                </p>
            )}

            {/* Result */}
            {data && (
                <>
                    {/* Human-readable summary */}
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

                    {/* Raw JSON (technical details) */}
                    <pre
                        style={{
                            marginTop: 16,
                            background: "#111",
                            color: "#0f0",
                            padding: 16,
                            borderRadius: 8,
                            fontSize: 14,
                            overflowX: "auto",
                        }}
                    >
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </>
            )}
        </div>
    );
}

export default App;
