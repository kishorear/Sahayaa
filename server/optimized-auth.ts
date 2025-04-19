// Optimized authentication middleware module
import { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { User as UserType } from "@shared/schema";

// User cache to reduce database queries
const userCache = new Map<number, { user: UserType; timestamp: number }>();
const usernameCache = new Map<string, { userId: number; timestamp: number }>();
const USER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Setup optimized request filtering and reduced logging
export function setupOptimizedAuth(app: Express) {
  // Add static file fast path
  app.use((req: Request, res: Response, next: NextFunction) => {
    const path = req.path.toLowerCase();
    // Skip authentication checks for static files and assets
    if (
      path.endsWith('.js') ||
      path.endsWith('.css') ||
      path.endsWith('.png') ||
      path.endsWith('.jpg') ||
      path.endsWith('.jpeg') ||
      path.endsWith('.gif') ||
      path.endsWith('.svg') ||
      path.endsWith('.ico') ||
      path.endsWith('.woff') ||
      path.endsWith('.woff2') ||
      path.endsWith('.ttf') ||
      path.endsWith('.eot') ||
      path.includes('/assets/') ||
      path.includes('/uploads/')
    ) {
      // Don't add user to static file requests
      return next();
    }
    
    next();
  });

  // Add optimized authentication middleware
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    // Skip auth for public assets (already filtered above, but just in case)
    if (req.path.includes('/assets/') || req.path.includes('/uploads/')) {
      return next();
    }
    
    // Try get user from session
    if (req.session?.userId) {
      try {
        // Check cache first
        const now = Date.now();
        const cachedUser = userCache.get(req.session.userId);
        
        if (cachedUser && (now - cachedUser.timestamp) < USER_CACHE_TTL) {
          // Use cached user - extremely fast path
          req.user = cachedUser.user;
        } else {
          // Get from database
          const user = await storage.getUser(req.session.userId);
          if (user) {
            req.user = user;
            // Update cache
            userCache.set(user.id, { user, timestamp: now });
          }
        }
      } catch (error) {
        // Only log genuine errors, not just missing users
        if (error instanceof Error && !(error.message.includes('not found'))) {
          console.error("Error fetching user:", error);
        }
      }
    }
    
    // Continue to next middleware
    next();
  });
  
  // Add helper method to get user by username with caching
  app.locals.getUserByUsername = async (username: string, tenantId?: number): Promise<UserType | undefined> => {
    // Check username cache first
    const now = Date.now();
    const cachedUsername = usernameCache.get(username);
    
    if (cachedUsername && (now - cachedUsername.timestamp) < USER_CACHE_TTL) {
      // Get from user cache using the cached user ID
      const cachedUser = userCache.get(cachedUsername.userId);
      if (cachedUser && (now - cachedUser.timestamp) < USER_CACHE_TTL) {
        return cachedUser.user;
      }
    }
    
    // Get from database
    const user = await storage.getUserByUsername(username, tenantId);
    if (user) {
      // Update both caches
      userCache.set(user.id, { user, timestamp: now });
      usernameCache.set(username, { userId: user.id, timestamp: now });
    }
    
    return user;
  };
  
  // Add helper method to invalidate a user in the cache
  app.locals.invalidateUserCache = (userId: number) => {
    userCache.delete(userId);
    // Also clean up username cache entries that point to this user
    for (const [username, data] of usernameCache.entries()) {
      if (data.userId === userId) {
        usernameCache.delete(username);
      }
    }
  };
  
  // Add silent auto cleanup of expired cache entries
  setInterval(() => {
    const now = Date.now();
    // Clean up user cache
    for (const [userId, data] of userCache.entries()) {
      if ((now - data.timestamp) > USER_CACHE_TTL) {
        userCache.delete(userId);
      }
    }
    // Clean up username cache
    for (const [username, data] of usernameCache.entries()) {
      if ((now - data.timestamp) > USER_CACHE_TTL) {
        usernameCache.delete(username);
      }
    }
  }, 60000); // Run cleanup every minute
}