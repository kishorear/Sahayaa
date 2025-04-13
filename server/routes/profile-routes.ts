import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { User } from "@shared/schema";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Schema for user profile updates
const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Please enter a valid email").optional(),
});

async function comparePasswords(supplied: string, stored: string) {
  // Password is stored as `hash.salt`
  const [hashedPassword, salt] = stored.split(".");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  const storedBuf = Buffer.from(hashedPassword, "hex");
  
  return timingSafeEqual(suppliedBuf, storedBuf);
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export function registerProfileRoutes(app: Express, requireAuth: any) {
  // Get current user profile
  app.get("/api/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      // req.user is set by the auth middleware
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Remove sensitive information before sending
      const { password, mfaSecret, mfaBackupCodes, ...safeUser } = req.user;
      
      res.status(200).json(safeUser);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Error fetching user profile" });
    }
  });

  // Update user profile
  app.patch("/api/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      // req.user is set by the auth middleware
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Validate input
      const result = updateProfileSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: result.error.format() 
        });
      }
      
      const updates = result.data;
      
      // Update the user
      const updatedUser = await storage.updateUser(req.user.id, {
        ...updates,
        updatedAt: new Date()
      });
      
      // Remove sensitive information before sending response
      const { password, mfaSecret, mfaBackupCodes, ...safeUser } = updatedUser;
      
      res.status(200).json(safeUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Error updating user profile" });
    }
  });

  // Change password
  app.post("/api/profile/change-password", requireAuth, async (req: Request, res: Response) => {
    try {
      // req.user is set by the auth middleware
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { currentPassword, newPassword } = req.body;
      
      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }
      
      // Check current password
      const passwordsMatch = await comparePasswords(currentPassword, req.user.password);
      if (!passwordsMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Hash new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update user with new password
      await storage.updateUser(req.user.id, {
        password: hashedPassword,
        updatedAt: new Date()
      });
      
      res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Error changing password" });
    }
  });

  // Disable SSO
  app.post("/api/profile/disable-sso", requireAuth, async (req: Request, res: Response) => {
    try {
      // req.user is set by the auth middleware
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Check if SSO is actually enabled
      if (!req.user.ssoEnabled) {
        return res.status(400).json({ message: "SSO is not enabled for this account" });
      }
      
      // Update user to disable SSO
      const updatedUser = await storage.updateUser(req.user.id, {
        ssoEnabled: false,
        ssoProvider: null,
        ssoProviderId: null,
        ssoProviderData: {},
        updatedAt: new Date()
      });
      
      // Remove sensitive information before sending response
      const { password, mfaSecret, mfaBackupCodes, ...safeUser } = updatedUser;
      
      res.status(200).json(safeUser);
    } catch (error) {
      console.error("Error disabling SSO:", error);
      res.status(500).json({ message: "Error disabling SSO" });
    }
  });
}