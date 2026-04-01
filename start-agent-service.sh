#!/bin/bash

# Start Agent Service for Production Deployment
# This script ensures the Python agent service runs alongside the main application

echo "Starting Agent Service for ticket description generation..."

# Check if agent service is already running
if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo "Agent service is already running on port 8001"
    exit 0
fi

# Kill any existing agent service processes
pkill -f "python agents.py" > /dev/null 2>&1

# Start the agent service in the background
echo "Starting Python agent service..."
nohup python agents.py > agent_service.log 2>&1 &

# Wait for the service to start
sleep 5

# Check if the service started successfully
if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo "✅ Agent service started successfully on port 8001"
    echo "✅ Sophisticated ticket description generation is now available"
    tail -5 agent_service.log
else
    echo "❌ Failed to start agent service"
    echo "Log output:"
    tail -10 agent_service.log
    exit 1
fi

echo "Agent service is ready for production deployment"