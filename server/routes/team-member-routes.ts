import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertUserSchema, User } from "@shared/schema";

export function registerTeamMemberRoutes(app: Express, requireRole: (roles: string[]) => any) {
  // Get all team members (users)
  app.get("/api/team-members", requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      // Get the tenant ID from the authenticated user or request
      const tenantId = req.user?.tenantId || 1;
      
      // Fetch all users for this tenant
      const users = await storage.getUsersByTenantId(tenantId);
      
      // Remove sensitive information before sending
      const sanitizedUsers = users.map(user => {
        const { password, mfaSecret, mfaBackupCodes, ...safeUser } = user;
        return safeUser;
      });
      
      res.status(200).json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Error fetching team members" });
    }
  });

  // Get a specific team member
  app.get("/api/team-members/:id", requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = req.user?.tenantId || 1;
      
      // Fetch the user
      const user = await storage.getUser(id);
      
      // Check if user exists and belongs to the current tenant
      if (!user || user.tenantId !== tenantId) {
        return res.status(404).json({ message: "Team member not found" });
      }
      
      // Remove sensitive information
      const { password, mfaSecret, mfaBackupCodes, ...safeUser } = user;
      
      res.status(200).json(safeUser);
    } catch (error) {
      console.error("Error fetching team member:", error);
      res.status(500).json({ message: "Error fetching team member" });
    }
  });

  // Create a new team member
  app.post("/api/team-members", requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId || 1;
      
      // Validate the request data
      const userData = insertUserSchema
        .extend({
          // Ensure role is one of the valid roles
          role: z.enum(['admin', 'support-agent', 'engineer', 'user']),
        })
        .parse({ ...req.body, tenantId });
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser && existingUser.tenantId === tenantId) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Create the user
      const newUser = await storage.createUser(userData);
      
      // Remove sensitive information
      const { password, mfaSecret, mfaBackupCodes, ...safeUser } = newUser;
      
      res.status(201).json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating team member:", error);
      res.status(500).json({ message: "Error creating team member" });
    }
  });

  // Update a team member
  app.patch("/api/team-members/:id", requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = req.user?.tenantId || 1;
      
      // Fetch the existing user
      const existingUser = await storage.getUser(id);
      
      // Check if user exists and belongs to the current tenant
      if (!existingUser || existingUser.tenantId !== tenantId) {
        return res.status(404).json({ message: "Team member not found" });
      }
      
      // Validate the update data
      const updateSchema = z.object({
        username: z.string().optional(),
        role: z.enum(['admin', 'support-agent', 'engineer', 'user']).optional(),
        name: z.string().nullable().optional(),
        email: z.string().email().nullable().optional(),
        password: z.string().min(6).optional(),
      });
      
      const updateData = updateSchema.parse(req.body);
      
      // Check if a new username already exists (if username is being updated)
      if (updateData.username && updateData.username !== existingUser.username) {
        const userWithSameUsername = await storage.getUserByUsername(updateData.username);
        if (userWithSameUsername && userWithSameUsername.tenantId === tenantId) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }
      
      // Update the user
      const updatedUser = await storage.updateUser(id, updateData);
      
      // Remove sensitive information
      const { password, mfaSecret, mfaBackupCodes, ...safeUser } = updatedUser;
      
      res.status(200).json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating team member:", error);
      res.status(500).json({ message: "Error updating team member" });
    }
  });

  // Delete a team member
  app.delete("/api/team-members/:id", requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = req.user?.tenantId || 1;
      
      // Fetch the user
      const user = await storage.getUser(id);
      
      // Check if user exists and belongs to the current tenant
      if (!user || user.tenantId !== tenantId) {
        return res.status(404).json({ message: "Team member not found" });
      }
      
      // Prevent deleting your own account
      if (user.id === req.user?.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      // Delete the user
      await storage.deleteUser(id);
      
      res.status(200).json({ message: "Team member deleted successfully" });
    } catch (error) {
      console.error("Error deleting team member:", error);
      res.status(500).json({ message: "Error deleting team member" });
    }
  });
}