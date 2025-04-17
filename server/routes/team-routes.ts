import { Router, Request, Response } from 'express';
import { db } from '../db';
import { teams, users, tenants, InsertTeam } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/teams
 * Get all teams for the current user's tenant
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const tenantId = req.user.tenantId;
    
    // If user is a creator, allow cross-tenant access
    if (req.isCreatorUser) {
      console.log('Creator role detected - fetching teams across all tenants');
      const result = await db.select().from(teams);
      return res.status(200).json(result);
    }
    
    // Regular tenant-specific query for non-creator users
    const result = await db.select().from(teams)
      .where(eq(teams.tenantId, tenantId));
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return res.status(500).json({ message: 'Error fetching teams' });
  }
});

/**
 * GET /api/teams/:id
 * Get a team by ID (only if it belongs to the user's tenant)
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ message: 'Invalid team ID' });
    }
    
    const tenantId = req.user.tenantId;
    
    // If user is a creator, allow cross-tenant access
    if (req.isCreatorUser) {
      console.log(`Creator role detected - fetching team ${teamId} with cross-tenant access`);
      const result = await db.select().from(teams)
        .where(eq(teams.id, teamId))
        .limit(1);
        
      if (result.length === 0) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      return res.status(200).json(result[0]);
    }
    
    // Regular tenant-specific query for non-creator users
    const result = await db.select().from(teams)
      .where(and(
        eq(teams.id, teamId),
        eq(teams.tenantId, tenantId)
      ))
      .limit(1);
    
    if (result.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    return res.status(200).json(result[0]);
  } catch (error) {
    console.error('Error fetching team:', error);
    return res.status(500).json({ message: 'Error fetching team' });
  }
});

/**
 * GET /api/teams/:id/members
 * Get all members of a team
 */
router.get('/:id/members', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ message: 'Invalid team ID' });
    }
    
    const tenantId = req.user.tenantId;
    
    // If user is a creator, allow cross-tenant access
    if (req.isCreatorUser) {
      console.log(`Creator role detected - fetching team ${teamId} and its members with cross-tenant access`);
      
      // First verify team exists (no tenant restriction)
      const teamResult = await db.select().from(teams)
        .where(eq(teams.id, teamId))
        .limit(1);
      
      if (teamResult.length === 0) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Get team members (no tenant restriction)
      const result = await db.select({
        id: users.id,
        username: users.username,
        name: users.name,
        email: users.email,
        role: users.role,
        profilePicture: users.profilePicture,
        tenantId: users.tenantId, // Include tenant ID for cross-tenant view
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      }).from(users)
        .where(eq(users.teamId, teamId));
        
      return res.status(200).json(result);
    }
    
    // Regular tenant-specific query for non-creator users
    // First verify team exists and belongs to tenant
    const teamResult = await db.select().from(teams)
      .where(and(
        eq(teams.id, teamId),
        eq(teams.tenantId, tenantId)
      ))
      .limit(1);
    
    if (teamResult.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Get team members
    const result = await db.select({
      id: users.id,
      username: users.username,
      name: users.name,
      email: users.email,
      role: users.role,
      profilePicture: users.profilePicture,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    }).from(users)
      .where(and(
        eq(users.teamId, teamId),
        eq(users.tenantId, tenantId)
      ));
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching team members:', error);
    return res.status(500).json({ message: 'Error fetching team members' });
  }
});

/**
 * POST /api/teams
 * Create a new team
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Only administrators can create teams
    if (req.user.role !== 'administrator' && req.user.role !== 'creator') {
      return res.status(403).json({ message: 'Forbidden - Insufficient permissions' });
    }
    
    let tenantId = req.user.tenantId;
    
    const { name, description, targetTenantId } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Team name is required' });
    }
    
    // If user is a creator and specified a target tenant ID, use that instead
    if (req.isCreatorUser && targetTenantId) {
      console.log(`Creator role detected - creating team for tenant ID ${targetTenantId}`);
      
      // Verify the target tenant exists
      const tenantResult = await db.select().from(tenants)
        .where(eq(tenants.id, targetTenantId))
        .limit(1);
      
      if (tenantResult.length === 0) {
        return res.status(404).json({ message: 'Target tenant not found' });
      }
      
      tenantId = targetTenantId;
    }
    
    const insertData: InsertTeam = {
      name,
      description: description || '',
      tenantId
    };
    
    const result = await db.insert(teams).values(insertData).returning();
    
    return res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating team:', error);
    return res.status(500).json({ message: 'Error creating team' });
  }
});

/**
 * PUT /api/teams/:id
 * Update a team
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Only administrators can update teams
    if (req.user.role !== 'administrator' && req.user.role !== 'creator') {
      return res.status(403).json({ message: 'Forbidden - Insufficient permissions' });
    }
    
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ message: 'Invalid team ID' });
    }
    
    const tenantId = req.user.tenantId;
    
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Team name is required' });
    }
    
    // If user is a creator, allow cross-tenant access
    if (req.isCreatorUser) {
      console.log(`Creator role detected - updating team ${teamId} with cross-tenant access`);
      
      // First verify team exists (no tenant restriction)
      const teamResult = await db.select().from(teams)
        .where(eq(teams.id, teamId))
        .limit(1);
      
      if (teamResult.length === 0) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      const result = await db.update(teams)
        .set({
          name,
          description: description || '',
          updatedAt: new Date()
        })
        .where(eq(teams.id, teamId))
        .returning();
        
      return res.status(200).json(result[0]);
    }
    
    // Regular tenant-specific query for non-creator users
    // First verify team exists and belongs to tenant
    const teamResult = await db.select().from(teams)
      .where(and(
        eq(teams.id, teamId),
        eq(teams.tenantId, tenantId)
      ))
      .limit(1);
    
    if (teamResult.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    const result = await db.update(teams)
      .set({
        name,
        description: description || '',
        updatedAt: new Date()
      })
      .where(and(
        eq(teams.id, teamId),
        eq(teams.tenantId, tenantId)
      ))
      .returning();
    
    return res.status(200).json(result[0]);
  } catch (error) {
    console.error('Error updating team:', error);
    return res.status(500).json({ message: 'Error updating team' });
  }
});

/**
 * DELETE /api/teams/:id
 * Delete a team
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Only administrators can delete teams
    if (req.user.role !== 'administrator' && req.user.role !== 'creator') {
      return res.status(403).json({ message: 'Forbidden - Insufficient permissions' });
    }
    
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ message: 'Invalid team ID' });
    }
    
    const tenantId = req.user.tenantId;
    
    // If user is a creator, allow cross-tenant access
    if (req.isCreatorUser) {
      console.log(`Creator role detected - deleting team ${teamId} with cross-tenant access`);
      
      // First verify team exists (no tenant restriction)
      const teamResult = await db.select().from(teams)
        .where(eq(teams.id, teamId))
        .limit(1);
      
      if (teamResult.length === 0) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Get the tenant ID from the team record for updating users
      const teamTenantId = teamResult[0].tenantId;
      
      // Update all users in the team to have no team
      await db.update(users)
        .set({ teamId: null })
        .where(and(
          eq(users.teamId, teamId),
          eq(users.tenantId, teamTenantId)
        ));
      
      // Delete the team
      await db.delete(teams)
        .where(eq(teams.id, teamId));
        
      return res.status(200).json({ message: 'Team deleted successfully' });
    }
    
    // Regular tenant-specific query for non-creator users
    // First verify team exists and belongs to tenant
    const teamResult = await db.select().from(teams)
      .where(and(
        eq(teams.id, teamId),
        eq(teams.tenantId, tenantId)
      ))
      .limit(1);
    
    if (teamResult.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Update all users in the team to have no team
    await db.update(users)
      .set({ teamId: null })
      .where(and(
        eq(users.teamId, teamId),
        eq(users.tenantId, tenantId)
      ));
    
    // Delete the team
    await db.delete(teams)
      .where(and(
        eq(teams.id, teamId),
        eq(teams.tenantId, tenantId)
      ));
    
    return res.status(200).json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    return res.status(500).json({ message: 'Error deleting team' });
  }
});

export default router;