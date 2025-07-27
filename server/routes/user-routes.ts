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

  // Get all users (with strict tenant filtering for security)
  app.get("/api/users", requireRole(['admin', 'support-agent']), async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      
      // CRITICAL SECURITY: Only creator users can access cross-tenant data
      const isCreator = req.user?.role === 'creator' || (req as any).isCreatorUser;
      
      console.log(`User access request - User: ${req.user?.username}, Role: ${req.user?.role}, Tenant: ${tenantId}, Creator: ${isCreator}`);
      
      // TENANT ISOLATION: ALL non-creator users are restricted to their tenant
      const users = isCreator 
        ? await storage.getUsersByTenantId(0) // Creators can access all users
        : await storage.getUsersByTenantId(tenantId!); // All other users restricted to their tenant
      
      // Remove sensitive information from each user
      const safeUsers = users.map((user: any) => {
        const { password, mfaSecret, mfaBackupCodes, ...safeUser } = user;
        return safeUser;
      });
      
      console.log(`Retrieved ${safeUsers.length} users for ${isCreator ? 'creator' : 'tenant-restricted'} access`);
      
      return res.status(200).json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ message: "Failed to fetch users" });
    }
  });
}