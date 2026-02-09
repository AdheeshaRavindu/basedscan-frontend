import { useState } from "react";

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
        <div style={{ padding: 40, fontFamily: "sans-serif", maxWidth: 800 }}>
            <h1>BasedScan</h1>
            <p>Blockchain transactions, explained simply.</p>

            <input
                style={{ width: "100%", padding: 8 }}
                placeholder="Paste transaction hash"
                value={hash}
                onChange={(e) => setHash(e.target.value)}
            />

            <button
                style={{ marginTop: 12, padding: "8px 16px" }}
                onClick={lookupTx}
                disabled={!hash || loading}
            >
                {loading ? "Loading…" : "Search"}
            </button>

            {error && <p style={{ color: "red" }}>{error}</p>}

            {data && (
                <pre
                    style={{
                        marginTop: 20,
                        background: "#111",
                        color: "#0f0",
                        padding: 16,
                        borderRadius: 8,
                    }}
                >
                    {JSON.stringify(data, null, 2)}
                </pre>
            )}
        </div>
    );
}

export default App;
