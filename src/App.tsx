import { useEffect, useState } from "react";

function App() {
    const [status, setStatus] = useState("loading");

    useEffect(() => {
        fetch("https://basedscan-api.adheesharavindu001.workers.dev/health")
            .then((res) => res.json())
            .then(() => setStatus("connected"))
            .catch(() => setStatus("error"));
    }, []);

    return (
        <div style={{ padding: 40 }}>
            <h1>BasedScan</h1>
            <p>Blockchain transactions, explained simply.</p>

            <hr />

            {status === "loading" && <p>Connecting to backend…</p>}
            {status === "connected" && <p style={{ color: "green" }}>Backend connected ✅</p>}
            {status === "error" && <p style={{ color: "red" }}>Backend not reachable ❌</p>}
        </div>
    );
}

export default App;
