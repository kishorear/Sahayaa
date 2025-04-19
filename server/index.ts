import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { testDbConnection, reconnectDb } from "./db";
import { setupAuth } from "./auth";
import path from "path";

// Process-level unhandled rejection handler to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't crash the server, just log the error
});

// Process-level uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Continue execution, don't crash the server
});

const app = express();

// Set up static file serving for uploads
const uploadsDir = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir));
console.log(`Serving static files from: ${uploadsDir}`);

// JSON body parser with better error handling
app.use(express.json({
  verify: (req: any, res, buf, encoding) => {
    // Store raw body for webhook processing
    if (req.url.includes('/integrations/webhook')) {
      const enc = encoding || 'utf8';
      req.rawBody = buf.toString(enc as any);
    }
  }
}));

// JSON parsing error handler
app.use((err: any, req: any, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    console.warn('JSON Parse Error:', err.message);
    return res.status(400).json({
      error: 'Invalid JSON payload',
      message: 'The request contains malformed JSON'
    });
  }
  next(err);
});

// Handle URL-encoded form data
app.use(express.urlencoded({ extended: false }));

(async () => {
  const server = await registerRoutes(app);

  // Add optimized API database health check middleware
  app.use("/api/*", async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip health check for read-only endpoints
      if (req.method === 'GET' || req.path.includes('/health') || req.path.includes('/status')) {
        return next();
      }
      
      // Only check database connection for write operations and at a reduced rate (1% of requests)
      if (Math.random() < 0.01) {
        const isDbConnected = await testDbConnection(2000); // Reduced timeout
        if (!isDbConnected) {
          console.warn("Database connection check failed, attempting reconnect");
          await reconnectDb();
        }
      }
      next();
    } catch (error) {
      console.error("Database health check error:", error);
      next(); // Continue even if DB check fails
    }
  });

  // Optimized global error handler - don't throw after handling
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    try {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      // Only log full stack traces for 500 errors, not for client errors
      if (status >= 500) {
        console.error(`Server error (${status}):`, err);
      } else {
        console.warn(`Client error (${status}): ${message}`);
      }
      
      // Send appropriate response with minimal details
      res.status(status).json({ 
        message,
        status: status >= 500 ? 'error' : 'fail',
        code: status
      });
    } catch (handlerError) {
      console.error("Error in error handler:", handlerError);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV !== "test") {
    // Always use setupVite since we're in Replit environment
    await setupVite(app, server);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    // Use our optimized logger
    console.log(`Server running at http://0.0.0.0:${port}`);
    console.log(`Web Application: http://0.0.0.0:${port}`);
    console.log(`API: http://0.0.0.0:${port}/api`);
    console.log(`Performance optimizations enabled.`);
  });
})();
