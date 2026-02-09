import { useState, useEffect } from 'react';

interface HealthResponse {
    status: string;
}

function App() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [healthData, setHealthData] = useState<HealthResponse | null>(null);

    useEffect(() => {
        const fetchHealth = async () => {
            try {
                const response = await fetch('https://basedscan-api.adheesharavindu001.workers.dev/health');

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data: HealthResponse = await response.json();
                setHealthData(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch backend status');
            } finally {
                setLoading(false);
            }
        };

        fetchHealth();
    }, []);

    return (
        <div>
            <h1>BasedScan</h1>
            <p>Blockchain transactions, explained simply</p>

            <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
                <h2>Backend Status</h2>

                {loading && <p>Loading backend status...</p>}

                {error && (
                    <p style={{ color: 'red' }}>
                        Error: {error}
                    </p>
                )}

                {healthData && (
                    <p style={{ color: 'green' }}>
                        Status: {healthData.status}
                    </p>
                )}
            </div>
        </div>
    );
}

export default App;
