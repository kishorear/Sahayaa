import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuthFunction, requireRoleFunction } from "../types/middleware-types";

/**
 * Register user-related routes
 */
export function registerUserRoutes(
  app: Express, 
  requireAuth: requireAuthFunction,
  requireRole: requireRoleFunction
) {
  // Get a specific user by ID
  app.get("/api/users/:id", requireAuth, async (req: Request, res: Response) => {
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

      // Remove sensitive information
      const { password, mfaSecret, mfaBackupCodes, ...safeUser } = user;
      
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
      const isCreator = req.user?.role === 'creator' || req.isCreatorUser;
      
      // Only allow filtering by tenant for regular admins
      const users = isCreator 
        ? await storage.getAllUsers() 
        : await storage.getUsersByTenantId(tenantId!);
      
      // Remove sensitive information from each user
      const safeUsers = users.map(user => {
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