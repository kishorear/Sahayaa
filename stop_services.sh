#!/bin/bash

# Stop Services Script
# Gracefully stops all FastMCP and orchestrator services

echo "=== Stopping AI Agent System Services ==="

# Function to stop process by PID
stop_process() {
    local pid=$1
    local name=$2
    
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        echo "Stopping $name (PID: $pid)..."
        kill -TERM "$pid"
        
        # Wait for graceful shutdown
        local count=0
        while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
            sleep 1
            ((count++))
        done
        
        # Force kill if still running
        if kill -0 "$pid" 2>/dev/null; then
            echo "Force stopping $name..."
            kill -KILL "$pid"
        fi
        
        echo "$name stopped"
    else
        echo "$name is not running"
    fi
}

# Stop services by PID file
if [ -f ".pids" ]; then
    echo "Reading process IDs from .pids file..."
    
    # Read PIDs
    FASTMCP_PID=$(sed -n '1p' .pids 2>/dev/null)
    MAIN_APP_PID=$(sed -n '2p' .pids 2>/dev/null)
    
    # Stop FastMCP service
    stop_process "$FASTMCP_PID" "FastMCP Service"
    
    # Stop main application
    stop_process "$MAIN_APP_PID" "Main Application"
    
    # Remove PID file
    rm -f .pids
else
    echo "No .pids file found, attempting to find processes by port..."
    
    # Find and stop processes by port
    FASTMCP_PID=$(lsof -ti:8001 2>/dev/null)
    MAIN_APP_PID=$(lsof -ti:5000 2>/dev/null)
    
    stop_process "$FASTMCP_PID" "FastMCP Service (port 8001)"
    stop_process "$MAIN_APP_PID" "Main Application (port 5000)"
fi

# Stop any remaining uvicorn processes
echo "Checking for remaining uvicorn processes..."
pkill -f "uvicorn.*fastmcp" 2>/dev/null && echo "Stopped remaining uvicorn processes" || true

# Stop any remaining npm processes
echo "Checking for remaining npm processes..."
pkill -f "npm run dev" 2>/dev/null && echo "Stopped remaining npm processes" || true

echo ""
echo "=== All Services Stopped ==="
echo "Logs preserved in ./logs/ directory"
echo ""