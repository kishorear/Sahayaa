import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users, teams } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

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
      if (req.isCreatorUser) {
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
      if (req.isCreatorUser) {
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
  
  return router;
}