import { type Express } from "express";
import { Router } from "express";
import { storage } from "../storage";
import { Team, insertTeamSchema } from "../../shared/schema";
import { z } from "zod";

const router = Router();

// Get all teams (optionally filtered by tenant ID)
router.get("/api/teams", async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || 1; // Default to tenant 1 if not provided
    
    console.log(`Fetching teams for tenant ${tenantId}`);
    const teams = await storage.getTeamsByTenantId(tenantId);
    res.json(teams);
  } catch (error) {
    console.error("Error fetching teams:", error);
    res.status(500).json({ message: "Error fetching teams" });
  }
});

// Get a specific team by ID
router.get("/api/teams/:id", async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }
    
    const team = await storage.getTeamById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    res.json(team);
  } catch (error) {
    console.error("Error fetching team:", error);
    res.status(500).json({ message: "Error fetching team" });
  }
});

// Create a new team
router.post("/api/teams", async (req, res) => {
  try {
    const parsedData = insertTeamSchema.safeParse(req.body);
    if (!parsedData.success) {
      return res.status(400).json({ 
        message: "Invalid team data",
        errors: parsedData.error.errors 
      });
    }
    
    const tenantId = req.user?.tenantId || 1; // Default to tenant 1 if not provided
    const teamData = {
      ...parsedData.data,
      tenantId
    };
    
    const team = await storage.createTeam(teamData);
    res.status(201).json(team);
  } catch (error) {
    console.error("Error creating team:", error);
    res.status(500).json({ message: "Error creating team" });
  }
});

// Update a team
router.put("/api/teams/:id", async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }
    
    const parsedData = z.object({
      name: z.string().optional(),
      description: z.string().nullable().optional(),
    }).safeParse(req.body);
    
    if (!parsedData.success) {
      return res.status(400).json({ 
        message: "Invalid team data",
        errors: parsedData.error.errors 
      });
    }
    
    // Make sure the team exists first
    const existingTeam = await storage.getTeamById(teamId);
    if (!existingTeam) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    // Only allow updates for teams in the same tenant as the user
    const tenantId = req.user?.tenantId || 1;
    if (existingTeam.tenantId !== tenantId) {
      return res.status(403).json({ message: "Not authorized to update this team" });
    }
    
    const updatedTeam = await storage.updateTeam(teamId, parsedData.data);
    res.json(updatedTeam);
  } catch (error) {
    console.error("Error updating team:", error);
    res.status(500).json({ message: "Error updating team" });
  }
});

// Delete a team
router.delete("/api/teams/:id", async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }
    
    // Make sure the team exists first
    const existingTeam = await storage.getTeamById(teamId);
    if (!existingTeam) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    // Only allow deletion for teams in the same tenant as the user
    const tenantId = req.user?.tenantId || 1;
    if (existingTeam.tenantId !== tenantId) {
      return res.status(403).json({ message: "Not authorized to delete this team" });
    }
    
    // Can't delete the team if there are users assigned to it
    const teamMembers = await storage.getTeamMembers(teamId);
    if (teamMembers.length > 0) {
      return res.status(400).json({ 
        message: "Cannot delete team with assigned members. Reassign members first." 
      });
    }
    
    await storage.deleteTeam(teamId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting team:", error);
    res.status(500).json({ message: "Error deleting team" });
  }
});

// Get team members
router.get("/api/teams/:id/members", async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }
    
    // Make sure the team exists first
    const existingTeam = await storage.getTeamById(teamId);
    if (!existingTeam) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    // Only allow access for teams in the same tenant as the user
    const tenantId = req.user?.tenantId || 1;
    if (existingTeam.tenantId !== tenantId) {
      return res.status(403).json({ message: "Not authorized to view this team's members" });
    }
    
    const members = await storage.getTeamMembers(teamId);
    
    // Remove sensitive data before sending response
    const sanitizedMembers = members.map(member => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, mfaSecret, mfaBackupCodes, ssoProviderData, ...sanitized } = member;
      return sanitized;
    });
    
    res.json(sanitizedMembers);
  } catch (error) {
    console.error("Error fetching team members:", error);
    res.status(500).json({ message: "Error fetching team members" });
  }
});

export function registerTeamRoutes(app: Express): void {
  app.use(router);
}