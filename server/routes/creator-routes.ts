import { Request, Response, Router } from "express";
import { db } from "../db";
import { tenants, users, teams, teamMembers } from "@shared/schema";
import { eq, and, desc, like, or, asc } from "drizzle-orm";
import { hashPassword } from "../auth";
import { v4 as uuidv4 } from "uuid";
import { checkCreatorRole } from "../tenant-middleware";
import { storage } from "../storage";
import * as crypto from "crypto";

// Import utils with direct path since we just created it
import { generateRandomPassword } from "../utils.js";

// Create a router for creator-specific routes
const router = Router();

/**
 * Middleware to ensure the route is only accessible by users with creator role
 */
const requireCreatorRole = async (req: Request, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  if (req.user.role !== "creator") {
    return res.status(403).json({ message: "Access denied. Creator role required." });
  }
  
  next();
};

/**
 * Log creator actions for audit trail
 */
const logCreatorAction = async (
  creatorId: number,
  action: string,
  details: any,
  targetUserId?: number,
  targetCompanyId?: number
) => {
  try {
    // TODO: Implement proper audit logging
    console.log(`AUDIT LOG: Creator ${creatorId} performed ${action}`, {
      timestamp: new Date().toISOString(),
      creatorId,
      action,
      details,
      targetUserId,
      targetCompanyId
    });
    
    // Here we would normally store this in the database
    // await db.insert(auditLogs).values({
    //   creatorId,
    //   action,
    //   details: JSON.stringify(details),
    //   targetUserId,
    //   targetCompanyId,
    //   createdAt: new Date()
    // });
  } catch (error) {
    console.error("Failed to log creator action:", error);
  }
};

/**
 * Get all users with pagination and search
 * GET /api/creators/users
 */
router.get("/users", requireCreatorRole, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const search = (req.query.search as string) || "";
    
    const offset = (page - 1) * pageSize;
    
    // Build search condition if search term provided
    let searchCondition = undefined;
    if (search) {
      searchCondition = or(
        like(users.username, `%${search}%`),
        like(users.name, `%${search}%`),
        like(users.email, `%${search}%`)
      );
    }
    
    // Get users with pagination
    const usersQuery = db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        email: users.email,
        role: users.role,
        tenantId: users.tenantId,
        teamId: users.teamId,
        profilePicture: users.profilePicture,
        active: users.active,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .where(searchCondition)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset(offset);
    
    // Get total count for pagination
    const countQuery = db
      .select({ count: db.fn.count() })
      .from(users)
      .where(searchCondition);
    
    // Execute both queries
    const [userResults, countResults] = await Promise.all([usersQuery, countQuery]);
    
    // Get tenant names for users
    const tenantIds = [...new Set(userResults.map(user => user.tenantId))];
    
    const tenantsQuery = db
      .select({
        id: tenants.id,
        name: tenants.name
      })
      .from(tenants)
      .where(tenants.id.in(tenantIds));
    
    // Get team names for users
    const teamIds = [...new Set(userResults.map(user => user.teamId).filter(Boolean) as number[])];
    
    const teamsQuery = teamIds.length > 0 ? db
      .select({
        id: teams.id,
        name: teams.name
      })
      .from(teams)
      .where(teams.id.in(teamIds)) : Promise.resolve([]);
    
    // Execute tenant and team queries
    const [tenantResults, teamResults] = await Promise.all([tenantsQuery, teamsQuery]);
    
    // Create lookup maps
    const tenantMap = new Map(tenantResults.map(tenant => [tenant.id, tenant.name]));
    const teamMap = new Map(teamResults.map(team => [team.id, team.name]));
    
    // Enhance user results with tenant and team names
    const enhancedUsers = userResults.map(user => ({
      ...user,
      tenantName: tenantMap.get(user.tenantId) || `Tenant ${user.tenantId}`,
      teamName: user.teamId ? teamMap.get(user.teamId) || `Team ${user.teamId}` : null
    }));
    
    // Get total count
    const total = countResults[0]?.count || 0;
    
    logCreatorAction(req.user!.id, "list_users", {
      page,
      pageSize,
      search,
      total
    });
    
    return res.status(200).json({
      users: enhancedUsers,
      total: Number(total),
      page,
      pageSize,
      totalPages: Math.ceil(Number(total) / pageSize)
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
});

/**
 * Get all tenants (companies)
 * GET /api/creators/tenants
 */
router.get("/tenants", requireCreatorRole, async (req: Request, res: Response) => {
  try {
    const tenantsQuery = db
      .select({
        id: tenants.id,
        name: tenants.name,
        subdomain: tenants.subdomain,
        createdAt: tenants.createdAt
      })
      .from(tenants)
      .orderBy(asc(tenants.name));
    
    const tenantResults = await tenantsQuery;
    
    logCreatorAction(req.user!.id, "list_tenants", {
      count: tenantResults.length
    });
    
    return res.status(200).json({
      tenants: tenantResults
    });
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return res.status(500).json({ message: "Failed to fetch tenants" });
  }
});

/**
 * Get all teams
 * GET /api/creators/teams
 */
router.get("/teams", requireCreatorRole, async (req: Request, res: Response) => {
  try {
    const teamsQuery = db
      .select({
        id: teams.id,
        name: teams.name,
        tenantId: teams.tenantId,
        description: teams.description,
        createdAt: teams.createdAt
      })
      .from(teams)
      .orderBy(asc(teams.name));
    
    const teamResults = await teamsQuery;
    
    // Get tenant names for teams
    const tenantIds = [...new Set(teamResults.map(team => team.tenantId))];
    
    const tenantsQuery = db
      .select({
        id: tenants.id,
        name: tenants.name
      })
      .from(tenants)
      .where(tenants.id.in(tenantIds));
    
    const tenantResults = await tenantsQuery;
    
    // Create lookup map
    const tenantMap = new Map(tenantResults.map(tenant => [tenant.id, tenant.name]));
    
    // Enhance team results with tenant names
    const enhancedTeams = teamResults.map(team => ({
      ...team,
      tenantName: tenantMap.get(team.tenantId) || `Tenant ${team.tenantId}`
    }));
    
    logCreatorAction(req.user!.id, "list_teams", {
      count: teamResults.length
    });
    
    return res.status(200).json({
      teams: enhancedTeams
    });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return res.status(500).json({ message: "Failed to fetch teams" });
  }
});

/**
 * Register a new user
 * POST /api/creators/users
 */
router.post("/users", requireCreatorRole, async (req: Request, res: Response) => {
  try {
    const { 
      username, 
      password, 
      role, 
      name, 
      email, 
      companyId, 
      companyName, 
      companySSO,
      teamId, 
      teamName 
    } = req.body;
    
    // Validation
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
    
    if (!companyId && !companyName) {
      return res.status(400).json({ message: "Either companyId or companyName must be provided" });
    }
    
    // Check if username is already taken
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "Username already exists" });
    }
    
    // Determine tenant ID (company)
    let tenantId = companyId;
    
    // If no companyId provided, create a new company
    if (!tenantId) {
      const [newTenant] = await db
        .insert(tenants)
        .values({
          name: companyName,
          subdomain: companyName.toLowerCase().replace(/[^a-z0-9]/g, ""),
          apiKey: uuidv4(),
          active: true,
          settings: {},
          branding: {}
        })
        .returning();
      
      tenantId = newTenant.id;
      
      logCreatorAction(req.user!.id, "create_tenant", {
        tenantName: companyName,
        tenantId
      }, undefined, tenantId);
    }
    
    // Determine team ID
    let userTeamId = teamId;
    
    // If teamName provided but no teamId, create a new team
    if (!userTeamId && teamName && tenantId) {
      const [newTeam] = await db
        .insert(teams)
        .values({
          name: teamName,
          tenantId: tenantId,
          description: `Team created by ${req.user!.username}`
        })
        .returning();
      
      userTeamId = newTeam.id;
      
      logCreatorAction(req.user!.id, "create_team", {
        teamName,
        teamId: userTeamId,
        tenantId
      }, undefined, tenantId);
    }
    
    // Hash the password
    const hashedPassword = await hashPassword(password);
    
    // Create the user
    const [newUser] = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
        role,
        name: name || null,
        email: email || null,
        tenantId,
        teamId: userTeamId || null,
        profilePicture: null,
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: [],
        ssoEnabled: false,
        ssoProvider: null,
        ssoProviderId: null,
        ssoProviderData: {},
        active: true
      })
      .returning();
    
    // If a team was specified, add user to the team
    if (userTeamId) {
      await db
        .insert(teamMembers)
        .values({
          userId: newUser.id,
          teamId: userTeamId,
          role: "member"
        });
    }
    
    // Log the action
    logCreatorAction(req.user!.id, "create_user", {
      username,
      role,
      tenantId,
      teamId: userTeamId
    }, newUser.id, tenantId);
    
    // Return success response
    return res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      name: newUser.name,
      email: newUser.email,
      tenantId: newUser.tenantId,
      teamId: newUser.teamId,
      createdAt: newUser.createdAt,
      message: "User created successfully"
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({ message: "Failed to create user" });
  }
});

/**
 * Update a user
 * PUT /api/creators/users/:id
 */
router.put("/users/:id", requireCreatorRole, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { 
      role, 
      name, 
      email, 
      companyId, 
      teamId, 
      active 
    } = req.body;
    
    // Validation
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    
    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (existingUser.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const currentUser = existingUser[0];
    
    // Prepare update data
    const updateData: any = {};
    
    if (role !== undefined) updateData.role = role;
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (companyId !== undefined) updateData.tenantId = companyId;
    if (teamId !== undefined) updateData.teamId = teamId;
    if (active !== undefined) updateData.active = active;
    
    // If team is changing and new team ID is provided
    if (teamId !== undefined && teamId !== currentUser.teamId) {
      // If user had a previous team, remove from old team
      if (currentUser.teamId) {
        await db
          .delete(teamMembers)
          .where(
            and(
              eq(teamMembers.userId, userId),
              eq(teamMembers.teamId, currentUser.teamId)
            )
          );
      }
      
      // If new team ID is provided (not null), add to new team
      if (teamId !== null) {
        await db
          .insert(teamMembers)
          .values({
            userId,
            teamId,
            role: "member"
          })
          .onConflictDoUpdate({
            target: [teamMembers.userId, teamMembers.teamId],
            set: { role: "member" }
          });
      }
    }
    
    // Update the user
    const [updatedUser] = await db
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    // Log the action
    logCreatorAction(req.user!.id, "update_user", {
      userId,
      updates: updateData
    }, userId, updateData.tenantId);
    
    // Return success response
    return res.status(200).json({
      ...updatedUser,
      message: "User updated successfully"
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ message: "Failed to update user" });
  }
});

/**
 * Reset a user's password
 * POST /api/creators/users/:id/reset-password
 */
router.post("/users/:id/reset-password", requireCreatorRole, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { generateRandom, newPassword } = req.body;
    
    // Validation
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    
    if (!generateRandom && !newPassword) {
      return res.status(400).json({ message: "Either generateRandom or newPassword must be provided" });
    }
    
    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (existingUser.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const user = existingUser[0];
    
    // Generate or use provided password
    const password = generateRandom ? generateRandomPassword(12) : newPassword;
    
    // Hash the password
    const hashedPassword = await hashPassword(password);
    
    // Update the user's password
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
    
    // Log the action
    logCreatorAction(req.user!.id, "reset_password", {
      userId,
      generateRandom
    }, userId, user.tenantId);
    
    // TODO: Send email to user with new password
    
    // Return success response
    return res.status(200).json({
      message: "Password reset successfully",
      password: generateRandom ? password : undefined // Only return password if generated randomly
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({ message: "Failed to reset password" });
  }
});

/**
 * Delete a user
 * DELETE /api/creators/users/:id
 */
router.delete("/users/:id", requireCreatorRole, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Validation
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    
    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (existingUser.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const user = existingUser[0];
    
    // Delete user's team memberships
    await db
      .delete(teamMembers)
      .where(eq(teamMembers.userId, userId));
    
    // Delete the user
    await db
      .delete(users)
      .where(eq(users.id, userId));
    
    // Log the action
    logCreatorAction(req.user!.id, "delete_user", {
      userId,
      username: user.username
    }, userId, user.tenantId);
    
    // Return success response
    return res.status(200).json({
      message: "User deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ message: "Failed to delete user" });
  }
});

/**
 * Get user details
 * GET /api/creators/users/:id
 */
router.get("/users/:id", requireCreatorRole, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Validation
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    
    // Get user details
    const userQuery = db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    const [user] = await userQuery;
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Get tenant details
    const [tenant] = await db
      .select({
        id: tenants.id,
        name: tenants.name
      })
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .limit(1);
    
    // Get team details if user has a team
    let team = null;
    
    if (user.teamId) {
      const [teamResult] = await db
        .select({
          id: teams.id,
          name: teams.name
        })
        .from(teams)
        .where(eq(teams.id, user.teamId))
        .limit(1);
      
      team = teamResult;
    }
    
    // Log the action
    logCreatorAction(req.user!.id, "view_user", {
      userId
    }, userId, user.tenantId);
    
    // Return user details with tenant and team info
    return res.status(200).json({
      ...user,
      tenant: tenant || { id: user.tenantId, name: `Tenant ${user.tenantId}` },
      team
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return res.status(500).json({ message: "Failed to fetch user details" });
  }
});

export default router;