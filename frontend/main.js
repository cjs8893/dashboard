const grid = GridStack.init({
    cellHeight: 150,
    acceptWidgets: true
});

// We will update this address once Render provides our live production link
const BACKEND_API_URL = "http://localhost:8000/api/execute"; 

function loadDemoCredentials() {
    // Live read-only portfolio demonstration db hosted on Neon
    document.getElementById('connString').value = "postgresql://portfolio_user:demo_pass_2026@ep-demo-instance.us-east-1.aws.neon.tech/neondb?sslmode=require";
    document.getElementById('sqlQuery').value = `SELECT rating as label, COUNT(*) as value FROM inventory_sample GROUP BY rating ORDER BY value DESC;`.trim();
}

async function addNewWidget() {
    const connString = document.getElementById('connString').value;
    const sql = document.getElementById('sqlQuery').value;

    if (!connString || !sql) {
        alert("Please provide both a connection string and an SQL query.");
        return;
    }

    try {
        const response = await fetch(BACKEND_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connection_string: connString, sql: sql })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "Failed to execute query.");
        }

        const result = await response.json();
        if (result.records.length === 0) {
            alert("Query executed successfully, but returned 0 rows.");
            return;
        }
        
        const labels = result.records.map(r => r[result.columns[0]] || "Unknown");
        const dataValues = result.records.map(r => Number(r[result.columns[1]] || 0));

        const widgetId = 'widget_' + Date.now();
        const widgetHtml = `
            <div class="grid-stack-item" gs-w="4" gs-h="2">
                <div class="grid-stack-item-content">
                    <div class="widget-title">Dynamic SQL Query Results</div>
                    <div class="chart-container">
                        <canvas id="${widgetId}"></canvas>
                    </div>
                </div>
            </div>
        `;
        
        grid.load([ {w: 4, h: 2, content: widgetHtml} ]);
        
        const ctx = document.getElementById(widgetId).getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: result.columns[1] || 'Metric Value',
                    data: dataValues,
                    backgroundColor: 'rgba(0, 102, 204, 0.6)',
                    borderColor: 'rgba(0, 102, 204, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
            }
        });

    } catch (error) {
        alert("Pipeline Error: " + error.message);
    }
}