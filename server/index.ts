import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { testDbConnection, reconnectDb } from "./db";
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

// Set up debug tools
const clientDir = path.join(process.cwd(), 'client');
app.use('/debug', express.static(clientDir));
console.log(`Serving debug tools from: ${clientDir}`);

// Enhanced JSON body parser with better error handling
app.use(express.json({
  limit: '1gb',
  verify: (req: any, res, buf, encoding) => {
    // Store raw body for debugging
    if (req.url.includes('/integrations')) {
      // Using a safe default encoding if none provided
      const enc = encoding || 'utf8';
      req.rawBody = buf.toString(enc as any);
    }
  },
  // Handle JSON parsing errors
  reviver: (key, value) => {
    // Special handling for specific keys if needed
    return value;
  }
}));

app.use((err: any, req: any, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    // JSON parse error
    console.error('JSON Parse Error:', err.message);
    console.log('Raw request body:', req.rawBody);
    return res.status(400).json({ 
      message: 'Invalid JSON in request body',
      error: err.message
    });
  }
  next(err);
});

app.use(express.urlencoded({ extended: false, limit: '1gb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Add API database health check middleware
  app.use("/api/*", async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check database connection occasionally to avoid overwhelming DB
      if (Math.random() < 0.05) { // ~5% of requests
        const isDbConnected = await testDbConnection();
        if (!isDbConnected) {
          console.log("Database connection check failed, attempting reconnect");
          await reconnectDb();
        }
      }
      next();
    } catch (error) {
      console.error("Database health check error:", error);
      next(); // Continue even if DB check fails
    }
  });

  // Global error handler - don't throw after handling
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    try {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      console.error(`Error handling request (${status}):`, err);
      res.status(status).json({ message });
      // Don't throw here, it would crash the server
    } catch (handlerError) {
      console.error("Error in error handler:", handlerError);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
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
    log(`serving on port ${port}`);
  });
})();
