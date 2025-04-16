import { Router, Request, Response } from 'express';
import { db } from '../db';
import { teams, users, InsertTeam } from '@shared/schema';
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
    
    const tenantId = req.user.tenantId;
    
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Team name is required' });
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