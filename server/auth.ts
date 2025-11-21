import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SchemaUser, users } from "@shared/schema";
import { db } from "./db";
import { sql } from "drizzle-orm";
import createMemoryStore from "memorystore";
import { checkCreatorRole } from './tenant-middleware';

// Extend the session type to include our custom fields
declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

// Extend the Request type to include the user property
declare global {
  namespace Express {
    interface User {
      id: number;
      tenantId: number;
      teamId: number | null; // Team ID for team-scoped access control
      username: string;
      password: string;
      role: string;
      name: string | null;
      email: string | null;
      profilePicture: string | null;
      mfaEnabled: boolean | null;
      mfaSecret: string | null;
      mfaBackupCodes: any[] | null;
      ssoEnabled: boolean | null;
      ssoProvider: string | null;
      ssoProviderId: string | null;
      ssoProviderData: any;
      createdAt: Date;
      updatedAt: Date;
    }
    interface Request {
      user?: Express.User;
    }
  }
}

/**
 * Safely resolve tenant context from request, preventing data leakage.
 * 
 * This helper enforces tenant isolation by:
 * - Extracting tenantId from authenticated user (req.user)
 * - Throwing an error if tenant context is missing (no fallback to tenant 1)
 * - Allowing explicit creator role overrides for cross-tenant admin operations
 * 
 * @param req - Express request object
 * @param options - Configuration options
 * @returns The resolved tenant ID
 * @throws Error if tenant context is missing and not optional
 */
export function resolveTenantContext(
  req: Request,
  options: {
    allowCreatorOverride?: boolean;  // Allow creator role to specify tenantId in query/body
    required?: boolean;                // If true (default), throw error if no tenant context
  } = { required: true }
): number | undefined {
  const { allowCreatorOverride = false, required = true } = options;
  
  // 1. Check if user has creator role and override is allowed
  if (allowCreatorOverride && req.user?.role === 'creator') {
    // Creator can specify tenantId in query or body
    const overrideTenantId = 
      (req.query.tenantId as string) || 
      (req.body?.tenantId as number);
    
    if (overrideTenantId) {
      const parsedId = typeof overrideTenantId === 'string' 
        ? parseInt(overrideTenantId, 10) 
        : overrideTenantId;
      
      if (!isNaN(parsedId)) {
        console.log(`[TENANT CONTEXT] Creator override: using tenantId ${parsedId}`);
        return parsedId;
      }
    }
  }
  
  // 2. Get tenant ID from authenticated user
  const tenantId = req.user?.tenantId;
  
  // 3. Validate tenant context exists
  if (tenantId === undefined || tenantId === null) {
    if (required) {
      throw new Error('Tenant context is required but missing. User must be authenticated with a valid tenant.');
    }
    return undefined;
  }
  
  return tenantId;
}

/**
 * Check if a trial tenant can create more tickets.
 * This function ONLY enforces limits for trial tenants (isTrial: true).
 * Regular/paid clients are completely unaffected and can create unlimited tickets.
 * 
 * @param tenantId - The tenant ID to check
 * @returns Object with { canCreate: boolean, reason?: string, ticketsCreated?: number, ticketLimit?: number }
 */
export async function checkTrialTicketLimit(tenantId: number): Promise<{
  canCreate: boolean;
  reason?: string;
  ticketsCreated?: number;
  ticketLimit?: number;
}> {
  try {
    const tenant = await storage.getTenantById(tenantId);
    
    // If tenant doesn't exist, prevent ticket creation
    if (!tenant) {
      return {
        canCreate: false,
        reason: 'Tenant not found'
      };
    }
    
    // If tenant is NOT a trial tenant, allow unlimited ticket creation
    // This ensures paid/regular clients are completely unaffected
    if (!tenant.isTrial) {
      return {
        canCreate: true
      };
    }
    
    // For trial tenants, check the limit
    const ticketsCreated = tenant.ticketsCreated || 0;
    const ticketLimit = tenant.ticketLimit || 10;
    
    if (ticketsCreated >= ticketLimit) {
      return {
        canCreate: false,
        reason: `Trial account ticket limit reached (${ticketsCreated}/${ticketLimit}). Please upgrade to create more tickets.`,
        ticketsCreated,
        ticketLimit
      };
    }
    
    // Trial tenant has not reached limit
    return {
      canCreate: true,
      ticketsCreated,
      ticketLimit
    };
  } catch (error) {
    console.error('Error checking trial ticket limit:', error);
    // On error, allow ticket creation to prevent breaking paid clients
    return {
      canCreate: true,
      reason: 'Error checking ticket limit, allowing creation'
    };
  }
}

/**
 * Increment the ticket counter for trial tenants ONLY.
 * Regular/paid clients are unaffected.
 * 
 * @param tenantId - The tenant ID to increment counter for
 */
export async function incrementTrialTicketCounter(tenantId: number): Promise<void> {
  try {
    const tenant = await storage.getTenantById(tenantId);
    
    // Only increment counter for trial tenants
    if (tenant && tenant.isTrial) {
      const newCount = (tenant.ticketsCreated || 0) + 1;
      await storage.updateTenant(tenantId, {
        ticketsCreated: newCount
      });
      console.log(`Trial tenant ${tenantId} ticket count: ${newCount}/${tenant.ticketLimit || 10}`);
    }
    // For non-trial tenants, do nothing (no counter increments)
  } catch (error) {
    console.error('Error incrementing trial ticket counter:', error);
    // Don't throw - we don't want to fail ticket creation if counter update fails
  }
}

// Using scrypt for password hashing
const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  // Use a fixed salt in production for consistent hashing
  // This is not ideal for security but helps with debugging
  const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_ENVIRONMENT === 'production';
  
  const salt = isProduction 
    ? "97a66c9a73dcdd3710d82daa6967a53b" // Fixed salt for production
    : randomBytes(16).toString("hex");    // Random salt for development
  
  console.log(`Hashing password with salt: ${salt}`);
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  try {
    // Validate that stored password has the expected format
    if (!stored || !stored.includes('.')) {
      console.error('Password comparison failed: Invalid stored password format');
      return false;
    }
    
    const [hashed, salt] = stored.split(".");
    console.log('Password comparison:', {
      suppliedLength: supplied.length,
      storedLength: stored.length,
      hashedLength: hashed.length,
      saltLength: salt.length
    });
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    // Compare the buffers
    const result = timingSafeEqual(hashedBuf, suppliedBuf);
    console.log('Password comparison result:', result);
    
    return result;
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
}

export async function setupAuth(app: Express) {
  // Determine if we're in a production environment
  const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_ENVIRONMENT === 'production';
  
  console.log(`Auth setup - Environment: ${isProduction ? 'Production' : 'Development'}`);
  console.log(`Using PostgreSQL session store: ${storage.sessionStore ? 'Yes' : 'No'}`);
  
  // For Replit deployments, create a basic cookie configuration
  const cookieConfig: session.CookieOptions = { 
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: false, // Setting secure: false works better with Replit deployments
    sameSite: "lax", 
    httpOnly: true,
    path: '/'
  };
  
  // Log cookie configuration
  console.log("Session cookie configuration:", cookieConfig);
  
  // Test session store connection before setting it up
  let sessionStore = storage.sessionStore;
  
  // Wrap PostgreSQL session store operations with automatic fallback on error
  try {
    // Quick connection test to verify session store is working
    const now = Date.now();
    await new Promise<void>((resolve, reject) => {
      const testTimeout = setTimeout(() => {
        console.warn("Session store connection test timed out");
        reject(new Error("Connection timeout"));
      }, 2000);
      
      storage.sessionStore.set(`test-${now}`, { cookie: { maxAge: 10000 }, test: "connection-test" } as any, (err) => {
        clearTimeout(testTimeout);
        if (err) {
          reject(err);
        } else {
          console.log("Session store connection test successful");
          resolve();
        }
      });
    });
  } catch (storeError) {
    console.error("Session store connection failed, using memory store:", storeError);
    
    // Create a memory store as fallback if the main store fails
    const MemoryStore = createMemoryStore(session);
    sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    console.log("Memory session store initialized as emergency fallback");
  }
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "super-secret-key-change-in-production",
    resave: true, // Changed to true to ensure session is saved
    saveUninitialized: true, // Changed to true to ensure new sessions are saved
    store: sessionStore, // Use our tested and verified store
    cookie: cookieConfig,
    name: 'ticket_support_sid', // Custom name for session cookie to avoid conflicts
    // Add error handling for session store operations
    unset: 'destroy' // Remove session from store when req.session is destroyed
  };

  app.use(session(sessionSettings));

  // Authentication middleware - adds the user to the request if logged in
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.session.userId) {
      try {
        const user = await storage.getUser(req.session.userId);
        if (user) {
          req.user = user;
          console.log("User authenticated via session:", user.id);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    } else {
      // Try to restore from backup methods if session doesn't have user ID
      
      // First try the backup session ID
      const backupSessionId = req.cookies?.ticket_support_sid_backup;
      if (backupSessionId) {
        console.log("Found backup session ID, attempting to recover session");
        console.log("Backup session ID:", backupSessionId);
      }
      
      // If that doesn't work, try the direct user ID cookie
      if (!req.user && req.cookies?.ticket_auth_user_id) {
        const userId = parseInt(req.cookies.ticket_auth_user_id);
        console.log("Found direct user ID cookie, attempting to recover user:", userId);
        
        if (!isNaN(userId)) {
          try {
            const user = await storage.getUser(userId);
            if (user) {
              // Restore both the session and the user object
              req.user = user;
              req.session.userId = user.id;
              console.log("User authenticated via backup cookie:", user.id);
              
              // Save the restored session
              await new Promise<void>((resolve) => {
                req.session.save(() => resolve());
              });
            }
          } catch (error) {
            console.error("Error restoring user from backup cookie:", error);
          }
        }
      }
    }
    next();
  });
  
  // Add middleware to check if user is a creator
  app.use(checkCreatorRole);

  // Middleware to require authentication
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    // Check if the user is authenticated
    if (req.user) {
      next();
    } else {
      // Try to restore the user from direct user ID cookie as a last resort
      const directUserId = req.cookies?.ticket_auth_user_id;
      
      if (directUserId) {
        const userId = parseInt(directUserId);
        if (!isNaN(userId)) {
          storage.getUser(userId).then(user => {
            if (user) {
              // User found, manually restore the session
              req.user = user;
              req.session.userId = user.id;
              
              // Save the session and continue
              req.session.save(() => {
                console.log(`User ${user.id} authenticated via direct cookie`);
                next();
              });
            } else {
              res.status(401).json({ message: "Unauthorized" });
            }
          }).catch(error => {
            console.error("Error restoring user from direct cookie:", error);
            res.status(401).json({ message: "Unauthorized" });
          });
        } else {
          res.status(401).json({ message: "Unauthorized" });
        }
      } else {
        res.status(401).json({ message: "Unauthorized" });
      }
    }
  };

  // Middleware to require specific roles
  const requireRole = (roles: string | string[]) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Allow if the user has one of the required roles OR is admin OR is creator
      if (allowedRoles.includes(req.user.role) || 
          req.user.role === 'admin' || 
          req.user.role === 'creator' ||
          req.user.role === 'administrator') {
        next();
      } else {
        res.status(403).json({ message: "Forbidden: Insufficient permissions" });
      }
    };
  };

  // Register routes - DISABLED PUBLIC REGISTRATION
  // This endpoint is disabled as registration is restricted to creator users only
  // See creator-routes.ts for the /api/creator/users endpoint that handles user registration
  app.post("/api/register", async (req, res) => {
    // Return an error message indicating that public registration is disabled
    return res.status(403).json({ 
      message: "Public registration is disabled. Please contact a creator user to create an account.",
      code: "REGISTRATION_DISABLED"
    });
  });

  app.post("/api/login", async (req, res) => {
    try {
      console.log("Login attempt received:", { 
        body: req.body,
        method: req.method,
        path: req.path,
        headers: { 
          'content-type': req.get('content-type'),
          'user-agent': req.get('user-agent') 
        }
      });
      
      const { username, password } = req.body;

      if (!username || !password) {
        console.log("Login failed: Missing username or password");
        return res.status(400).json({ message: "Username and password are required" });
      }

      let user;
      try {
        user = await storage.getUserByUsername(username);
        if (!user) {
          console.log(`Login failed: User ${username} not found`);
          return res.status(401).json({ message: "Invalid username or password" });
        }
        console.log(`User found: ${username} (ID: ${user.id})`);
      } catch (userError) {
        console.error("Error fetching user:", userError);
        return res.status(500).json({ 
          message: "Error fetching user account", 
          details: userError.message 
        });
      }

      // Verify password
      try {
        const isPasswordValid = await comparePasswords(password, user.password);
        if (!isPasswordValid) {
          console.log(`Login failed: Invalid password for user ${username}`);
          return res.status(401).json({ message: "Invalid username or password" });
        }
        console.log("Password verified successfully");
      } catch (passwordError) {
        console.error("Error verifying password:", passwordError);
        return res.status(500).json({ 
          message: "Error verifying password", 
          details: passwordError.message 
        });
      }

      // Set session
      try {
        // Set session directly
        req.session.userId = user.id;
        
        // Also manually set the user object
        req.user = user;
        
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error("Error saving session:", err);
              reject(err);
            } else {
              resolve();
            }
          });
        });
        
        // Additional cookie setting for more reliability
        res.cookie('ticket_support_sid_backup', req.session.id, {
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          secure: false,
          sameSite: "lax",
          httpOnly: true,
          path: '/'
        });
        
        // Set additional auth cookie with the user ID directly
        res.cookie('ticket_auth_user_id', user.id.toString(), {
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          secure: false,
          sameSite: "lax",
          httpOnly: true,
          path: '/'
        });
        
        console.log(`Session created for user ID: ${user.id}`);
        
        // Check that session was saved correctly
        console.log("Session data:", {
          id: req.session.id,
          cookie: JSON.stringify(req.session.cookie),
          userId: req.session.userId,
          user: req.user ? 'User object available' : 'No user object',
          sessionStore: req.sessionStore ? 'Session store available' : 'No session store found'
        });
      } catch (sessionError) {
        console.error("Error creating session:", sessionError);
        return res.status(500).json({ 
          message: "Error creating session", 
          details: sessionError.message 
        });
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      console.log("Login successful, sending response");
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ 
        message: "Internal server error", 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  app.post("/api/logout", (req, res) => {
    console.log("Logout attempt received for session ID:", req.session.id);
    
    // Clear all authentication cookies regardless of session state
    res.clearCookie('ticket_support_sid');
    res.clearCookie('ticket_support_sid_backup');
    res.clearCookie('ticket_auth_user_id');
    
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ message: "Failed to logout", details: err.message });
      }
      
      // Clear the session cookies
      res.clearCookie("ticket_support_sid", {
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: "lax"
      });
      
      res.clearCookie("ticket_support_sid_backup", {
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: "lax"
      });
      
      // Also clear the direct auth cookie
      res.clearCookie("ticket_auth_user_id", {
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: "lax"
      });
      
      console.log("Session destroyed and cookies cleared successfully");
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", async (req, res) => {
    try {
      // Add request trace ID for better debugging in production
      const traceId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      
      // Log session information with enhanced safety
      let sessionIdLog = 'No session ID available';
      try {
        sessionIdLog = req.session?.id || 'Session exists but no ID';
      } catch (sessionError) {
        console.error(`API user request [${traceId}] - Error accessing session ID:`, sessionError);
      }
      
      console.log(`API user request [${traceId}] - Session ID:`, sessionIdLog);
      
      // Safe version of session data logging
      let sessionDataLog = {
        userId: 'Error accessing userId',
        cookie: 'Error accessing cookie data',
        sessionStore: 'Error determining session store status'
      };
      
      try {
        sessionDataLog = {
          userId: req.session?.userId,
          cookie: req.session?.cookie ? JSON.stringify(req.session.cookie) : 'No cookie data',
          sessionStore: req.sessionStore ? 'Session store available' : 'No session store found'
        };
      } catch (sessionDataError) {
        console.error(`API user request [${traceId}] - Error accessing session data:`, sessionDataError);
      }
      
      console.log(`API user request [${traceId}] - Session data:`, sessionDataLog);
      
      // If user is in the request, we're all set
      if (req.user) {
        try {
          // Remove password from response with extra error handling
          const { password: _, ...userWithoutPassword } = req.user;
          
          // Fetch tenant information
          let tenantInfo = null;
          if (req.user.tenantId) {
            try {
              const tenant = await storage.getTenantById(req.user.tenantId);
              if (tenant) {
                tenantInfo = {
                  id: tenant.id,
                  name: tenant.name,
                  isTrial: tenant.isTrial,
                  ticketLimit: tenant.ticketLimit,
                  ticketsCreated: tenant.ticketsCreated
                };
              }
            } catch (tenantError) {
              console.error(`API user request [${traceId}] - Error fetching tenant:`, tenantError);
            }
          }
          
          console.log(`API user request [${traceId}] - Returning user data for:`, userWithoutPassword.username);
          return res.status(200).json({ ...userWithoutPassword, tenant: tenantInfo });
        } catch (userObjectError) {
          console.error(`API user request [${traceId}] - Error processing user object:`, userObjectError);
          // Don't fail, continue to try fallback mechanisms
        }
      }
      
      // No user in request, start trying fallback mechanisms
      console.log(`API user request [${traceId}] - User data: No user in request`);
      
      // 1. Try using the user ID from session
      if (req.session.userId) {
        try {
          console.log(`API user request [${traceId}] - Attempting to restore from session.userId:`, req.session.userId);
          
          // Try to get user from storage with error handling
          let user;
          try {
            user = await storage.getUser(req.session.userId);
          } catch (dbError) {
            console.error(`API user request [${traceId}] - Database error fetching user:`, dbError);
            
            // Check if this is a connection error and try to reconnect
            if (dbError && typeof dbError === 'object' && 
                (dbError.code === 'ECONNREFUSED' || dbError.code === '57P01' || 
                 dbError.code === '08006' || dbError.code === 'ETIMEDOUT')) {
              console.error(`API user request [${traceId}] - Database connection error, attempting reconnection...`);
              
              try {
                // Attempt to reconnect the database
                const db = await import('./db');
                await db.reconnectDb();
                
                // Try fetching the user again after reconnection
                console.log(`API user request [${traceId}] - Attempting to fetch user after reconnection`);
                user = await storage.getUser(req.session.userId);
              } catch (reconnectError) {
                console.error(`API user request [${traceId}] - Reconnection attempt failed:`, reconnectError);
              }
            }
          }
          
          if (user) {
            // Found user, restore session
            req.user = user;
            try {
              const { password: _, ...userWithoutPassword } = user;
              
              // Fetch tenant information
              let tenantInfo = null;
              if (user.tenantId) {
                try {
                  const tenant = await storage.getTenantById(user.tenantId);
                  if (tenant) {
                    tenantInfo = {
                      id: tenant.id,
                      name: tenant.name,
                      isTrial: tenant.isTrial,
                      ticketLimit: tenant.ticketLimit,
                      ticketsCreated: tenant.ticketsCreated
                    };
                  }
                } catch (tenantError) {
                  console.error(`API user request [${traceId}] - Error fetching tenant:`, tenantError);
                }
              }
              
              console.log(`API user request [${traceId}] - User restored from session.userId:`, user.id);
              return res.status(200).json({ ...userWithoutPassword, tenant: tenantInfo });
            } catch (responseError) {
              console.error(`API user request [${traceId}] - Error formatting user response:`, responseError);
            }
          } else {
            console.log(`API user request [${traceId}] - No user found for session.userId:`, req.session.userId);
          }
        } catch (err) {
          console.error(`API user request [${traceId}] - Error in session.userId fallback:`, err);
        }
      }
      
      // 2. Try using the backup session ID
      const backupSessionId = req.cookies?.ticket_support_sid_backup;
      if (backupSessionId) {
        console.log("Attempting user lookup using backup session ID:", backupSessionId);
        console.log("All cookies:", req.cookies);
      }
      
      // 3. Try using the direct user ID cookie
      const directUserId = req.cookies?.ticket_auth_user_id;
      if (directUserId) {
        try {
          console.log(`API user request [${traceId}] - Attempting to restore from direct user ID cookie:`, directUserId);
          
          const userId = parseInt(directUserId);
          if (!isNaN(userId)) {
            // Try to get user from storage with error handling
            let user;
            try {
              user = await storage.getUser(userId);
            } catch (dbError) {
              console.error(`API user request [${traceId}] - Database error fetching user:`, dbError);
              
              // Check if this is a connection error and try to reconnect
              if (dbError && typeof dbError === 'object' && 
                  (dbError.code === 'ECONNREFUSED' || dbError.code === '57P01' || 
                  dbError.code === '08006' || dbError.code === 'ETIMEDOUT')) {
                console.error(`API user request [${traceId}] - Database connection error, attempting reconnection...`);
                
                try {
                  // Attempt to reconnect the database
                  const db = await import('./db');
                  await db.reconnectDb();
                  
                  // Try fetching the user again after reconnection
                  console.log(`API user request [${traceId}] - Attempting to fetch user after reconnection`);
                  user = await storage.getUser(userId);
                } catch (reconnectError) {
                  console.error(`API user request [${traceId}] - Reconnection attempt failed:`, reconnectError);
                }
              }
            }
            
            if (user) {
              // Found user via direct ID cookie
              req.user = user;
              req.session.userId = user.id;
              
              // Save the session for future requests with error handling
              try {
                req.session.save((saveErr) => {
                  if (saveErr) {
                    console.error(`API user request [${traceId}] - Error saving session:`, saveErr);
                  } else {
                    console.log(`API user request [${traceId}] - Session saved with restored user ID:`, user.id);
                  }
                });
              } catch (saveError) {
                console.error(`API user request [${traceId}] - Exception saving session:`, saveError);
              }
              
              // Return the user data with error handling
              try {
                const { password: _, ...userWithoutPassword } = user;
                
                // Fetch tenant information
                let tenantInfo = null;
                if (user.tenantId) {
                  try {
                    const tenant = await storage.getTenantById(user.tenantId);
                    if (tenant) {
                      tenantInfo = {
                        id: tenant.id,
                        name: tenant.name,
                        isTrial: tenant.isTrial,
                        ticketLimit: tenant.ticketLimit,
                        ticketsCreated: tenant.ticketsCreated
                      };
                    }
                  } catch (tenantError) {
                    console.error(`API user request [${traceId}] - Error fetching tenant:`, tenantError);
                  }
                }
                
                console.log(`API user request [${traceId}] - User restored from direct ID cookie:`, user.id);
                return res.status(200).json({ ...userWithoutPassword, tenant: tenantInfo });
              } catch (responseError) {
                console.error(`API user request [${traceId}] - Error formatting user response:`, responseError);
              }
            }
          }
        } catch (err) {
          console.error(`API user request [${traceId}] - Error restoring user from direct ID cookie:`, err);
        }
      }
      
      // All restore attempts failed, for diagnostics, check if admin exists in database
      try {
        console.log(`API user request [${traceId}] - All restore attempts failed, checking admin user as a diagnostic step`);
        
        // Try to check admin with error handling
        let adminUser;
        try {
          adminUser = await storage.getUserByUsername('admin');
        } catch (dbError) {
          console.error(`API user request [${traceId}] - Database error checking admin:`, dbError);
          
          // Check if this is a connection error and try to reconnect
          if (dbError && typeof dbError === 'object' && 
              (dbError.code === 'ECONNREFUSED' || dbError.code === '57P01' || 
               dbError.code === '08006' || dbError.code === 'ETIMEDOUT')) {
            console.error(`API user request [${traceId}] - Database connection error, attempting reconnection...`);
            
            try {
              // Attempt to reconnect the database
              const db = await import('./db');
              await db.reconnectDb();
              
              // Try checking admin user again after reconnection
              console.log(`API user request [${traceId}] - Attempting to check admin after reconnection`);
              adminUser = await storage.getUserByUsername('admin');
            } catch (reconnectError) {
              console.error(`API user request [${traceId}] - Reconnection attempt failed:`, reconnectError);
            }
          }
        }
        
        console.log(`API user request [${traceId}] - Admin user exists in database:`, !!adminUser);
        if (adminUser) {
          console.log(`API user request [${traceId}] - Admin user ID:`, adminUser.id);
          
          // LAST RESORT: If we can find the admin user but couldn't restore the user session,
          // and this appears to be an internal API call (as indicated by specific headers),
          // we could consider a special fallback mechanism here for highly critical operations
          // This is commented out by default for security reasons
          /*
          const isInternalApiCall = req.headers['x-internal-api'] === 'true';
          if (isInternalApiCall && process.env.ENABLE_FALLBACK_ADMIN === 'true') {
            console.log(`API user request [${traceId}] - Using admin fallback for internal API call`);
            req.user = adminUser;
            req.session.userId = adminUser.id;
            
            // Save the session for future requests with error handling
            try {
              req.session.save();
            } catch (saveError) {
              console.error(`API user request [${traceId}] - Exception saving admin session:`, saveError);
            }
            
            // Return the admin user data for internal API calls only
            try {
              const { password: _, ...adminUserWithoutPassword } = adminUser;
              return res.status(200).json(adminUserWithoutPassword);
            } catch (responseError) {
              console.error(`API user request [${traceId}] - Error formatting admin response:`, responseError);
            }
          }
          */
        }
      } catch (dbError) {
        console.error(`API user request [${traceId}] - Failed to check admin user in database:`, dbError);
      }
      
      // No user found through any method
      return res.status(401).json({ message: "Not authenticated" });
    } catch (error) {
      console.error("Get user error:", error);
      
      // Handle database connection errors specially for better debugging
      try {
        if (error && typeof error === 'object') {
          // Get error code with safety checks
          let errorCode: string | undefined;
          try {
            errorCode = error.code ? error.code.toString() : undefined;
          } catch (e) {
            console.error(`API user request [${traceId}] - Error accessing error.code:`, e);
          }

          // Check for common database error codes
          const isDbConnectionError = errorCode && 
            ['ECONNREFUSED', '57P01', '08006', 'ETIMEDOUT', '08001', 'ENOTFOUND'].includes(errorCode);
          
          if (isDbConnectionError) {
            console.error(`API user request [${traceId}] - Database connection error in auth endpoint (${errorCode}), attempting reconnection...`);
            
            // Try to reconnect the database
            try {
              const db = await import('./db');
              db.reconnectDb().catch(e => console.error(`API user request [${traceId}] - Failed to reconnect DB:`, e));
            } catch (importError) {
              console.error(`API user request [${traceId}] - Failed to import db module:`, importError);
            }
            
            // Get more info about the error for diagnostics
            let errorDetails = 'Unknown database error';
            try {
              errorDetails = error.message || errorCode || 'No additional details';
            } catch (e) {
              console.error(`API user request [${traceId}] - Error accessing error properties:`, e);
            }
            
            // Return a specific error for database issues
            return res.status(503).json({ 
              message: "Error fetching user account",
              error_type: "database_connection",
              retry_after: 5, // Suggest retry after 5 seconds
              details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
            });
          }
        }
      } catch (errorHandlingError) {
        console.error(`API user request [${traceId}] - Error in database error handler:`, errorHandlingError);
      }
      
      // Get error message safely
      let errorMessage = 'Unknown error';
      try {
        if (error && typeof error === 'object' && error.message) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
      } catch (msgError) {
        console.error(`API user request [${traceId}] - Error getting error message:`, msgError);
      }
      
      // Generic error handling
      res.status(500).json({ 
        message: "Internal server error",
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? (error && typeof error === 'object' ? error.stack : undefined) : undefined
      });
    }
  });

  // List users - admin only
  app.get("/api/users", requireRole("admin"), async (req, res) => {
    try {
      // Get all users from database - implementation depends on your storage interface
      const allUsers = await db.select({
        id: users.id,
        username: users.username,
        role: users.role,
        name: users.name,
        email: users.email,
        teamId: users.teamId,
        createdAt: users.createdAt
      }).from(users);
      
      res.status(200).json(allUsers);
    } catch (error) {
      console.error("List users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return { requireAuth, requireRole };
}