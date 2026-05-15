# Mission Control - Redundancy & Auto-Restart

## Overview

The Mission Control dashboard now has multiple layers of protection to ensure it stays online:

1. **Built-in Error Handling** — Server catches uncaught exceptions and unhandled rejections
2. **Health Check Monitor** — Cron job runs every minute to verify server health
3. **Automatic Restart** — If the server goes down, it auto-restarts with retry logic
4. **Systemd Service** (optional) — For production use on systemd-based systems

---

## How It Works

### Layer 1: Server Resilience
The Node.js server now handles:
- Uncaught exceptions → Exit cleanly so cron can restart
- Unhandled promise rejections → Exit cleanly
- Server errors → Exit cleanly and restart

### Layer 2: Health Check Monitor
**File:** `health-check.sh`
**Runs:** Every minute via crontab
**Logic:**
1. Attempts to connect to `http://localhost:8080`
2. Retries up to 3 times with 5-second delays
3. If all retries fail, kills the old process and starts a new one
4. Logs all activity to `health-check.log`

### Layer 3: Systemd Service (Optional)
For a more robust setup on systemd systems, you can install the service:

```bash
sudo cp /home/ubuntu/.openclaw/workspace/mission-control/mission-control.service /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable mission-control
sudo systemctl start mission-control

# Check status
sudo systemctl status mission-control

# View logs
journalctl -u mission-control -f
```

---

## Monitoring

### Check Server Status
```bash
curl http://localhost:8080
```

### View Health Check Logs
```bash
tail -f /home/ubuntu/.openclaw/workspace/mission-control/health-check.log
```

### View Server Logs
```bash
tail -f /home/ubuntu/.openclaw/workspace/mission-control/server.log
```

### Check Cron Job
```bash
crontab -l | grep mission-control
```

---

## Stopping/Starting Manually

### Stop the Server
```bash
pkill -f "node.*server.js"
```

### Start the Server
```bash
cd /home/ubuntu/.openclaw/workspace/mission-control
nohup node server.js > server.log 2>&1 &
```

### Force Health Check Now
```bash
/home/ubuntu/.openclaw/workspace/mission-control/health-check.sh
```

---

## Logs

- **Server Log:** `/home/ubuntu/.openclaw/workspace/mission-control/server.log`
- **Health Check Log:** `/home/ubuntu/.openclaw/workspace/mission-control/health-check.log`
- **Systemd Log:** `journalctl -u mission-control` (if using systemd service)

---

## What Happens If Server Crashes

1. **Minute 1:** Server crashes (e.g., unhandled error, port conflict, etc.)
2. **Minute 2:** Health check runs, detects server is down
3. **Minute 2 (5 sec in):** Health check retries connection (retry 1 of 3)
4. **Minute 2 (10 sec in):** Retry 2 failed, tries again
5. **Minute 2 (15 sec in):** Retry 3 failed, initiates restart
6. **Minute 2 (16 sec in):** Server is back online
7. **Health check log:** Records the incident and restart

**Total downtime:** ~30-60 seconds before automatic recovery

---

## Future Enhancements

- Add Slack/email notifications on restart
- Track restart frequency to detect systemic issues
- Add /health API endpoint for monitoring
- Implement metrics collection (uptime, crashes, etc.)
- Add dashboard alerts when issues occur

