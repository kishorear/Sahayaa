import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { testDbConnection, reconnectDb } from "./db";
import path from "path";
import { setupOptimizedLogging, logger } from "./logging-middleware";
import { setupOptimizedAuth } from "./optimized-auth";
import cookieParser from "cookie-parser";
import compression from "compression";
import helmet from "helmet";

// Process-level unhandled rejection handler to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't crash the server, just log the error
});

// Process-level uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Continue execution, don't crash the server
});

const app = express();

// Add security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP in development
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false
}));

// Enable response compression
app.use(compression());

// Set up optimized logging middleware
setupOptimizedLogging(app);

// Set up cookie parser
app.use(cookieParser());

// Static file paths - apply our optimized static file handling
// Set up cache headers for static files
const STATIC_CACHE_MAX_AGE = 86400000; // 1 day in milliseconds
const uploadsDir = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir, {
  maxAge: STATIC_CACHE_MAX_AGE,
  etag: true,
  lastModified: true
}));
logger.info(`Serving static files from: ${uploadsDir}`);

// Set up debug tools with optimal static file serving
const clientDir = path.join(process.cwd(), 'client');
app.use('/debug', express.static(clientDir, {
  maxAge: 0, // No caching for debug tools
  etag: true
}));
logger.info(`Serving debug tools from: ${clientDir}`);

// Enhanced JSON body parser with better error handling
app.use(express.json({
  limit: '10mb', // Reduced from 1gb to improve memory usage
  verify: (req: any, res, buf, encoding) => {
    // Only store raw body when absolutely necessary
    if (req.url.includes('/integrations/webhook')) {
      const enc = encoding || 'utf8';
      req.rawBody = buf.toString(enc as any);
    }
  }
}));

// JSON parsing error handler
app.use((err: any, req: any, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    logger.warn('JSON Parse Error:', err.message);
    return res.status(400).json({
      error: 'Invalid JSON payload',
      message: 'The request contains malformed JSON'
    });
  }
  next(err);
});

// Apply CORS headers for API requests
app.use("/api/*", (req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// Add request timing middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  // Skip for static files
  if (req.path.match(/\.(js|css|png|jpg|svg|ico)$/)) {
    return next();
  }
  
  // Track response time for non-static requests
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Only log slow responses (>500ms) to reduce logging volume
    if (duration > 500) {
      logger.warn(`Slow response: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  
  next();
});

// Setup optimized auth with efficient user caching
setupOptimizedAuth(app);

// Register routes
const httpServer = registerRoutes(app);

// Handle global errors
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error("Unhandled error:", err);
  if (!res.headersSent) {
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "production" ? "An unexpected error occurred" : err.message
    });
  }
});

// Setup Vite dev and static file handling
if (process.env.NODE_ENV !== "test") {
  setupVite(app, httpServer);
}

// Port setting with fallback
const PORT = process.env.PORT || 5000;

// Start server after connecting to the database
testDbConnection().then((connected) => {
  if (connected) {
    httpServer.then(server => {
      server.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
      });
    });
  } else {
    logger.error("Could not connect to database. Server won't start.");
    process.exit(1);
  }
}).catch(err => {
  logger.error("Error testing database connection:", err);
  process.exit(1);
});

export { app, httpServer };