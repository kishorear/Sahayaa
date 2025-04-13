import { NextFunction, Request, Response, Express } from "express";
import { eq } from "drizzle-orm";
import * as bcrypt from "bcrypt";
import { db } from "./db";
import { users, tenants } from "@shared/schema";

// Hash password utility function
async function hashPassword(password: string) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Compare passwords utility function
async function comparePasswords(supplied: string, stored: string) {
  return bcrypt.compare(supplied, stored);
}

export async function setupAuth(app: Express) {
  // Register route
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, name, email, role, tenantId, newTeam } = req.body;
      
      // Validate input
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Check if username already exists
      const existingUser = await db.select({ id: users.id })
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      
      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Create new user
      const newUser = await db.insert(users).values({
        username,
        password: hashedPassword,
        name: name || null,
        email: email || null,
        role: role || "user",
        tenantId: tenantId || 1,
        teamId: null, // Will be updated after team processing
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: null,
        ssoEnabled: false,
        ssoProvider: null,
        ssoProviderId: null,
        ssoProviderData: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Set session
      if (req.session) {
        req.session.userId = newUser[0].id;
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = newUser[0];
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login route
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Validate input
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Find user by username
      const user = await db.select().from(users).where(eq(users.username, username)).limit(1);
      
      if (user.length === 0) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Compare passwords
      const passwordMatch = await comparePasswords(password, user[0].password);
      
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session
      if (req.session) {
        req.session.userId = user[0].id;
      }

      // Set direct auth cookie as fallback
      res.cookie("ticket_auth_user_id", user[0].id.toString(), {
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Return user without password
      const { password: _, ...userWithoutPassword } = user[0];
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout route
  app.post("/api/auth/logout", (req, res) => {
    // Destroy session
    req.session?.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
      }
      
      // Clear auth cookie
      res.clearCookie("ticket_auth_user_id", {
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: "lax"
      });
      
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // Get current user route
  app.get("/api/user", async (req, res) => {
    try {
      // Check session for userId
      if (req.session?.userId) {
        const userFromSession = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
        
        if (userFromSession.length > 0) {
          // User found via session
          const user = userFromSession[0];
          const { password: _, ...userWithoutPassword } = user;
          return res.status(200).json(userWithoutPassword);
        }
      }
      
      // Check for direct auth cookie (fallback)
      const directAuthUserId = req.cookies?.ticket_auth_user_id;
      
      if (directAuthUserId) {
        const userFromDirectAuth = await db.select().from(users).where(eq(users.id, parseInt(directAuthUserId))).limit(1);
        
        if (userFromDirectAuth.length > 0) {
          // User found via direct auth
          const user = userFromDirectAuth[0];
          
          // Update the session to include this user for next time
          if (req.session) {
            req.session.userId = user.id;
          }
          
          const { password: _, ...userWithoutPassword } = user;
          return res.status(200).json(userWithoutPassword);
        } else {
          // Clear the invalid cookie
          res.clearCookie("ticket_auth_user_id", {
            path: '/',
            httpOnly: true,
            secure: false,
            sameSite: "lax"
          });
        }
      }
      
      // No user found
      return res.status(401).json({ message: "Not authenticated" });
    } catch (error) {
      console.error("Get user error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Authentication middleware
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (req.session?.userId) {
      return next();
    }
    
    // Check for direct auth cookie
    const directAuthUserId = req.cookies?.ticket_auth_user_id;
    if (directAuthUserId) {
      return next();
    }
    
    return res.status(401).json({ message: "Authentication required" });
  };

  // Role-based access control middleware
  const requireRole = (role: string | string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Get user ID from session or cookie
        let userId = req.session?.userId;
        
        if (!userId) {
          const directAuthUserId = req.cookies?.ticket_auth_user_id;
          if (!directAuthUserId) {
            return res.status(401).json({ message: "Authentication required" });
          }
          userId = parseInt(directAuthUserId);
        }
        
        // Fetch user
        const user = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
        
        if (user.length === 0) {
          return res.status(401).json({ message: "User not found" });
        }
        
        // Check role
        const userRole = user[0].role;
        const roles = Array.isArray(role) ? role : [role];
        
        if (roles.includes(userRole) || userRole === "admin") {
          return next();
        }
        
        return res.status(403).json({ message: "Insufficient permissions" });
      } catch (error) {
        console.error("Role check error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    };
  };

  // Error handler for auth routes
  app.use("/api/auth", (error: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Auth error:", error);
    return res.status(500).json({ message: "Internal server error" });
  });

  return { requireAuth, requireRole };
}