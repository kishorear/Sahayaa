// Optimized logging middleware
import { Express, Request, Response, NextFunction } from "express";

// Define log levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

// Set active log level based on environment
const ACTIVE_LOG_LEVEL = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;

// Log request filter patterns
const LOG_FILTER_PATTERNS = [
  /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i,
  /^\/assets\//i,
  /^\/uploads\//i,
  /^\/favicon\.ico$/i
];

// Request counter to reduce logging frequency
let requestCounter = 0;
const LOG_SAMPLING_RATE = 20; // Log only 1 in 20 requests for high-volume paths

/**
 * Setup optimized logging middleware
 * @param app Express application
 */
export function setupOptimizedLogging(app: Express) {
  // Skip logging for static files completely
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Don't log static file requests
    if (LOG_FILTER_PATTERNS.some(pattern => pattern.test(req.path))) {
      return next();
    }
    
    // For API endpoints, use sampled logging
    if (req.path.startsWith('/api/')) {
      // Only log a small percentage of API requests
      const shouldLog = ++requestCounter % LOG_SAMPLING_RATE === 0;
      
      // Store original end method
      const originalEnd = res.end;
      
      // Track response time
      const startTime = Date.now();
      
      // Override end method
      res.end = function(chunk?: any, encoding?: BufferEncoding, callback?: () => void) {
        // Calculate response time
        const responseTime = Date.now() - startTime;
        
        // Restore original end method
        res.end = originalEnd;
        
        // Log request if sampling allows or if it's slow (over 500ms)
        if (shouldLog || responseTime > 500 || res.statusCode >= 400) {
          const logData = {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            responseTime: `${responseTime}ms`,
            contentLength: res.getHeader('content-length') || 'unknown'
          };
          
          if (res.statusCode >= 500) {
            // Always log server errors with full details
            console.error(`Server Error: ${req.method} ${req.path} ${res.statusCode} in ${responseTime}ms`, {
              query: req.query,
              headers: req.headers,
              error: res.locals.error || 'Unknown error'
            });
          } else if (res.statusCode >= 400) {
            // Log client errors with moderate details
            console.warn(`Client Error: ${req.method} ${req.path} ${res.statusCode} in ${responseTime}ms`);
          } else if (shouldLog) {
            // Log successful requests with minimal details and at lower frequency
            if (responseTime > 1000) {
              console.warn(`Slow Request: ${req.method} ${req.path} ${res.statusCode} in ${responseTime}ms`);
            } else {
              // Only log normal requests at DEBUG level
              if (ACTIVE_LOG_LEVEL >= LogLevel.DEBUG) {
                console.log(`${req.method} ${req.path} ${res.statusCode} in ${responseTime}ms`);
              }
            }
          }
        }
        
        // Call original end method
        return originalEnd.call(this, chunk, encoding, callback);
      };
    }
    
    next();
  });
}

// Export optimized logger functions
export const logger = {
  error: (message: string, ...args: any[]) => {
    if (ACTIVE_LOG_LEVEL >= LogLevel.ERROR) {
      console.error(message, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (ACTIVE_LOG_LEVEL >= LogLevel.WARN) {
      console.warn(message, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    if (ACTIVE_LOG_LEVEL >= LogLevel.INFO) {
      console.info(message, ...args);
    }
  },
  debug: (message: string, ...args: any[]) => {
    if (ACTIVE_LOG_LEVEL >= LogLevel.DEBUG) {
      console.debug(message, ...args);
    }
  },
  trace: (message: string, ...args: any[]) => {
    if (ACTIVE_LOG_LEVEL >= LogLevel.TRACE) {
      console.trace(message, ...args);
    }
  }
};