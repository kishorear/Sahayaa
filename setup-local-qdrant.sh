#!/bin/bash

# Local Qdrant Setup Script
# Sets up local Qdrant Docker container for the support ticket system

echo "Setting up local Qdrant instance..."

# Step 1: Create local data directory
echo "Creating local data directory..."
mkdir -p ./qdrant_data
chmod 755 ./qdrant_data

# Step 2: Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Step 3: Stop any existing Qdrant containers
echo "Stopping any existing Qdrant containers..."
docker stop qdrant-local 2>/dev/null || true
docker rm qdrant-local 2>/dev/null || true

# Step 4: Pull official Qdrant image
echo "Pulling official Qdrant Docker image..."
docker pull qdrant/qdrant:latest

# Step 5: Start local Qdrant container
echo "Starting local Qdrant container..."
docker run -d \
    --name qdrant-local \
    -p 6333:6333 \
    -v $(pwd)/qdrant_data:/qdrant/storage \
    qdrant/qdrant:latest

# Step 6: Wait for Qdrant to be ready
echo "Waiting for Qdrant to start..."
for i in {1..30}; do
    if curl -s http://localhost:6333/health > /dev/null 2>&1; then
        echo "Qdrant is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "Timeout waiting for Qdrant to start"
        exit 1
    fi
    sleep 2
done

# Step 7: Verify Qdrant is accessible
echo "Verifying Qdrant connectivity..."
HEALTH_CHECK=$(curl -s http://localhost:6333/health)
if [[ $HEALTH_CHECK == *"title"* ]]; then
    echo "✅ Local Qdrant instance is running successfully!"
    echo "   - URL: http://localhost:6333"
    echo "   - Web UI: http://localhost:6333/dashboard"
    echo "   - Data directory: $(pwd)/qdrant_data"
    echo ""
    echo "Next steps:"
    echo "1. Set QDRANT_URL=http://localhost:6333 in your .env file"
    echo "2. Run: python services/qdrant_ingestion_service.py to test ingestion"
    echo "3. Run: python test_simple_validation.py to validate setup"
else
    echo "❌ Qdrant health check failed"
    echo "Check Docker logs: docker logs qdrant-local"
    exit 1
fi

echo ""
echo "To stop Qdrant: docker stop qdrant-local"
echo "To restart Qdrant: docker start qdrant-local"
echo "To remove Qdrant: docker rm -f qdrant-local"