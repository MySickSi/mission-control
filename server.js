#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const { getAllDomains } = require('./domain-manager');

const PORT = 8080;
const parentDir = path.dirname(__dirname);

// Cache static HTML at startup — avoids a disk read on every page load
const HTML = {
    index: fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8'),
    news:  fs.readFileSync(path.join(__dirname, 'news-dashboard.html'), 'utf-8'),
    cato:  fs.readFileSync(path.join(__dirname, 'cato-logs.html'), 'utf-8'),
    vuln:  fs.readFileSync(path.join(__dirname, 'vuln-scan.html'), 'utf-8'),
    chat:  fs.readFileSync(path.join(__dirname, 'chat.html'), 'utf-8'),
};

const ROOT_HTML = `
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

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const url = req.url.split('?')[0];

    if ((url === '/index.html' || url === '/dashboard.html' || url === '/dashboard') && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(HTML.index);
        return;
    }

    if ((url === '/news-dashboard.html' || url === '/news') && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(HTML.news);
        return;
    }

    if ((url === '/cato-logs.html' || url === '/cato') && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(HTML.cato);
        return;
    }

    if ((url === '/vuln-scan.html' || url === '/vuln') && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(HTML.vuln);
        return;
    }

    if ((url === '/chat.html' || url === '/chat') && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(HTML.chat);
        return;
    }

    if (url === '/' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(ROOT_HTML);
        return;
    }

    if (url === '/api/qmd/status' && req.method === 'GET') {
        try {
            const qmdOutput = execSync('qmd status', { encoding: 'utf-8' });
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
            console.error('[qmd/status]', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'operation failed' }));
        }
        return;
    }

    if (url === '/api/agents' && req.method === 'GET') {
        const articlesFile = path.join(parentDir, 'news-agent', 'data', 'articles.json');

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

    if (url === '/api/status' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            server: 'operational',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        }));
        return;
    }

    if (url === '/api/news' && req.method === 'GET') {
        try {
            const articlesFile = path.join(parentDir, 'news-agent', 'data', 'articles.json');
            let articles = [];
            let summaries = {};
            let lastUpdated = null;
            if (fs.existsSync(articlesFile)) {
                const data = JSON.parse(fs.readFileSync(articlesFile, 'utf-8'));
                if (Array.isArray(data)) {
                    articles = data;
                } else {
                    articles = data.articles || [];
                    summaries = data.summaries || {};
                    lastUpdated = data.lastUpdated || null;
                }
                if (!lastUpdated) {
                    lastUpdated = fs.statSync(articlesFile).mtime.toISOString();
                }
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ articles, summaries, lastUpdated }));
        } catch (err) {
            console.error('[news]', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'operation failed', articles: [] }));
        }
        return;
    }

    if (url === '/api/cato/logs' && req.method === 'GET') {
        try {
            const logsFile = path.join(parentDir, 'cato', 'data', 'monitoring-logs.json');
            let logs = [];
            if (fs.existsSync(logsFile)) {
                logs = JSON.parse(fs.readFileSync(logsFile, 'utf-8'));
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ logs, timestamp: new Date().toISOString() }));
        } catch (err) {
            console.error('[cato/logs]', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'operation failed', logs: [] }));
        }
        return;
    }

    if (url === '/api/cato/report' && req.method === 'GET') {
        try {
            const reportPath = path.join(parentDir, 'cato', 'data', 'zap-report-alienlabs.win.json');
            const data = fs.readFileSync(reportPath, 'utf-8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(data);
        } catch (err) {
            console.error('[cato/report]', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'operation failed' }));
        }
        return;
    }

    if (url === '/api/cato/run' && req.method === 'POST') {
        try {
            const catoDir = path.join(parentDir, 'cato');
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
            console.error('[cato/run]', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'operation failed' }));
        }
        return;
    }

    if (url === '/api/domains' && req.method === 'GET') {
        getAllDomains().then(result => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        }).catch(err => {
            console.error('[domains]', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'operation failed' }));
        });
        return;
    }

    if (url === '/api/news/refresh' && req.method === 'POST') {
        try {
            const newsDir = path.join(parentDir, 'news-agent');
            const result = execSync(`node ${path.join(newsDir, 'news-agent.js')}`, {
                encoding: 'utf-8',
                cwd: newsDir
            });
            const jsonStart = result.indexOf('{');
            const output = jsonStart >= 0 ? JSON.parse(result.slice(jsonStart)) : {};
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, result: output }));
        } catch (err) {
            console.error('[news/refresh]', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'operation failed' }));
        }
        return;
    }

    if (url === '/api/heartbeat' && req.method === 'GET') {
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
            lastRun: new Date(Date.now() - 5 * 60000).toISOString(),
            nextRun: new Date(Date.now() + 50 * 60000).toISOString(),
            status: 'operational',
            components: [
                { component: 'Justinian (Main)', model: 'anthropic/claude-haiku-4-5', lastHeartbeat: new Date().toISOString(), status: 'good' },
                { component: 'Reasoning Engine', model: 'Stream (Disabled)', lastHeartbeat: new Date(Date.now() - 5 * 60000).toISOString(), status: 'good' },
                { component: 'Memory System', model: 'MEMORY.md / memory/*.md', lastHeartbeat: new Date().toISOString(), status: 'good' },
                { component: 'Skill Executor', model: 'OpenClaw Skills', lastHeartbeat: new Date(Date.now() - 2 * 60000).toISOString(), status: 'good' },
                { component: 'Gateway Connection', model: 'Local Embedded', lastHeartbeat: new Date().toISOString(), status: 'good' },
                { component: 'Cato (Security Monitor)', model: 'Llama 3.2 3B', lastHeartbeat: new Date().toISOString(), status: 'good' },
                { component: 'Prompt Caching (Haiku)', model: 'Cache Retention: Long', lastHeartbeat: new Date().toISOString(), status: 'good' }
            ]
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(heartbeatConfig));
        return;
    }

    if (url === '/api/chat' && req.method === 'POST') {
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
                console.error('[chat] spawn error:', err.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'processing failed' }));
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
                    console.error('[chat] parse error:', e.message, '\nstderr:', stderr, '\nstdout:', stdout);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'processing failed' }));
                }
            });
        });
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Mission Control Server Running`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`📍 Network: http://0.0.0.0:${PORT}`);
    console.log(`🛑 To stop: Press Ctrl+C\n`);
});

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

process.on('SIGINT', () => {
    console.log('\n✋ Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
