#!/bin/bash

# Production Deployment Script with Agent Service
# This script ensures both the main application and agent service run properly

set -e

echo "🚀 Starting Production Deployment with Agent Service..."

# Function to check if a service is running
check_service() {
    local port=$1
    local service_name=$2
    
    if curl -s http://localhost:$port/health > /dev/null 2>&1; then
        echo "✅ $service_name is running on port $port"
        return 0
    else
        echo "❌ $service_name is not running on port $port"
        return 1
    fi
}

# Function to start agent service
start_agent_service() {
    echo "🔧 Starting Agent Service..."
    
    # Kill any existing agent service
    pkill -f "python agents.py" > /dev/null 2>&1 || true
    
    # Start agent service
    nohup python agents.py > agent_service.log 2>&1 &
    
    # Wait for service to start
    echo "⏳ Waiting for agent service to initialize..."
    sleep 8
    
    # Check if service started successfully
    if check_service 8001 "Agent Service"; then
        echo "✅ Agent service started successfully"
        return 0
    else
        echo "❌ Failed to start agent service"
        echo "📋 Agent service logs:"
        tail -20 agent_service.log
        return 1
    fi
}

# Function to test ticket description functionality
test_ticket_description() {
    echo "🧪 Testing ticket description generation..."
    
    # Test agent workflow endpoint
    local response=$(curl -s -X POST http://localhost:5000/api/agent-workflow \
        -H "Content-Type: application/json" \
        -d '{
            "user_message": "I cannot access my dashboard, getting error 500 when trying to login after password reset",
            "tenant_id": 1,
            "user_id": "15"
        }' 2>/dev/null)
    
    if echo "$response" | jq -r '.success' 2>/dev/null | grep -q "true"; then
        echo "✅ Agent workflow test passed"
        local ticket_title=$(echo "$response" | jq -r '.ticket.title' 2>/dev/null)
        echo "📋 Generated ticket title: $ticket_title"
        return 0
    else
        echo "❌ Agent workflow test failed"
        echo "📋 Response: $response"
        return 1
    fi
}

# Main deployment process
echo "🔍 Checking current service status..."

# Check if main application is running
if ! check_service 5000 "Main Application"; then
    echo "❌ Main application is not running. Please start it first with 'npm run dev'"
    exit 1
fi

# Start agent service
if ! start_agent_service; then
    echo "❌ Failed to start agent service"
    exit 1
fi

# Test ticket description functionality
if ! test_ticket_description; then
    echo "⚠️  Ticket description test failed, but services are running"
    echo "📋 Check the agent service logs for details"
fi

echo ""
echo "🎉 Production Deployment Complete!"
echo "📊 Service Status:"
check_service 5000 "Main Application"
check_service 8001 "Agent Service"
echo ""
echo "🔧 Available Services:"
echo "  - Main Application: http://localhost:5000"
echo "  - Agent Service API: http://localhost:8001"
echo "  - Health Checks: /health on both services"
echo ""
echo "💡 For production deployment:"
echo "  1. Both services are now running"
echo "  2. Ticket descriptions will be generated using AI agents"
echo "  3. If agent service fails, the system will fall back to basic descriptions"
echo "  4. Monitor agent_service.log for agent service logs"
echo ""
echo "✨ Deployment ready for production use!"