import { useState } from "react";

/* -----------------------------
   Helper functions
------------------------------ */

function shortAddress(addr: string) {
    if (!addr) return "";
    return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function buildSummary(tx: any) {
    if (!tx) return "";

    const amount = tx.valueEth;
    const from = shortAddress(tx.from);
    const to = shortAddress(tx.to);

    if (tx.status === "success") {
        return `✅ Transaction successful. Sent ${amount} ETH from ${from} to ${to}.`;
    }

    if (tx.status === "failed") {
        return `❌ Transaction failed. Attempted to send ${amount} ETH from ${from} to ${to}.`;
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
