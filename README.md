# Mission Control Dashboard

A self-hosted Node.js dashboard for monitoring AI agents, security feeds, infrastructure health, and domain status. Runs as a systemd service on the Justinian server.

## Features

| Tab | Description |
|-----|-------------|
| Dashboard | Agent status, heartbeat config, QMD memory metrics, domain health |
| Security News | Live feed aggregated by the Livy agent (Bleeping Computer, SANS, HN, ArXiv) |
| Cato Logs | Website security & health monitoring logs (Shodan, SSL, HTTP, port scans) |
| Vulnerability Scan | ZAP scan results viewer |
| Chat | Direct chat interface to Justinian via the OpenClaw CLI |

## Agents

- **Justinian** — Primary assistant (claude-haiku-4-5, heartbeat every 55 min)
- **Livy** — Security & AI news aggregator
- **Cato** — Website security monitor (Shodan, ZAP, SSL checks)
- **Memory System (QMD)** — Vector search and context storage

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Tab navigation shell |
| GET | `/api/status` | Server uptime and memory |
| GET | `/api/agents` | Agent status list |
| GET | `/api/heartbeat` | Heartbeat config and component status |
| GET | `/api/news` | Latest articles from Livy |
| POST | `/api/news/refresh` | Trigger manual news fetch |
| GET | `/api/cato/logs` | Monitoring logs |
| GET | `/api/cato/report` | Raw ZAP JSON report |
| POST | `/api/cato/run` | Trigger manual Cato security scan |
| GET | `/api/domains` | Domain health status |
| GET | `/api/qmd/status` | QMD memory index metrics |
| POST | `/api/chat` | Send a message to Justinian |

## Requirements

- Node.js
- [OpenClaw CLI](https://github.com/MySickSi) installed at `/home/ubuntu/.npm-global/bin/openclaw`
- `qmd` CLI available in PATH (for memory metrics)
- Sibling workspace directories: `../news-agent/`, `../cato/`

## Installation

```bash
# Clone into the OpenClaw workspace
cd ~/.openclaw/workspace
git clone https://github.com/MySickSi/mission-control.git
cd mission-control

# Install systemd service
sudo cp mission-control.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable mission-control
sudo systemctl start mission-control

# Verify
sudo systemctl status mission-control
```

The server listens on `0.0.0.0:8080`.

## Redundancy & Auto-Restart

Three layers of uptime protection — see [REDUNDANCY.md](REDUNDANCY.md) for details:

1. Built-in Node.js error handling (uncaught exceptions exit cleanly)
2. `health-check.sh` runs via cron every minute with 3 retries before auto-restart
3. Systemd `Restart=on-failure` with 5s backoff

Expected recovery time after a crash: ~30–60 seconds.

## Logs

```bash
# Server log
tail -f ~/.openclaw/workspace/mission-control/server.log

# Health check log
tail -f ~/.openclaw/workspace/mission-control/health-check.log

# Systemd journal
journalctl -u mission-control -f
```
