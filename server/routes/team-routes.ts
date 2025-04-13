import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { insertTeamSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

/**
 * Register team-related API routes
 */
export function registerTeamRoutes(app: Express) {
  // Get all teams (publicly accessible for registration)
  app.get("/api/teams", async (req: Request, res: Response) => {
    try {
      // Default to tenant 1 if no tenant is specified
      const tenantId = req.user?.tenantId || 1;
      
      // Get all teams for this tenant
      const teams = await storage.getTeamsByTenantId(tenantId);
      
      res.status(200).json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Error fetching teams" });
    }
  });

  // Create a new team (requires authentication)
  app.post("/api/teams", async (req: Request, res: Response) => {
    try {
      // Validate request body against team schema
      try {
        insertTeamSchema.parse(req.body);
      } catch (validationError) {
        if (validationError instanceof ZodError) {
          const readableError = fromZodError(validationError);
          return res.status(400).json({ 
            message: "Validation failed", 
            errors: readableError.details
          });
        }
        return res.status(400).json({ message: "Invalid team data" });
      }
      
      // Set tenant ID based on authenticated user
      const tenantId = req.user?.tenantId || 1;
      
      // Create the team
      const team = await storage.createTeam({
        ...req.body,
        tenantId
      });
      
      res.status(201).json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      
      // Check for duplicate team name error
      if (error instanceof Error && error.message.includes("unique")) {
        return res.status(400).json({ message: "Team name already exists in this tenant" });
      }
      
      res.status(500).json({ message: "Error creating team" });
    }
  });

  // Get a specific team by ID
  app.get("/api/teams/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid team ID" });
      }
      
      const team = await storage.getTeamById(id);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      // Check if the team belongs to the user's tenant
      if (req.user && team.tenantId !== req.user.tenantId) {
        return res.status(403).json({ message: "You don't have access to this team" });
      }
      
      res.status(200).json(team);
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ message: "Error fetching team" });
    }
  });

  // Update a team
  app.patch("/api/teams/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid team ID" });
      }
      
      // Get the team to verify ownership
      const team = await storage.getTeamById(id);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      // Check if the team belongs to the user's tenant
      if (req.user && team.tenantId !== req.user.tenantId) {
        return res.status(403).json({ message: "You don't have access to this team" });
      }
      
      // Update the team
      const updatedTeam = await storage.updateTeam(id, req.body);
      
      res.status(200).json(updatedTeam);
    } catch (error) {
      console.error("Error updating team:", error);
      
      // Check for duplicate team name error
      if (error instanceof Error && error.message.includes("unique")) {
        return res.status(400).json({ message: "Team name already exists in this tenant" });
      }
      
      res.status(500).json({ message: "Error updating team" });
    }
  });

  // Delete a team
  app.delete("/api/teams/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid team ID" });
      }
      
      // Get the team to verify ownership
      const team = await storage.getTeamById(id);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      // Check if the team belongs to the user's tenant
      if (req.user && team.tenantId !== req.user.tenantId) {
        return res.status(403).json({ message: "You don't have access to this team" });
      }
      
      // Delete the team
      await storage.deleteTeam(id);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting team:", error);
      res.status(500).json({ message: "Error deleting team" });
    }
  });

  // Get team members
  app.get("/api/teams/:id/members", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid team ID" });
      }
      
      // Get the team to verify it exists
      const team = await storage.getTeamById(id);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      // Check if the team belongs to the user's tenant
      if (req.user && team.tenantId !== req.user.tenantId) {
        return res.status(403).json({ message: "You don't have access to this team" });
      }
      
      // Get all members of the team
      const members = await storage.getTeamMembers(id);
      
      // Remove sensitive information before sending
      const sanitizedMembers = members.map(user => {
        const { password, mfaSecret, mfaBackupCodes, ...safeUser } = user;
        return safeUser;
      });
      
      res.status(200).json(sanitizedMembers);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Error fetching team members" });
    }
  });
}