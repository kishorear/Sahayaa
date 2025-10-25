import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users, teams } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { hashPassword } from '../auth';
import { requirePermission } from '../permissions';

const router = Router();

/**
 * Registers team member routes
 * @param app Express application
 * @param requireRole Middleware to require specific roles
 */
export function registerTeamMemberRoutes(app: any, requireRole: Function) {
  // Add user to team
  app.post("/api/teams/:teamId/members/:userId", requireRole(['admin', 'creator']), async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const userId = parseInt(req.params.userId);
      
      if (isNaN(teamId) || isNaN(userId)) {
        return res.status(400).json({ message: "Invalid team or user ID" });
      }
      
      // Get the tenant context from the user
      const tenantId = req.user?.tenantId || 1;
      
      // If user is a creator, allow cross-tenant operations
      if (req.user?.role === 'creator') {
        console.log(`Creator role detected - adding user ${userId} to team ${teamId} with cross-tenant access`);
        
        // Verify team exists (no tenant restriction)
        const teamResult = await db.select().from(teams)
          .where(eq(teams.id, teamId))
          .limit(1);
        
        if (teamResult.length === 0) {
          return res.status(404).json({ message: "Team not found" });
        }
        
        // Get the team's tenant ID to ensure user and team are in same tenant
        const teamTenantId = teamResult[0].tenantId;
        
        // Verify user exists
        const userResult = await db.select().from(users)
          .where(eq(users.id, userId))
          .limit(1);
        
        if (userResult.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }
        
        // Add user to team - only if user and team belong to same tenant
        if (userResult[0].tenantId !== teamTenantId) {
          return res.status(400).json({ 
            message: "Cannot add user to team in different tenant", 
            userTenantId: userResult[0].tenantId,
            teamTenantId: teamTenantId
          });
        }
        
        const result = await db.update(users)
          .set({ teamId })
          .where(eq(users.id, userId))
          .returning();
          
        return res.status(200).json(result[0]);
      }
      
      // Regular tenant-specific operations for non-creator users
      // Verify team exists and belongs to tenant
      const teamResult = await db.select().from(teams)
        .where(and(
          eq(teams.id, teamId),
          eq(teams.tenantId, tenantId)
        ))
        .limit(1);
      
      if (teamResult.length === 0) {
        return res.status(404).json({ message: "Team not found or access denied" });
      }
      
      // Verify user exists and belongs to tenant
      const userResult = await db.select().from(users)
        .where(and(
          eq(users.id, userId),
          eq(users.tenantId, tenantId)
        ))
        .limit(1);
      
      if (userResult.length === 0) {
        return res.status(404).json({ message: "User not found or access denied" });
      }
      
      // Add user to team
      const result = await db.update(users)
        .set({ teamId })
        .where(and(
          eq(users.id, userId),
          eq(users.tenantId, tenantId)
        ))
        .returning();
      
      return res.status(200).json(result[0]);
    } catch (error) {
      console.error('Error adding user to team:', error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Remove user from team
  app.delete("/api/teams/:teamId/members/:userId", requireRole(['admin', 'creator']), async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const userId = parseInt(req.params.userId);
      
      if (isNaN(teamId) || isNaN(userId)) {
        return res.status(400).json({ message: "Invalid team or user ID" });
      }
      
      // Get the tenant context from the user
      const tenantId = req.user?.tenantId || 1;
      
      // If user is a creator, allow cross-tenant operations
      if (req.user?.role === 'creator') {
        console.log(`Creator role detected - removing user ${userId} from team ${teamId} with cross-tenant access`);
        
        // Verify user exists and is in the team without tenant restriction
        const userResult = await db.select().from(users)
          .where(and(
            eq(users.id, userId),
            eq(users.teamId, teamId)
          ))
          .limit(1);
        
        if (userResult.length === 0) {
          return res.status(404).json({ message: "User not found or not in the team" });
        }
        
        // Remove user from team
        const result = await db.update(users)
          .set({ teamId: null })
          .where(eq(users.id, userId))
          .returning();
          
        return res.status(200).json(result[0]);
      }
      
      // Regular tenant-specific operations for non-creator users
      // Verify user exists, belongs to tenant, and is in the team
      const userResult = await db.select().from(users)
        .where(and(
          eq(users.id, userId),
          eq(users.tenantId, tenantId),
          eq(users.teamId, teamId)
        ))
        .limit(1);
      
      if (userResult.length === 0) {
        return res.status(404).json({ message: "User not found, not in the team, or access denied" });
      }
      
      // Remove user from team
      const result = await db.update(users)
        .set({ teamId: null })
        .where(and(
          eq(users.id, userId),
          eq(users.tenantId, tenantId)
        ))
        .returning();
      
      return res.status(200).json(result[0]);
    } catch (error) {
      console.error('Error removing user from team:', error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get all team members (used by the TeamPage.tsx)
  app.get("/api/team-members", requirePermission('canViewUsers'), async (req: Request, res: Response) => {
    try {
      // Get the tenant context from the user
      const tenantId = req.user?.tenantId || 1;
      
      // Handle different user roles
      if (req.user?.role === 'creator') {
        console.log(`Creator role detected - retrieving all team members with cross-tenant access`);
        
        // Creator can access all tenants or filter by specific tenant
        let whereClause;
        
        if (req.query.tenantId) {
          const queryTenantId = parseInt(req.query.tenantId as string);
          if (!isNaN(queryTenantId)) {
            whereClause = eq(users.tenantId, queryTenantId);
          }
        }
        
        // Execute the query with the where clause if it exists
        const result = whereClause
          ? await db.select().from(users).where(whereClause)
          : await db.select().from(users);
        return res.status(200).json(result);
      } else if (req.user?.role === 'administrator' || req.user?.role === 'admin') {
        console.log(`Administrator role detected - retrieving team members for tenant ${tenantId}`);
        
        // Administrators can only access users within their tenant
        const result = await db.select()
          .from(users)
          .where(eq(users.tenantId, tenantId));
        return res.status(200).json(result);
      }
      
      // Regular tenant-specific operations for any other roles
      const result = await db.select()
        .from(users)
        .where(eq(users.tenantId, tenantId));
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching team members:', error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get a specific team member
  app.get("/api/team-members/:id", requirePermission('canViewUsers'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Get the tenant context from the user
      const tenantId = req.user?.tenantId || 1;
      
      // Handle different user roles
      if (req.user?.role === 'creator') {
        console.log(`Creator role detected - retrieving team member ${id} with cross-tenant access`);
        
        // Creator can access any user across tenants
        const result = await db.select().from(users)
          .where(eq(users.id, id))
          .limit(1);
        
        if (result.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }
        
        return res.status(200).json(result[0]);
      } else if (req.user?.role === 'administrator' || req.user?.role === 'admin') {
        console.log(`Administrator role detected - retrieving team member ${id} for tenant ${tenantId}`);
        
        // Administrators can only access users within their tenant
        const result = await db.select().from(users)
          .where(and(
            eq(users.id, id),
            eq(users.tenantId, tenantId)
          ))
          .limit(1);
        
        if (result.length === 0) {
          return res.status(404).json({ message: "User not found or access denied" });
        }
        
        return res.status(200).json(result[0]);
      }
      
      // Regular tenant-specific operations for other roles
      const result = await db.select().from(users)
        .where(and(
          eq(users.id, id),
          eq(users.tenantId, tenantId)
        ))
        .limit(1);
      
      if (result.length === 0) {
        return res.status(404).json({ message: "User not found or access denied" });
      }
      
      return res.status(200).json(result[0]);
    } catch (error) {
      console.error('Error fetching team member:', error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Create a new team member
  app.post("/api/team-members", requirePermission('canManageUsers'), async (req: Request, res: Response) => {
    try {
      const { username, password, role, name, email } = req.body;
      
      if (!username || !password || !role) {
        return res.status(400).json({ message: "Missing required fields: username, password, and role are required" });
      }
      
      // Get the tenant context from the user
      const tenantId = req.user?.tenantId || 1;
      
      // Check if username already exists
      const existingUser = await db.select().from(users)
        .where(eq(users.username, username))
        .limit(1);
      
      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Hash the password
      const hashedPassword = await hashPassword(password);
      
      // Create the user
      const result = await db.insert(users)
        .values({
          username,
          password: hashedPassword,
          role,
          name: name || null,
          email: email || null,
          tenantId,
          teamId: null,
          mfaEnabled: false,
          ssoEnabled: false,
          profilePicture: null,
        })
        .returning();
      
      if (result.length === 0) {
        return res.status(500).json({ message: "Failed to create user" });
      }
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = result[0];
      
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error('Error creating team member:', error);
      return res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });
  
  // Update a team member
  app.patch("/api/team-members/:id", requirePermission('canManageUsers'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const { username, password, role, name, email } = req.body;
      
      // Get the tenant context from the user
      const tenantId = req.user?.tenantId || 1;
      
      // Prepare update data
      const updateData: any = {};
      
      if (username) updateData.username = username;
      if (role) updateData.role = role;
      if (name !== undefined) updateData.name = name || null;
      if (email !== undefined) updateData.email = email || null;
      
      // If password is provided, hash it
      if (password) {
        updateData.password = await hashPassword(password);
      }
      
      // Handle different user roles
      if (req.user?.role === 'creator') {
        console.log(`Creator role detected - updating team member ${id} with cross-tenant access`);
        
        // Creator can update any user across tenants
        const userResult = await db.select().from(users)
          .where(eq(users.id, id))
          .limit(1);
        
        if (userResult.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }
        
        // Update the user
        const result = await db.update(users)
          .set(updateData)
          .where(eq(users.id, id))
          .returning();
        
        if (result.length === 0) {
          return res.status(500).json({ message: "Failed to update user" });
        }
        
        // Remove password from response
        const { password: _, ...userWithoutPassword } = result[0];
        
        return res.status(200).json(userWithoutPassword);
      } else if (req.user?.role === 'administrator' || req.user?.role === 'admin') {
        console.log(`Administrator role detected - updating team member ${id} for tenant ${tenantId}`);
        
        // Administrators can only update users within their tenant
        const userResult = await db.select().from(users)
          .where(and(
            eq(users.id, id),
            eq(users.tenantId, tenantId)
          ))
          .limit(1);
        
        if (userResult.length === 0) {
          return res.status(404).json({ message: "User not found or access denied" });
        }
        
        // Update the user
        const result = await db.update(users)
          .set(updateData)
          .where(and(
            eq(users.id, id),
            eq(users.tenantId, tenantId)
          ))
          .returning();
        
        if (result.length === 0) {
          return res.status(500).json({ message: "Failed to update user" });
        }
        
        // Remove password from response
        const { password: _, ...userWithoutPassword } = result[0];
        
        return res.status(200).json(userWithoutPassword);
      }
      
      // Regular tenant-specific operations for other roles
      
      // Check if user exists and belongs to tenant
      const userResult = await db.select().from(users)
        .where(and(
          eq(users.id, id),
          eq(users.tenantId, tenantId)
        ))
        .limit(1);
      
      if (userResult.length === 0) {
        return res.status(404).json({ message: "User not found or access denied" });
      }
      
      // Update the user
      const result = await db.update(users)
        .set(updateData)
        .where(and(
          eq(users.id, id),
          eq(users.tenantId, tenantId)
        ))
        .returning();
      
      if (result.length === 0) {
        return res.status(500).json({ message: "Failed to update user" });
      }
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = result[0];
      
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error('Error updating team member:', error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Delete a team member
  app.delete("/api/team-members/:id", requirePermission('canManageUsers'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Get the tenant context from the user
      const tenantId = req.user?.tenantId || 1;
      
      // Handle different user roles
      if (req.user?.role === 'creator') {
        console.log(`Creator role detected - deleting team member ${id} with cross-tenant access`);
        
        // Creator can delete any user across tenants
        const userResult = await db.select().from(users)
          .where(eq(users.id, id))
          .limit(1);
        
        if (userResult.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }
        
        // Delete the user
        const result = await db.delete(users)
          .where(eq(users.id, id))
          .returning();
        
        if (result.length === 0) {
          return res.status(500).json({ message: "Failed to delete user" });
        }
        
        return res.status(200).json({ message: "User deleted successfully" });
      } else if (req.user?.role === 'administrator' || req.user?.role === 'admin') {
        console.log(`Administrator role detected - deleting team member ${id} for tenant ${tenantId}`);
        
        // Administrators can only delete users within their tenant
        const userResult = await db.select().from(users)
          .where(and(
            eq(users.id, id),
            eq(users.tenantId, tenantId)
          ))
          .limit(1);
        
        if (userResult.length === 0) {
          return res.status(404).json({ message: "User not found or access denied" });
        }
        
        // Delete the user
        const result = await db.delete(users)
          .where(and(
            eq(users.id, id),
            eq(users.tenantId, tenantId)
          ))
          .returning();
        
        if (result.length === 0) {
          return res.status(500).json({ message: "Failed to delete user" });
        }
        
        return res.status(200).json({ message: "User deleted successfully" });
      }
      
      // Regular tenant-specific operations for other roles
      
      // Check if user exists and belongs to tenant
      const userResult = await db.select().from(users)
        .where(and(
          eq(users.id, id),
          eq(users.tenantId, tenantId)
        ))
        .limit(1);
      
      if (userResult.length === 0) {
        return res.status(404).json({ message: "User not found or access denied" });
      }
      
      // Delete the user
      const result = await db.delete(users)
        .where(and(
          eq(users.id, id),
          eq(users.tenantId, tenantId)
        ))
        .returning();
      
      if (result.length === 0) {
        return res.status(500).json({ message: "Failed to delete user" });
      }
      
      return res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error('Error deleting team member:', error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  return router;
}