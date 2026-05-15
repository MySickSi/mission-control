#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getAllDomains } = require('./domain-manager');

const PORT = 8080;

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Normalize: strip query string so routes match regardless of ?...
    req.url = req.url.split('?')[0];

    // Route: GET /index.html or /dashboard.html
    if ((req.url === '/index.html' || req.url === '/dashboard.html' || req.url === '/dashboard') && req.method === 'GET') {
        const filePath = path.join(__dirname, 'index.html');
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fileContent);
        return;
    }

    // Route: GET /news-dashboard.html or /news
    if ((req.url === '/news-dashboard.html' || req.url === '/news') && req.method === 'GET') {
        const filePath = path.join(__dirname, 'news-dashboard.html');
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fileContent);
        return;
    }

    // Route: GET /cato-logs.html or /cato
    if ((req.url === '/cato-logs.html' || req.url === '/cato') && req.method === 'GET') {
        const filePath = path.join(__dirname, 'cato-logs.html');
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fileContent);
        return;
    }
    // Route: GET /vuln-scan.html or /vuln
    if ((req.url === '/vuln-scan.html' || req.url === '/vuln') && req.method === 'GET') {
        const filePath = path.join(__dirname, 'vuln-scan.html');
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fileContent);
        return;
    }

    // Route: GET /chat.html or /chat
    if ((req.url === '/chat.html' || req.url === '/chat') && req.method === 'GET') {
        const filePath = path.join(__dirname, 'chat.html');
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fileContent);
        return;
    }


    // Route: GET / (tab navigation)
    if (req.url === '/' && req.method === 'GET') {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Mission Control Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
            --bg-primary: #0f172a;
            --accent: #06b6d4;
        }
        body { background: var(--bg-primary); color: #e2e8f0; font-family: sans-serif; }
        .tabs { display: flex; gap: 0; border-bottom: 2px solid var(--accent); }
        .tab-btn {
            padding: 1rem 2rem;
            background: transparent;
            border: none;
            color: #9ca3af;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s;
            border-bottom: 3px solid transparent;
        }
        .tab-btn:hover { color: var(--accent); }
        .tab-btn.active {
            color: var(--accent);
            border-bottom-color: var(--accent);
        }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        iframe { width: 100%; height: calc(100vh - 80px); border: none; }
    </style>
</head>
<body>
    <div class="tabs">
        <button class="tab-btn active" onclick="switchTab(event, 'dashboard')">📊 Dashboard</button>
        <button class="tab-btn" onclick="switchTab(event, 'news')">🔐 Security News</button>
        <button class="tab-btn" onclick="switchTab(event, 'cato')">🛡️ Cato Logs</button>
        <button class="tab-btn" onclick="switchTab(event, 'vuln')">🔍 Vulnerability Scan</button>
        <button class="tab-btn" onclick="switchTab(event, 'chat')">💬 Chat</button>
    </div>
    <div id="dashboard" class="tab-content active"><iframe src="/index.html"></iframe></div>
    <div id="news" class="tab-content"><iframe src="/news-dashboard.html"></iframe></div>
    <div id="cato" class="tab-content"><iframe src="/cato-logs.html"></iframe></div>
    <div id="vuln" class="tab-content"><iframe src="/vuln-scan.html"></iframe></div>
    <div id="chat" class="tab-content"><iframe src="/chat.html"></iframe></div>
    <script>
        function switchTab(e, tab) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
            document.getElementById(tab).classList.add('active');
            e.target.classList.add('active');
        }
    </script>
</body>
</html>
        `;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
    }

    // Route: GET /api/qmd/status (QMD memory metrics)
    if (req.url === '/api/qmd/status' && req.method === 'GET') {
        try {
            const qmdOutput = execSync('qmd status', { encoding: 'utf-8' });
            
            // Parse QMD status output
            const qmdStatus = {
                indexed_documents: qmdOutput.match(/Total:\s+(\d+)/)?.[1] || '0',
                embedded_vectors: qmdOutput.match(/Vectors:\s+(\d+)/)?.[1] || '0',
                index_size: qmdOutput.match(/Size:\s+([\d.]+ [KMG]B)/)?.[1] || 'Unknown',
                collections: qmdOutput.match(/Collection[s]?\s+:\s+(.*)/)?.[1] || 'workspace',
                embedding_model: 'embeddinggemma-300M-GGUF',
                reranking_model: 'Qwen3-Reranker-0.6B-Q8_0-GGUF',
                chunk_languages: 'TypeScript, JavaScript, Python, Go, Rust',
                backend: 'QMD (Quick Markdown Search)',
                timestamp: new Date().toISOString()
            };
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(qmdStatus));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // Route: GET /api/agents (for future dynamic updates)
    if (req.url === '/api/agents' && req.method === 'GET') {
        // Check if news agent data exists
        const newsAgentDir = path.join(path.dirname(__dirname), 'news-agent');
        const articlesFile = path.join(newsAgentDir, 'data', 'articles.json');
        const logFile = path.join(newsAgentDir, 'news-agent.log');
        
        let livyLastRun = 'Never';
        let livyArticles = 0;
        
        if (fs.existsSync(articlesFile)) {
            try {
                const articles = JSON.parse(fs.readFileSync(articlesFile, 'utf-8'));
                livyArticles = articles.length;
                const stat = fs.statSync(articlesFile);
                const lastMod = new Date(stat.mtime);
                const now = new Date();
                const diffMs = now - lastMod;
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.floor(diffHours / 24);
                
                if (diffDays > 0) {
                    livyLastRun = `${diffDays}d ago`;
                } else if (diffHours > 0) {
                    livyLastRun = `${diffHours}h ago`;
                } else {
                    livyLastRun = 'Just now';
                }
            } catch (e) {
                livyLastRun = 'Error';
            }
        }
        
        const agents = [
            {
                name: 'Justinian (Main)',
                role: 'Primary Assistant',
                status: 'good',
                lastHeartbeat: 'Just now',
                tasks: 3
            },
            {
                name: 'Livy',
                role: 'Security & AI News Aggregator',
                status: 'good',
                lastHeartbeat: livyLastRun,
                tasks: livyArticles,
                focus: 'Bleeping Computer, Hacker News, SANS, Reddit r/cybersecurity, ArXiv AI'
            },
            {
                name: 'Cato',
                role: 'Website Security & Health Monitor',
                status: 'good',
                lastHeartbeat: 'Daily at midnight EST',
                tasks: 2,
                focus: 'Shodan, SSL certs, HTTP health, port scanning'
            },
            {
                name: 'Memory System (QMD)',
                role: 'Vector Search & Context Storage',
                status: 'good',
                lastHeartbeat: 'Active',
                tasks: 0,
                focus: 'MEMORY.md indexing, session retention, semantic search'
            }
        ];

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(agents));
        return;
    }

    // Route: GET /api/status (system status)
    if (req.url === '/api/status' && req.method === 'GET') {
        const status = {
            server: 'operational',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage()
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(status));
        return;
    }

    // Route: GET /api/heartbeat (heartbeat configuration and status)
    // Route: GET /api/news
    if (req.url === '/api/news' && req.method === 'GET') {
        try {
            const newsAgentDir = path.join(path.dirname(__dirname), 'news-agent');
            const articlesFile = path.join(newsAgentDir, 'data', 'articles.json');
            
            let articles = [];
            let lastUpdated = null;
            
            if (fs.existsSync(articlesFile)) {
                const data = fs.readFileSync(articlesFile, 'utf-8');
                articles = JSON.parse(data);
                lastUpdated = fs.statSync(articlesFile).mtime.toISOString();
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ articles, lastUpdated }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message, articles: [] }));
        }
        return;
    }

    // Route: GET /api/cato/logs (monitoring logs)
    if (req.url === '/api/cato/logs' && req.method === 'GET') {
        try {
            const catoDir = path.join(path.dirname(__dirname), 'cato');
            const logsFile = path.join(catoDir, 'data', 'monitoring-logs.json');
            
            let logs = [];
            if (fs.existsSync(logsFile)) {
                logs = JSON.parse(fs.readFileSync(logsFile, 'utf-8'));
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ logs, timestamp: new Date().toISOString() }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message, logs: [] }));
        }
        return;
    }
    // Route: GET /api/cato/report (raw ZAP JSON report)
    if (req.url === '/api/cato/report' && req.method === 'GET') {
        try {
            const reportPath = path.join(__dirname, '..', 'cato', 'data', 'zap-report-alienlabs.win.json');
            const data = fs.readFileSync(reportPath, 'utf-8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(data);
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // Route: POST /api/cato/run (manual run)
    if (req.url === '/api/cato/run' && req.method === 'POST') {
        try {
            const catoDir = path.join(path.dirname(__dirname), 'cato');
            const scriptPath = path.join(catoDir, 'cato.js');
            
            const result = execSync(`SHODAN_API_KEY=${process.env.SHODAN_API_KEY || ''} node ${scriptPath}`, {
                encoding: 'utf-8',
                cwd: catoDir,
                timeout: 60000
            });
            const output = JSON.parse(result);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, result: output }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
    }

    // Route: GET /api/domains (domain status)
    if (req.url === '/api/domains' && req.method === 'GET') {
        getAllDomains().then(result => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        }).catch(err => {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
        });
        return;
    }

    // Route: POST /api/news/refresh (manual refresh)
    if (req.url === '/api/news/refresh' && req.method === 'POST') {
        try {
            const newsAgentDir = path.join(path.dirname(__dirname), 'news-agent');
            const scriptPath = path.join(newsAgentDir, 'news-agent.js');
            
            // Run the news agent
            const result = execSync(`node ${scriptPath}`, { encoding: 'utf-8', cwd: newsAgentDir });
            const output = JSON.parse(result);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, result: output }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
    }

    if (req.url === '/api/heartbeat' && req.method === 'GET') {
        const heartbeatConfig = {
            frequency: '55m',
            model: 'anthropic/claude-haiku-4-5',
            caching: {
                enabled: true,
                retention: 'long',
                cacheSystemPrompts: true,
                thresholdTokens: 2048,
                estimatedMonthlySavings: '$99.70 (90% reduction)'
            },
            lastRun: new Date(Date.now() - 5 * 60000).toISOString(), // Mock: 5 min ago
            nextRun: new Date(Date.now() + 50 * 60000).toISOString(), // Mock: in 50 min
            status: 'operational',
            components: [
                {
                    component: 'Justinian (Main)',
                    model: 'anthropic/claude-haiku-4-5',
                    lastHeartbeat: new Date().toISOString(),
                    status: 'good'
                },
                {
                    component: 'Reasoning Engine',
                    model: 'Stream (Disabled)',
                    lastHeartbeat: new Date(Date.now() - 5 * 60000).toISOString(),
                    status: 'good'
                },
                {
                    component: 'Memory System',
                    model: 'MEMORY.md / memory/*.md',
                    lastHeartbeat: new Date().toISOString(),
                    status: 'good'
                },
                {
                    component: 'Skill Executor',
                    model: 'OpenClaw Skills',
                    lastHeartbeat: new Date(Date.now() - 2 * 60000).toISOString(),
                    status: 'good'
                },
                {
                    component: 'Gateway Connection',
                    model: 'Local Embedded',
                    lastHeartbeat: new Date().toISOString(),
                    status: 'good'
                },
                {
                    component: 'Cato (Security Monitor)',
                    model: 'Llama 3.2 3B',
                    lastHeartbeat: new Date().toISOString(),
                    status: 'good'
                },
                {
                    component: 'Prompt Caching (Haiku)',
                    model: 'Cache Retention: Long',
                    lastHeartbeat: new Date().toISOString(),
                    status: 'good'
                }
            ]
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(heartbeatConfig));
        return;
    }

    // Route: POST /api/chat (talk to Justinian via openclaw CLI)
    if (req.url === '/api/chat' && req.method === 'POST') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            let payload;
            try { payload = JSON.parse(body || '{}'); }
            catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'invalid json' }));
                return;
            }
            const message = (payload.message || '').toString();
            const sessionId = (payload.sessionId || '').toString();
            if (!message.trim()) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'message required' }));
                return;
            }
            const { spawn } = require('child_process');
            const args = ['agent', '--agent', 'main', '--message', message, '--json', '--timeout', '120'];
            if (sessionId) { args.push('--session-id', sessionId); }
            const proc = spawn('/home/ubuntu/.npm-global/bin/openclaw', args, {
                env: process.env,
                timeout: 180000
            });
            let stdout = '', stderr = '';
            proc.stdout.on('data', d => stdout += d.toString());
            proc.stderr.on('data', d => stderr += d.toString());
            proc.on('error', err => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'spawn failed: ' + err.message }));
            });
            proc.on('close', () => {
                try {
                    const jsonStart = stdout.indexOf('{');
                    if (jsonStart < 0) throw new Error('no JSON in output');
                    const parsed = JSON.parse(stdout.slice(jsonStart));
                    const meta = (parsed.result && parsed.result.meta) || {};
                    const reply = meta.finalAssistantVisibleText || meta.finalAssistantRawText || '(no reply)';
                    const usedSession = (meta.agentMeta && meta.agentMeta.sessionId) || sessionId;
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ reply, sessionId: usedSession }));
                } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        error: 'parse error: ' + e.message,
                        stderr: stderr.slice(-500),
                        stdout: stdout.slice(-500)
                    }));
                }
            });
        });
        return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Mission Control Server Running`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`📍 Network: http://0.0.0.0:${PORT}`);
    console.log(`🛑 To stop: Press Ctrl+C\n`);
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

server.on('error', (error) => {
    console.error('Server Error:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n✋ Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
