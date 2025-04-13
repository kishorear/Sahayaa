import { Express, Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { users, teams, insertTeamSchema } from '@shared/schema';
import { z } from 'zod';

/**
 * Helper function to get the userId from the session or cookie
 * @param req Express Request object
 * @returns userId or null if not authenticated
 */
function getUserIdFromRequest(req: Request): number | null {
  // Explicitly cast to fix TypeScript error with session
  const session = req.session as any;
  let userId = session?.userId as number | undefined;
  
  if (!userId) {
    const directAuthUserId = req.cookies?.ticket_auth_user_id;
    if (directAuthUserId) {
      userId = parseInt(directAuthUserId);
      if (isNaN(userId)) {
        return null;
      }
    } else {
      return null;
    }
  }
  
  return userId;
}

/**
 * Register team-related routes
 * @param app Express app
 * @param requireAuth Authentication middleware
 * @param requireRole Role-based access control middleware
 */
export const registerTeamRoutes = (
  app: Express,
  requireAuth: (req: Request, res: Response, next: Function) => void,
  requireRole: (role: string | string[]) => (req: Request, res: Response, next: Function) => void
) => {
  // Get teams
  app.get('/api/teams', requireAuth, async (req: Request, res: Response) => {
    try {
      // Get current user for tenant filtering
      const userId = getUserIdFromRequest(req);
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Get the user's tenant ID
      const userResult = await db.select({ tenantId: users.tenantId, role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (userResult.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const { tenantId, role } = userResult[0];
      
      // Get all teams for the tenant
      const teamsResult = await db.select()
        .from(teams)
        .where(eq(teams.tenantId, tenantId));
      
      return res.status(200).json(teamsResult);
    } catch (error) {
      console.error('Error fetching teams:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Create team (admin only)
  app.post('/api/teams', requireRole('admin'), async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validationResult = insertTeamSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Invalid team data', 
          errors: validationResult.error.errors 
        });
      }
      
      // Get current user for tenant context
      const userId = getUserIdFromRequest(req);
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Get the user's tenant ID
      const userResult = await db.select({ tenantId: users.tenantId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (userResult.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const tenantId = userResult[0].tenantId;
      
      // Create team
      const newTeam = await db.insert(teams)
        .values({
          name: req.body.name,
          description: req.body.description || null,
          tenantId,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return res.status(201).json(newTeam[0]);
    } catch (error) {
      console.error('Error creating team:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get team by ID
  app.get('/api/teams/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.id);
      
      if (isNaN(teamId)) {
        return res.status(400).json({ message: 'Invalid team ID' });
      }
      
      // Get current user for tenant filtering
      const userId = getUserIdFromRequest(req);
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Get the user's tenant ID
      const userResult = await db.select({ tenantId: users.tenantId, role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (userResult.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const { tenantId, role } = userResult[0];
      
      // Get team
      const teamResult = await db.select()
        .from(teams)
        .where(and(
          eq(teams.id, teamId),
          eq(teams.tenantId, tenantId)
        ))
        .limit(1);
      
      if (teamResult.length === 0) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      return res.status(200).json(teamResult[0]);
    } catch (error) {
      console.error('Error fetching team:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update team (admin only)
  app.put('/api/teams/:id', requireRole('admin'), async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.id);
      
      if (isNaN(teamId)) {
        return res.status(400).json({ message: 'Invalid team ID' });
      }
      
      // Validate request body
      const updateTeamSchema = z.object({
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional()
      });
      
      const validationResult = updateTeamSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Invalid team data', 
          errors: validationResult.error.errors 
        });
      }
      
      // Get current user for tenant filtering
      const userId = getUserIdFromRequest(req);
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Get the user's tenant ID
      const userResult = await db.select({ tenantId: users.tenantId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (userResult.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const tenantId = userResult[0].tenantId;
      
      // Check if team exists and belongs to the tenant
      const existingTeam = await db.select({ id: teams.id })
        .from(teams)
        .where(and(
          eq(teams.id, teamId),
          eq(teams.tenantId, tenantId)
        ))
        .limit(1);
      
      if (existingTeam.length === 0) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Update team
      const updateValues: any = { updatedAt: new Date() };
      
      if (req.body.name !== undefined) {
        updateValues.name = req.body.name;
      }
      
      if (req.body.description !== undefined) {
        updateValues.description = req.body.description;
      }
      
      const updatedTeam = await db.update(teams)
        .set(updateValues)
        .where(eq(teams.id, teamId))
        .returning();
      
      return res.status(200).json(updatedTeam[0]);
    } catch (error) {
      console.error('Error updating team:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Delete team (admin only)
  app.delete('/api/teams/:id', requireRole('admin'), async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.id);
      
      if (isNaN(teamId)) {
        return res.status(400).json({ message: 'Invalid team ID' });
      }
      
      // Get current user for tenant filtering
      const userId = getUserIdFromRequest(req);
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Get the user's tenant ID
      const userResult = await db.select({ tenantId: users.tenantId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (userResult.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const tenantId = userResult[0].tenantId;
      
      // Check if team exists and belongs to the tenant
      const existingTeam = await db.select({ id: teams.id })
        .from(teams)
        .where(and(
          eq(teams.id, teamId),
          eq(teams.tenantId, tenantId)
        ))
        .limit(1);
      
      if (existingTeam.length === 0) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Check if it's the default team
      const defaultTeam = await db.select({ id: teams.id })
        .from(teams)
        .where(and(
          eq(teams.name, 'Default Team'),
          eq(teams.tenantId, tenantId)
        ))
        .limit(1);
      
      if (defaultTeam.length > 0 && defaultTeam[0].id === teamId) {
        return res.status(400).json({ message: 'Cannot delete the default team' });
      }
      
      // Check if the team has members
      const teamMembers = await db.select({ id: users.id })
        .from(users)
        .where(eq(users.teamId, teamId))
        .limit(1);
      
      if (teamMembers.length > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete a team with members. Please reassign members to another team first.' 
        });
      }
      
      // Delete the team
      await db.delete(teams)
        .where(eq(teams.id, teamId));
      
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting team:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get team members
  app.get('/api/teams/:id/members', requireAuth, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.id);
      
      if (isNaN(teamId)) {
        return res.status(400).json({ message: 'Invalid team ID' });
      }
      
      // Get current user for tenant filtering
      const userId = getUserIdFromRequest(req);
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Get the user's tenant ID
      const userResult = await db.select({ tenantId: users.tenantId, role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (userResult.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const { tenantId, role } = userResult[0];
      
      // Check if team exists and belongs to the tenant
      const teamResult = await db.select({ id: teams.id })
        .from(teams)
        .where(and(
          eq(teams.id, teamId),
          eq(teams.tenantId, tenantId)
        ))
        .limit(1);
      
      if (teamResult.length === 0) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Get team members
      const members = await db.select({
        id: users.id,
        username: users.username,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt
      })
      .from(users)
      .where(and(
        eq(users.teamId, teamId),
        eq(users.tenantId, tenantId)
      ));
      
      return res.status(200).json(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Assign user to team (admin only)
  app.post('/api/teams/:teamId/members/:userId', requireRole('admin'), async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const assignUserId = parseInt(req.params.userId);
      
      if (isNaN(teamId) || isNaN(assignUserId)) {
        return res.status(400).json({ message: 'Invalid team or user ID' });
      }
      
      // Get current user for tenant filtering
      const userId = getUserIdFromRequest(req);
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Get the admin's tenant ID
      const adminResult = await db.select({ tenantId: users.tenantId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (adminResult.length === 0) {
        return res.status(404).json({ message: 'Admin user not found' });
      }
      
      const tenantId = adminResult[0].tenantId;
      
      // Check if team exists and belongs to the tenant
      const teamResult = await db.select({ id: teams.id })
        .from(teams)
        .where(and(
          eq(teams.id, teamId),
          eq(teams.tenantId, tenantId)
        ))
        .limit(1);
      
      if (teamResult.length === 0) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Check if user exists and belongs to the tenant
      const userToAssign = await db.select()
        .from(users)
        .where(and(
          eq(users.id, assignUserId),
          eq(users.tenantId, tenantId)
        ))
        .limit(1);
      
      if (userToAssign.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Update user's team
      const updatedUser = await db.update(users)
        .set({ 
          teamId: teamId,
          updatedAt: new Date()
        })
        .where(eq(users.id, assignUserId))
        .returning({
          id: users.id,
          username: users.username,
          name: users.name,
          email: users.email,
          role: users.role,
          teamId: users.teamId
        });
      
      return res.status(200).json(updatedUser[0]);
    } catch (error) {
      console.error('Error assigning user to team:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Remove user from team (admin only)
  app.delete('/api/teams/:teamId/members/:userId', requireRole('admin'), async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const removeUserId = parseInt(req.params.userId);
      
      if (isNaN(teamId) || isNaN(removeUserId)) {
        return res.status(400).json({ message: 'Invalid team or user ID' });
      }
      
      // Get current user for tenant filtering
      const userId = getUserIdFromRequest(req);
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Get the admin's tenant ID
      const adminResult = await db.select({ tenantId: users.tenantId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (adminResult.length === 0) {
        return res.status(404).json({ message: 'Admin user not found' });
      }
      
      const tenantId = adminResult[0].tenantId;
      
      // Check if user exists, belongs to the tenant, and is in the specified team
      const userToRemove = await db.select()
        .from(users)
        .where(and(
          eq(users.id, removeUserId),
          eq(users.tenantId, tenantId),
          eq(users.teamId, teamId)
        ))
        .limit(1);
      
      if (userToRemove.length === 0) {
        return res.status(404).json({ message: 'User not found in the specified team' });
      }
      
      // Get default team
      const defaultTeam = await db.select()
        .from(teams)
        .where(and(
          eq(teams.name, 'Default Team'),
          eq(teams.tenantId, tenantId)
        ))
        .limit(1);
      
      let defaultTeamId = null;
      if (defaultTeam.length > 0) {
        defaultTeamId = defaultTeam[0].id;
      }
      
      // Update user's team to default or null
      const updatedUser = await db.update(users)
        .set({ 
          teamId: defaultTeamId,
          updatedAt: new Date()
        })
        .where(eq(users.id, removeUserId))
        .returning({
          id: users.id,
          username: users.username,
          name: users.name,
          email: users.email,
          role: users.role,
          teamId: users.teamId
        });
      
      return res.status(200).json(updatedUser[0]);
    } catch (error) {
      console.error('Error removing user from team:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
};