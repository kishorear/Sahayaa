import express, { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { User, updateProfileSchema } from "@shared/schema";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import multer from "multer";
import path from "path";
import fs from "fs";

const scryptAsync = promisify(scrypt);

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage_config = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'profile-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage_config,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!') as any, false);
    }
  },
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
  // Serve uploaded profile pictures
  app.use('/uploads', express.static(uploadsDir));
  
  // Log for debugging
  console.log(`Profile pictures uploads directory: ${uploadsDir}`);

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

  // Upload profile picture
  app.post("/api/profile/picture", requireAuth, upload.single("profilePicture"), async (req: Request, res: Response) => {
    try {
      console.log("Profile picture upload request received");
      
      // req.user is set by the auth middleware
      if (!req.user) {
        console.log("Profile picture upload: User not authenticated");
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      console.log("Profile picture upload: User authenticated", { userId: req.user.id, username: req.user.username });
      
      // req.file is the uploaded profile picture
      const file = req.file;
      if (!file) {
        console.log("Profile picture upload: No file in request");
        return res.status(400).json({ message: "No file was uploaded" });
      }
      
      // Log the file information for debugging
      console.log("Profile picture uploaded:", {
        filename: file.filename,
        originalname: file.originalname,
        path: file.path,
        destination: file.destination,
        size: file.size
      });
      
      // Create a public URL for the uploaded file
      const publicUrl = `/uploads/${path.basename(file.path)}`;
      console.log("Generated public URL:", publicUrl);
      
      try {
        // Test the file existence
        const fullPath = path.join(uploadsDir, path.basename(file.path));
        const fileExists = fs.existsSync(fullPath);
        console.log(`File existence check: ${fileExists ? "File exists" : "File does not exist"} at ${fullPath}`);
      } catch (fsError) {
        console.error("Error checking file existence:", fsError);
      }
      
      // Update the user's profile with the new profile picture URL
      console.log("Updating user profile with picture URL:", { userId: req.user.id, url: publicUrl });
      const updatedUser = await storage.updateUser(req.user.id, {
        profilePicture: publicUrl,
        updatedAt: new Date()
      });
      
      console.log("User profile updated:", { 
        userId: updatedUser.id,
        profilePictureSet: !!updatedUser.profilePicture,
        profilePictureUrl: updatedUser.profilePicture
      });
      
      // Remove sensitive information before sending response
      const { password, mfaSecret, mfaBackupCodes, ...safeUser } = updatedUser;
      
      res.status(200).json(safeUser);
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      res.status(500).json({ message: "Error uploading profile picture" });
    }
  });

  // Delete profile picture
  app.delete("/api/profile/picture", requireAuth, async (req: Request, res: Response) => {
    try {
      // req.user is set by the auth middleware
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // If user has a profile picture, try to delete the file
      if (req.user.profilePicture) {
        const filename = path.basename(req.user.profilePicture);
        const filepath = path.join(uploadsDir, filename);
        
        // Delete the file if it exists
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      }
      
      // Update the user to remove the profile picture URL
      const updatedUser = await storage.updateUser(req.user.id, {
        profilePicture: null,
        updatedAt: new Date()
      });
      
      // Remove sensitive information before sending response
      const { password, mfaSecret, mfaBackupCodes, ...safeUser } = updatedUser;
      
      res.status(200).json(safeUser);
    } catch (error) {
      console.error("Error deleting profile picture:", error);
      res.status(500).json({ message: "Error deleting profile picture" });
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
  
  // Test route for checking upload files - does not require authentication
  app.get("/api/profile/test-uploads", async (req: Request, res: Response) => {
    try {
      console.log("Testing uploads directory access");
      
      // List all files in the uploads directory
      const files = fs.readdirSync(uploadsDir);
      console.log(`Found ${files.length} files in uploads directory:`, files);
      
      // Check if any of the files are images
      const imageFiles = files.filter(file => 
        file.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i)
      );
      console.log(`Found ${imageFiles.length} image files:`, imageFiles);
      
      // Check if a specific file exists
      const sampleFilePath = req.query.file ? path.join(uploadsDir, req.query.file.toString()) : null;
      let sampleFileExists = false;
      
      if (sampleFilePath) {
        sampleFileExists = fs.existsSync(sampleFilePath);
        console.log(`Requested file ${req.query.file} ${sampleFileExists ? 'exists' : 'does not exist'} at ${sampleFilePath}`);
      }
      
      res.status(200).json({
        uploadsDir,
        totalFiles: files.length,
        files,
        imageFiles,
        requestedFile: req.query.file || null,
        requestedFileExists: sampleFileExists,
      });
    } catch (error) {
      console.error("Error testing uploads:", error);
      res.status(500).json({ 
        message: "Error testing uploads", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
}