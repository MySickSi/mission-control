#!/bin/bash

# Mission Control Health Check & Auto-Restart
# Runs every minute to ensure the server stays up

PORT=8080
MAX_RETRIES=3
RETRY_DELAY=5
PID_FILE="/tmp/mission-control.pid"
LOG_FILE="/home/ubuntu/.openclaw/workspace/mission-control/health-check.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

check_server_health() {
    # Try to curl the health endpoint
    if curl -s -m 5 http://localhost:${PORT} > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

restart_server() {
    log "❌ Server is down. Attempting restart..."
    
    # Kill any existing process
    if [ -f "$PID_FILE" ]; then
        local old_pid=$(cat "$PID_FILE")
        if kill -0 "$old_pid" 2>/dev/null; then
            log "Killing old process (PID: $old_pid)"
            kill -9 "$old_pid"
        fi
    fi
    
    # Start new process
    cd /home/ubuntu/.openclaw/workspace/mission-control
    nohup node server.js > server.log 2>&1 &
    local new_pid=$!
    echo $new_pid > "$PID_FILE"
    log "✅ Server restarted (PID: $new_pid)"
}

# Main health check loop
for attempt in $(seq 1 $MAX_RETRIES); do
    if check_server_health; then
        log "✓ Server is healthy"
        exit 0
    else
        log "⚠ Health check failed (attempt $attempt/$MAX_RETRIES)"
        if [ $attempt -lt $MAX_RETRIES ]; then
            sleep $RETRY_DELAY
        fi
    fi
done

# All retries failed, restart the server
restart_server

# Verify restart
sleep 2
if check_server_health; then
    log "✓ Server restart successful"
    exit 0
else
    log "✗ Server restart failed - manual intervention needed"
    exit 1
fi
