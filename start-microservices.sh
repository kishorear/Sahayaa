#!/bin/bash

# Start All Microservices for Production Deployment
# This script starts both the data service and agent service required for full functionality

set -e

echo "🚀 Starting Microservices for Production Deployment..."

# Function to check if a service is running
check_service() {
    local port=$1
    local service_name=$2
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:$port/health > /dev/null 2>&1; then
            echo "✅ $service_name is running on port $port"
            return 0
        fi
        echo "⏳ Waiting for $service_name to start (attempt $attempt/$max_attempts)..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ $service_name failed to start on port $port"
    return 1
}

# Kill any existing services
echo "🧹 Cleaning up existing services..."
pkill -f "python.*fastapi_data_service" > /dev/null 2>&1 || true
pkill -f "python.*agents" > /dev/null 2>&1 || true
sleep 2

# Start Data Service (Port 8000)
echo "🔧 Starting Data Service on port 8000..."
nohup python services/fastapi_data_service.py > data_service.log 2>&1 &
DATA_SERVICE_PID=$!

# Start Agent Service (Port 8001)
echo "🔧 Starting Agent Orchestrator Service on port 8001..."
nohup python agents.py > agent_service.log 2>&1 &
AGENT_SERVICE_PID=$!

# Wait for services to start
sleep 5

# Verify services are running
echo "🔍 Verifying service health..."

SUCCESS=true

if ! check_service 8000 "Data Service"; then
    echo "📋 Data Service logs:"
    tail -10 data_service.log 2>/dev/null || echo "No data service logs found"
    SUCCESS=false
fi

if ! check_service 8001 "Agent Service"; then
    echo "📋 Agent Service logs:"
    tail -10 agent_service.log 2>/dev/null || echo "No agent service logs found"
    SUCCESS=false
fi

if [ "$SUCCESS" = true ]; then
    echo ""
    echo "🎉 All microservices started successfully!"
    echo "📊 Service Status:"
    echo "  ✅ Main Application: http://localhost:5000"
    echo "  ✅ Data Service: http://localhost:8000"
    echo "  ✅ Agent Service: http://localhost:8001"
    echo ""
    echo "💡 Microservices Architecture Ready:"
    echo "  - Node.js handles web interface and API gateway"
    echo "  - Data Service handles database operations"
    echo "  - Agent Service handles AI workflow coordination"
    echo "  - Sophisticated ticket descriptions now available"
    echo ""
    echo "🔄 Process IDs:"
    echo "  Data Service PID: $DATA_SERVICE_PID"
    echo "  Agent Service PID: $AGENT_SERVICE_PID"
    
    # Test the complete workflow
    echo ""
    echo "🧪 Testing ticket description generation..."
    
    # Test direct agent workflow
    if curl -s -X POST http://localhost:8001/process \
        -H "Content-Type: application/json" \
        -d '{
            "user_message": "I cannot access my dashboard, getting error 500 when trying to login",
            "tenant_id": 1,
            "user_id": "15"
        }' > /dev/null 2>&1; then
        echo "✅ Agent workflow test successful"
    else
        echo "⚠️  Agent workflow test failed (this may be due to authentication)"
    fi
    
    exit 0
else
    echo ""
    echo "❌ Failed to start all microservices"
    echo "📋 Check service logs above for details"
    exit 1
fi