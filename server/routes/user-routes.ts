import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";

// Define the types for the middleware functions based on their implementation in auth.ts
type RequireAuthFunction = (req: Request, res: Response, next: NextFunction) => void;
type RequireRoleFunction = (roles: string | string[]) => (req: Request, res: Response, next: NextFunction) => void;

/**
 * Register user-related routes
 */
export function registerUserRoutes(
  app: Express, 
  requireAuth: RequireAuthFunction,
  requireRole: RequireRoleFunction
) {
  // Get a specific user by ID - Public endpoint to enable displaying usernames in tickets
  app.get("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Fetch the user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return only safe, non-sensitive user information
      const safeUser = {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt
      };
      
      return res.status(200).json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      return res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get all users (with optional tenant filtering)
  app.get("/api/users", requireRole(['admin', 'support-agent']), async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      
      // Admin users (creator role) can access all users
      const isCreator = req.user?.role === 'creator' || (req as any).isCreatorUser;
      
      // Only allow filtering by tenant for regular admins
      const users = isCreator 
        ? await storage.getUsersByTenantId(0) // Get all users by passing tenant 0 (a special case handler can be added in storage.ts)
        : await storage.getUsersByTenantId(tenantId!);
      
      // Remove sensitive information from each user
      const safeUsers = users.map((user: any) => {
        const { password, mfaSecret, mfaBackupCodes, ...safeUser } = user;
        return safeUser;
      });
      
      return res.status(200).json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ message: "Failed to fetch users" });
    }
  });
}