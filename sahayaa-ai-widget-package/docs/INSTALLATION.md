# 🛠️ Installation Guide

Complete step-by-step guide to install and configure the Sahayaa AI Chat Widget with multi-agent capabilities.

## Prerequisites

### Frontend Requirements
- Web server (Apache, Nginx, or any static hosting)
- Modern browsers (Chrome 80+, Firefox 75+, Safari 13+, Edge 80+)
- HTTPS support (recommended for production)

### Backend Requirements
- Node.js 16.0+ and npm 8.0+
- PostgreSQL, MySQL, or SQLite database
- 512MB+ RAM and 1GB+ disk space
- Internet connectivity for AI provider APIs

## 📱 Frontend Installation

### Option 1: CDN Integration (Recommended)

Upload widget files to your CDN and include in your HTML:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Your Website</title>
  <!-- Widget CSS -->
  <link rel="stylesheet" href="https://your-cdn.com/widget-styles.css">
</head>
<body>
  <!-- Your website content -->
  
  <!-- Widget Configuration -->
  <script>
    window.sahayaaConfig = {
      apiKey: "your_api_key_here",
      serverUrl: "https://your-widget-server.com",
      primaryColor: "#6366F1",
      enableAgentWorkflow: true,
      showBehindTheScenes: true
    };
  </script>
  
  <!-- Widget JavaScript -->
  <script src="https://your-cdn.com/sahayaa-chat-widget.js" async></script>
</body>
</html>
```

### Option 2: Local File Integration

1. **Download widget files**:
   ```bash
   # Copy from the package
   cp sahayaa-ai-widget-package/frontend/sahayaa-chat-widget.js ./js/
   cp sahayaa-ai-widget-package/frontend/widget-styles.css ./css/
   ```

2. **Include in your HTML**:
   ```html
   <link rel="stylesheet" href="css/widget-styles.css">
   <script src="js/sahayaa-chat-widget.js" async></script>
   ```

### Option 3: NPM Integration

```bash
# If you have a build process
npm install sahayaa-ai-widget

# Import in your JavaScript
import SahayaaWidget from 'sahayaa-ai-widget';
import 'sahayaa-ai-widget/styles.css';
```

## 🖥️ Backend Server Installation

### Step 1: Environment Setup

```bash
# Clone or extract the backend folder
cd sahayaa-ai-widget-package/backend

# Install Node.js dependencies
npm install

# Create environment configuration
cp .env.example .env
```

### Step 2: Database Setup

#### PostgreSQL (Recommended)
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib  # Ubuntu/Debian
brew install postgresql                          # macOS
# Download from https://www.postgresql.org/     # Windows

# Create database
sudo -u postgres createdb sahayaa_widget

# Create user
sudo -u postgres psql
CREATE USER sahayaa_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE sahayaa_widget TO sahayaa_user;
\q
```

#### MySQL Alternative
```bash
# Install MySQL
sudo apt install mysql-server    # Ubuntu/Debian
brew install mysql              # macOS

# Create database
mysql -u root -p
CREATE DATABASE sahayaa_widget;
CREATE USER 'sahayaa_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON sahayaa_widget.* TO 'sahayaa_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### SQLite (Development Only)
```bash
# No installation required - file-based database
# Set DATABASE_URL=sqlite:./sahayaa_widget.db in .env
```

### Step 3: Environment Configuration

Edit `.env` file with your settings:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Database (choose one)
DATABASE_URL=postgresql://sahayaa_user:secure_password@localhost:5432/sahayaa_widget
# DATABASE_URL=mysql://sahayaa_user:secure_password@localhost:3306/sahayaa_widget
# DATABASE_URL=sqlite:./sahayaa_widget.db

# Security (generate strong secrets)
JWT_SECRET=your_32_character_jwt_secret_here
API_KEY_SECRET=your_api_key_encryption_secret

# CORS (add your domains)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# AI Providers (optional but recommended)
OPENAI_API_KEY=your_openai_api_key
GOOGLE_AI_API_KEY=your_google_ai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Step 4: Generate API Keys

Create API keys for your tenants/clients:

```javascript
// Generate API key format: sahayaa_wk_[tenant_id]_[key_id]_[signature]
const apiKey = `sahayaa_wk_1_${Math.random().toString(36).substring(2, 15)}`;
console.log('Your API Key:', apiKey);
```

### Step 5: Start Server

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start

# Using PM2 (recommended for production)
npm install -g pm2
pm2 start widget-server.js --name sahayaa-widget
pm2 startup
pm2 save
```

## 🐳 Docker Installation

### Using Docker Compose (Recommended)

1. **Create docker-compose.yml**:
```yaml
version: '3.8'
services:
  widget-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://sahayaa:password@db:5432/sahayaa_widget
      - JWT_SECRET=your_jwt_secret_32_chars
      - NODE_ENV=production
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=sahayaa_widget
      - POSTGRES_USER=sahayaa
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

2. **Start services**:
```bash
docker-compose up -d
```

### Using Docker Only

```bash
# Build image
docker build -t sahayaa-widget-server .

# Run with database
docker run -d \
  --name sahayaa-widget \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e JWT_SECRET=your_secret \
  sahayaa-widget-server
```

## ☁️ Cloud Deployment

### Heroku Deployment

```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login and create app
heroku login
heroku create your-widget-server

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set JWT_SECRET=your_jwt_secret_32_chars
heroku config:set API_KEY_SECRET=your_api_secret
heroku config:set NODE_ENV=production

# Deploy
git add .
git commit -m "Deploy Sahayaa widget server"
git push heroku main

# View logs
heroku logs --tail
```

### AWS EC2 Deployment

```bash
# Connect to EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone your code
git clone https://github.com/your-repo/sahayaa-widget-server.git
cd sahayaa-widget-server

# Install dependencies
npm install --production

# Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# Start with PM2
pm2 start widget-server.js --name sahayaa-widget
pm2 startup
pm2 save

# Configure reverse proxy (Nginx)
sudo apt install nginx
sudo nano /etc/nginx/sites-available/sahayaa-widget
```

Nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site and restart Nginx
sudo ln -s /etc/nginx/sites-available/sahayaa-widget /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### DigitalOcean App Platform

```yaml
# app.yaml
name: sahayaa-widget-server
services:
- name: api
  source_dir: /
  github:
    repo: your-username/sahayaa-widget-server
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  - key: JWT_SECRET
    value: your_jwt_secret
databases:
- name: sahayaa-db
  engine: PG
  version: "15"
```

## 🔧 Configuration Verification

### Frontend Health Check

Add this test to your website:

```html
<script>
// Test widget loading
setTimeout(() => {
  if (window.SahayaaAI) {
    console.log('✅ Sahayaa Widget loaded successfully');
  } else {
    console.error('❌ Sahayaa Widget failed to load');
  }
}, 3000);

// Listen for widget events
window.addEventListener('sahayaaWidgetEvent', (event) => {
  console.log('Widget event:', event.detail);
});
</script>
```

### Backend Health Check

```bash
# Test server health
curl http://localhost:3000/health

# Test chat endpoint
curl -X POST http://localhost:3000/api/widget/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{"message": "Hello, testing the widget!"}'
```

### Database Connection Test

```javascript
// Add to your server for testing
app.get('/test-db', async (req, res) => {
  try {
    // Test database connection
    const result = await db.query('SELECT NOW()');
    res.json({ status: 'Database connected', timestamp: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed', details: error.message });
  }
});
```

## 🚀 Production Optimization

### Performance Optimization

```bash
# Enable gzip compression
# Add to your server
const compression = require('compression');
app.use(compression());

# Redis for session storage (optional)
npm install redis connect-redis
```

### Security Hardening

```bash
# Install security packages
npm install helmet express-rate-limit

# Update server with security middleware
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));
```

### SSL Certificate Setup

```bash
# Using Let's Encrypt with Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Monitoring Setup

```bash
# Add logging with Winston
npm install winston

# Add health checks
npm install express-healthcheck

# Add metrics
npm install prom-client
```

## 🧪 Testing Installation

### Frontend Testing

```html
<!-- Add to a test page -->
<!DOCTYPE html>
<html>
<head>
  <title>Widget Test</title>
  <link rel="stylesheet" href="widget-styles.css">
</head>
<body>
  <h1>Testing Sahayaa Widget</h1>
  <button onclick="testWidget()">Test Widget Functions</button>
  
  <script>
    window.sahayaaConfig = {
      apiKey: "test_api_key",
      serverUrl: "http://localhost:3000",
      enableAgentWorkflow: true,
      showBehindTheScenes: true
    };
    
    function testWidget() {
      console.log('Testing widget...');
      if (window.SahayaaAI) {
        window.SahayaaAI.openChat();
      }
    }
  </script>
  <script src="sahayaa-chat-widget.js"></script>
</body>
</html>
```

### Backend Testing

```bash
# Run test suite
npm test

# Test specific endpoints
curl -X POST http://localhost:3000/api/widget/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sahayaa_wk_1_test123" \
  -d '{"message": "Test message for agent workflow"}'
```

## 🔧 Troubleshooting

### Common Issues

1. **Widget not appearing**
   - Check browser console for JavaScript errors
   - Verify file paths are correct
   - Ensure CSS file is loaded
   - Check CORS settings if files are on different domains

2. **API connection failures**
   - Verify server is running on correct port
   - Check API key format and validity
   - Ensure CORS origins include your domain
   - Test network connectivity

3. **Database connection errors**
   - Verify database credentials in .env
   - Check database server is running
   - Test connection string manually
   - Ensure database exists and user has permissions

4. **Permission denied errors**
   - Check file permissions for uploaded files
   - Verify server has write access to required directories
   - Ensure environment variables are readable

### Debug Mode

Enable debug logging:

```bash
# Add to .env
LOG_LEVEL=debug
DEBUG=sahayaa:*

# View detailed logs
npm start 2>&1 | tee debug.log
```

### Health Monitoring

```bash
# Check server status
curl http://localhost:3000/health

# Monitor logs
tail -f /var/log/sahayaa-widget.log

# Check PM2 status
pm2 status
pm2 logs sahayaa-widget
```

## 📋 Post-Installation Checklist

- [ ] Frontend widget loads without errors
- [ ] Backend server responds to health checks
- [ ] Database connection is established
- [ ] API endpoints return valid responses
- [ ] Chat functionality works end-to-end
- [ ] Agent workflow processing displays correctly
- [ ] Analytics events are tracked
- [ ] Security headers are configured
- [ ] SSL certificate is installed (production)
- [ ] Monitoring and logging are active
- [ ] Backup strategy is implemented
- [ ] Documentation is accessible to team

## 🆘 Getting Help

If you encounter issues during installation:

1. Check the troubleshooting section above
2. Review server and browser console logs
3. Test with sample files to isolate the problem
4. Verify all prerequisites are met
5. Check environment variable configuration

For additional support, refer to:
- [Configuration Guide](CONFIGURATION.md)
- [API Documentation](API.md)
- [Customization Guide](CUSTOMIZATION.md)

## 🔄 Updates and Maintenance

### Updating the Widget

```bash
# Frontend update
# Download new widget files and replace existing ones
# Clear browser cache and CDN cache

# Backend update
git pull origin main
npm install
pm2 restart sahayaa-widget
```

### Regular Maintenance

- Monitor server logs for errors
- Update dependencies monthly
- Backup database regularly
- Review and rotate API keys quarterly
- Monitor system performance and scaling needs

## 🎯 Next Steps

After successful installation:

1. Test the widget thoroughly on your website
2. Configure custom styling to match your brand
3. Set up monitoring and analytics
4. Train your team on the admin interface
5. Plan for scaling as usage grows

Your Sahayaa AI Chat Widget is now ready to provide intelligent customer support with transparent multi-agent processing!