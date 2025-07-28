#!/bin/bash

# Start Services Script for FastMCP + Orchestrator
# This script starts all required services for the AI agent system

set -e

echo "=== Starting AI Agent System Services ==="

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "Port $port is already in use"
        return 1
    fi
    return 0
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    echo "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url/health" >/dev/null 2>&1; then
            echo "$service_name is ready!"
            return 0
        fi
        
        echo "Attempt $attempt/$max_attempts - $service_name not ready yet..."
        sleep 2
        ((attempt++))
    done
    
    echo "ERROR: $service_name failed to start within timeout"
    return 1
}

# Create necessary directories
echo "Creating directories..."
mkdir -p chroma_data
mkdir -p documents
mkdir -p logs
mkdir -p uploads

# Check required environment variables
echo "Checking environment variables..."
if [ -z "$OPENAI_API_KEY" ]; then
    echo "WARNING: OPENAI_API_KEY not set - embeddings will fail"
fi

if [ -z "$DATABASE_URL" ]; then
    echo "WARNING: DATABASE_URL not set - database operations will fail"
fi

# Check ports availability
echo "Checking port availability..."
if ! check_port 5000; then
    echo "ERROR: Main application port 5000 is in use"
    exit 1
fi

if ! check_port 8001; then
    echo "WARNING: FastMCP port 8001 is in use - will attempt to start anyway"
fi

# Start FastMCP service in background
echo "Starting FastMCP service on port 8001..."
cd fastmcp_service

# Install Python dependencies if needed
if [ ! -f ".deps_installed" ]; then
    echo "Installing Python dependencies..."
    pip install -r requirements.txt 2>/dev/null || echo "Failed to install some dependencies"
    touch .deps_installed
fi

# Start FastMCP service
nohup python3 -m uvicorn fastmcp_server:app --host 0.0.0.0 --port 8001 --reload > ../logs/fastmcp.log 2>&1 &
FASTMCP_PID=$!
echo "FastMCP service started with PID: $FASTMCP_PID"

cd ..

# Wait for FastMCP service to be ready
if wait_for_service "http://localhost:8001" "FastMCP"; then
    echo "FastMCP service is running successfully"
else
    echo "WARNING: FastMCP service may not be fully ready"
fi

# Start main application
echo "Starting main application on port 5000..."
npm run dev &
MAIN_APP_PID=$!
echo "Main application started with PID: $MAIN_APP_PID"

# Wait for main application to be ready
if wait_for_service "http://localhost:5000" "Main Application"; then
    echo "Main application is running successfully"
else
    echo "WARNING: Main application may not be fully ready"
fi

# Create PID file for easy cleanup
echo "$FASTMCP_PID" > .pids
echo "$MAIN_APP_PID" >> .pids

echo ""
echo "=== All Services Started Successfully ==="
echo "Main Application: http://localhost:5000"
echo "FastMCP Service: http://localhost:8001"
echo "FastMCP Health: http://localhost:8001/health"
echo "FastMCP Metrics: http://localhost:8001/metrics"
echo ""
echo "Logs:"
echo "  FastMCP: ./logs/fastmcp.log"
echo "  Main App: Console output"
echo ""
echo "To stop services, run: ./stop_services.sh"
echo ""

# Keep script running to monitor services
echo "Monitoring services... (Ctrl+C to stop)"
trap 'echo "Stopping services..."; ./stop_services.sh; exit 0' SIGINT

# Monitor services every 30 seconds
while true; do
    sleep 30
    
    # Check if FastMCP is still running
    if ! kill -0 $FASTMCP_PID 2>/dev/null; then
        echo "WARNING: FastMCP service stopped unexpectedly"
    fi
    
    # Check if main app is still running
    if ! kill -0 $MAIN_APP_PID 2>/dev/null; then
        echo "WARNING: Main application stopped unexpectedly"
    fi
done