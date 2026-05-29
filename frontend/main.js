// 1. Safe Global Settings
const BACKEND_API_URL = "https://universal-sql-api.onrender.com/api/execute";
let grid; 

// 2. Wait until the HTML layout is completely compiled by the browser engine
document.addEventListener("DOMContentLoaded", () => {
    
    // Initialize your visual layout grid safely
    grid = GridStack.init({
        cellHeight: 150,
        acceptWidgets: true
    });

    // Wire up your UI buttons programmatically (Removes the need for inline HTML onclicks)
    const demoBtn = document.getElementById('loadDemoBtn');
    if (demoBtn) demoBtn.addEventListener('click', loadDemoCredentials);

    const runBtn = document.getElementById('runQueryBtn');
    if (runBtn) runBtn.addEventListener('click', addNewWidget);
});

function loadDemoCredentials() {
    const connInput = document.getElementById('connString');
    const queryInput = document.getElementById('sqlQuery');
    
    // ⚠️ CRITICAL FIX: Replace 'demo_pass_2026' with your actual, verified Neon DB password string if it differs!
    if (connInput) connInput.value = "postgresql://portfolio_user:demo_pass_2026@ep-demo-instance.us-east-1.aws.neon.tech/neondb?sslmode=require";
    if (queryInput) queryInput.value = `SELECT rating as label, COUNT(*) as value FROM inventory_sample GROUP BY rating ORDER BY value DESC;`.trim();
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
        
        if (grid) {
            grid.load([ {w: 4, h: 2, content: widgetHtml} ]);
        }
        
        const canvasEl = document.getElementById(widgetId);
        if (!canvasEl) return;
        
        const ctx = canvasEl.getContext('2d');
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