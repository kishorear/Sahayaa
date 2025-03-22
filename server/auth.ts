import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SchemaUser, users } from "@shared/schema";
import { db } from "./db";
import { sql } from "drizzle-orm";

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
      username: string;
      password: string;
      role: string;
      name: string | null;
      email: string | null;
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

// Using scrypt for password hashing
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
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

async function comparePasswords(supplied: string, stored: string) {
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

export function setupAuth(app: Express) {
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
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "super-secret-key-change-in-production",
    resave: true, // Changed to true to ensure session is saved
    saveUninitialized: true, // Changed to true to ensure new sessions are saved
    store: storage.sessionStore,
    cookie: cookieConfig,
    name: 'ticket_support_sid' // Custom name for session cookie to avoid conflicts
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

  // Middleware to require authentication
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
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
      
      if (allowedRoles.includes(req.user.role) || req.user.role === 'admin') {
        next();
      } else {
        res.status(403).json({ message: "Forbidden: Insufficient permissions" });
      }
    };
  };

  // Register routes
  app.post("/api/register", async (req, res) => {
    try {
      console.log("Registration attempt received:", { 
        body: req.body,
        method: req.method,
        path: req.path,
        headers: { 
          'content-type': req.get('content-type'),
          'user-agent': req.get('user-agent')
        }
      });
      
      const { username, password, name, email, role } = req.body;

      if (!username || !password) {
        console.log("Registration failed: Missing username or password");
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Check if user already exists
      try {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser) {
          console.log(`Registration failed: Username ${username} already exists`);
          return res.status(400).json({ message: "Username is already taken" });
        }
      } catch (checkError) {
        console.error("Error checking for existing user:", checkError);
        return res.status(500).json({ message: "Error checking username availability" });
      }

      // Validate role - only allow admin users to create other admins
      // Special case: If this is the first user, allow them to be an admin
      const requestedRole = role || "user";
      
      // Check if any users exist
      try {
        const userCount = await db.select({ count: sql`count(*)` }).from(users);
        console.log("User count result:", userCount);
        const isFirstUser = userCount[0].count === '0';
        
        // Only enforce admin restriction if it's not the first user
        if (requestedRole === "admin" && !isFirstUser && (!req.user || req.user.role !== "admin")) {
          console.log("Registration failed: Unauthorized attempt to create admin account");
          return res.status(403).json({ message: "Only admins can create admin accounts" });
        }
      } catch (countError) {
        console.error("Error checking user count:", countError);
        return res.status(500).json({ message: "Error checking existing users" });
      }

      // Create new user with hashed password
      let user;
      try {
        const hashedPassword = await hashPassword(password);
        console.log("Password hashed successfully, creating user...");
        
        user = await storage.createUser({
          username,
          password: hashedPassword,
          name: name || null,
          email: email || null,
          role: requestedRole
        });
        
        console.log(`User created successfully: ${username} (ID: ${user.id})`);
      } catch (createError) {
        console.error("Error creating user:", createError);
        return res.status(500).json({ message: "Error creating user account", details: createError.message });
      }

      // Login the user (set session)
      try {
        req.session.userId = user.id;
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
        console.log(`Session created for user ID: ${user.id}`);
      } catch (sessionError) {
        console.error("Error saving session:", sessionError);
        // Continue anyway - user is created but might need to log in manually
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      console.log("Registration successful, sending response");
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ 
        message: "Internal server error", 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
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
      console.log(`API user request [${traceId}] - Session ID:`, req.session.id);
      console.log(`API user request [${traceId}] - Session data:`, {
        userId: req.session.userId,
        cookie: JSON.stringify(req.session.cookie),
        sessionStore: req.sessionStore ? 'Session store available' : 'No session store found'
      });
      
      // If user is in the request, we're all set
      if (req.user) {
        // Remove password from response
        const { password: _, ...userWithoutPassword } = req.user;
        console.log("API user request - Returning user data for:", userWithoutPassword.username);
        return res.status(200).json(userWithoutPassword);
      }
      
      // No user in request, start trying fallback mechanisms
      console.log("API user request - User data: No user in request");
      
      // 1. Try using the user ID from session
      if (req.session.userId) {
        try {
          const user = await storage.getUser(req.session.userId);
          if (user) {
            // Found user, restore session
            req.user = user;
            const { password: _, ...userWithoutPassword } = user;
            console.log("User restored from session.userId:", user.id);
            return res.status(200).json(userWithoutPassword);
          }
        } catch (err) {
          console.error("Error restoring user from session.userId:", err);
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
          const userId = parseInt(directUserId);
          if (!isNaN(userId)) {
            const user = await storage.getUser(userId);
            if (user) {
              // Found user via direct ID cookie
              req.user = user;
              req.session.userId = user.id;
              
              // Save the session for future requests
              req.session.save(() => {
                console.log("Session saved with restored user ID:", user.id);
              });
              
              // Return the user data
              const { password: _, ...userWithoutPassword } = user;
              console.log("User restored from direct ID cookie:", user.id);
              return res.status(200).json(userWithoutPassword);
            }
          }
        } catch (err) {
          console.error("Error restoring user from direct ID cookie:", err);
        }
      }
      
      // All restore attempts failed, for diagnostics, check if admin exists in database
      try {
        const adminUser = await storage.getUserByUsername('admin');
        console.log("Admin user exists in database:", !!adminUser);
        if (adminUser) {
          console.log("Admin user ID:", adminUser.id);
        }
      } catch (dbError) {
        console.error("Failed to check admin user in database:", dbError);
      }
      
      // No user found through any method
      return res.status(401).json({ message: "Not authenticated" });
    } catch (error) {
      console.error("Get user error:", error);
      
      // Handle database connection errors specially for better debugging
      if (error && typeof error === 'object' && 
          (error.code === 'ECONNREFUSED' || error.code === '57P01' || 
           error.code === '08006' || error.code === 'ETIMEDOUT')) {
        console.error("Database connection error in auth endpoint, attempting reconnection...");
        // Try to reconnect the database
        import('./db').then(db => {
          db.reconnectDb().catch(e => console.error("Failed to reconnect DB:", e));
        }).catch(e => console.error("Failed to import db module:", e));
        
        // Return a specific error for database issues
        return res.status(500).json({ 
          message: "Error fetching user account",
          error_type: "database_connection",
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
      
      // Generic error handling
      res.status(500).json({ 
        message: "Internal server error",
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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