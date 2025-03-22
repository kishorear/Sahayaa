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
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Determine if we're in a production environment
  const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_ENVIRONMENT === 'production';
  
  console.log(`Auth setup - Environment: ${isProduction ? 'Production' : 'Development'}`);
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "super-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: { 
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: false, // Setting secure: false works better with Replit deployments
      sameSite: "lax", 
      httpOnly: true
    }
  };

  app.use(session(sessionSettings));

  // Authentication middleware - adds the user to the request if logged in
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.session.userId) {
      try {
        const user = await storage.getUser(req.session.userId);
        if (user) {
          req.user = user;
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    }
    next();
  });

  // Middleware to require authentication
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (req.user) {
      next();
    } else {
      res.status(401).json({ message: "Unauthorized" });
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
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Verify password
      const isPasswordValid = await comparePasswords(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Set session
      req.session.userId = user.id;

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = req.user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
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