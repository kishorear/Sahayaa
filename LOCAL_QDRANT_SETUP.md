# Local Qdrant Setup Guide

## Overview

This guide sets up a self-hosted Qdrant instance using Docker, eliminating the need for cloud services or external API keys.

## Prerequisites

- Docker installed and running
- Port 6333 available on localhost

## Quick Setup

### 1. Run Setup Script

```bash
./setup-local-qdrant.sh
```

This script will:
- Create local data directory (`qdrant_data/`)
- Pull official Qdrant Docker image
- Start Qdrant container on port 6333
- Verify connectivity and health

### 2. Configure Environment

Set in your `.env` file:
```bash
QDRANT_URL=http://localhost:6333
# QDRANT_API_KEY is not needed for local instance
```

### 3. Test Setup

```bash
python test_local_qdrant.py
```

## Manual Setup Steps

If you prefer manual setup:

### 1. Create Data Directory
```bash
mkdir -p ./qdrant_data
chmod 755 ./qdrant_data
```

### 2. Start Qdrant Container
```bash
docker run -d \
    --name qdrant-local \
    -p 6333:6333 \
    -v $(pwd)/qdrant_data:/qdrant/storage \
    qdrant/qdrant:latest
```

### 3. Verify Running
```bash
curl http://localhost:6333/health
```

Should return Qdrant service information.

## Container Management

### Start/Stop Container
```bash
# Stop
docker stop qdrant-local

# Start
docker start qdrant-local

# Restart
docker restart qdrant-local
```

### View Logs
```bash
docker logs qdrant-local
```

### Remove Container (and all data)
```bash
docker rm -f qdrant-local
rm -rf ./qdrant_data
```

## Web Dashboard

Access Qdrant's web UI at: http://localhost:6333/dashboard

Features:
- Collection management
- Vector search testing
- Performance metrics
- Cluster status

## Data Persistence

- All vector data stored in `./qdrant_data/`
- Data persists across container restarts
- Backup by copying the `qdrant_data/` directory

## Integration with Application

The application automatically:
1. Connects to `http://localhost:6333`
2. Creates `instruction_texts` collection
3. Ingests documents from `instructions/` folder
4. Provides similarity search capabilities

### Collection Structure

- **Collection Name**: `instruction_texts`
- **Vector Dimensions**: 384 (OpenAI text-embedding-3-small)
- **Distance Metric**: Cosine similarity
- **Payload Fields**: 
  - `filename`: Source file name
  - `text`: Document content in Markdown

## Monitoring and Maintenance

### Collection Size Monitoring
The system monitors vector count and warns when approaching 1M vectors (configurable sharding threshold).

### Performance Optimization
- Qdrant automatically optimizes indexes
- Monitor memory usage via Docker stats
- Consider increasing Docker memory allocation for large datasets

### Backup Strategy
```bash
# Backup data
tar -czf qdrant_backup_$(date +%Y%m%d).tar.gz qdrant_data/

# Restore data
tar -xzf qdrant_backup_YYYYMMDD.tar.gz
```

## Troubleshooting

### Connection Issues
1. Check if Docker container is running: `docker ps`
2. Verify port 6333 is not blocked: `netstat -tulpn | grep 6333`
3. Check container logs: `docker logs qdrant-local`

### Performance Issues
1. Monitor Docker resource usage: `docker stats qdrant-local`
2. Check disk space in data directory
3. Consider increasing Docker memory limits

### Data Issues
1. Verify collection exists: `curl http://localhost:6333/collections`
2. Check vector count: Access dashboard or use API
3. Re-run ingestion if needed: `python services/qdrant_ingestion_service.py`

## Security Considerations

### Local Development
- No authentication required for localhost
- Container only accessible from local machine

### Production Deployment
If exposing beyond localhost:
1. Enable authentication in Qdrant config
2. Use TLS/SSL certificates
3. Configure firewall rules
4. Set strong API keys

## Resource Requirements

### Minimum
- 512MB RAM
- 1GB disk space
- 1 CPU core

### Recommended
- 2GB RAM for large document sets
- 10GB disk space for growth
- 2+ CPU cores for concurrent operations

## Migration from Cloud

If migrating from cloud Qdrant:
1. Export collections from cloud instance
2. Set up local instance
3. Import collections to local instance
4. Update environment variables
5. Test functionality

This approach provides full data control while maintaining all vector search capabilities.