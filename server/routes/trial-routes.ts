import { Router, Request, Response } from "express";
import { storage } from "../storage";
import bcrypt from "bcryptjs";
import { z } from "zod";
import crypto from "crypto";

const router = Router();

// Trial registration schema
const trialRegistrationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
});

// POST /api/trial/register - Public trial registration (no auth required)
router.post("/register", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = trialRegistrationSchema.parse(req.body);
    const { name, email, username, password, companyName } = validatedData;

    // Check if username already exists globally
    const existingUsername = await storage.getUserByUsername(username);
    if (existingUsername) {
      return res.status(400).json({ 
        message: "Username already taken. Please choose a different username." 
      });
    }

    // Check if email already exists globally
    const existingEmail = await storage.getUserByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ 
        message: "Email already registered. Please use a different email or log in." 
      });
    }

    // Check if tenant with similar company name exists (prevent duplicates)
    const existingTenant = await storage.getTenantByName(companyName);
    if (existingTenant) {
      return res.status(400).json({ 
        message: "A company with this name already exists. Please choose a different company name." 
      });
    }

    // Generate unique subdomain from company name
    const subdomain = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30) + '-' + Date.now().toString(36);

    // Generate unique API key for tenant
    const apiKey = crypto.randomBytes(32).toString('hex');

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create trial tenant with 10 ticket limit
    const tenant = await storage.createTenant({
      name: companyName,
      subdomain,
      apiKey,
      adminId: null, // Will be updated after user creation
      industryType: "none",
      settings: {},
      branding: {
        primaryColor: '#4F46E5',
        logo: null,
        companyName,
        emailTemplate: 'default'
      },
      active: true,
      isTrial: true,
      ticketLimit: 10,
      ticketsCreated: 0
    });

    if (!tenant) {
      return res.status(500).json({ message: "Failed to create trial account" });
    }

    // Create admin user for the trial tenant
    const user = await storage.createUser({
      tenantId: tenant.id,
      username,
      password: hashedPassword,
      role: "admin", // Trial users get admin role
      name,
      email,
      company: companyName,
      profilePicture: null,
      teamId: null
    });

    if (!user) {
      // Rollback tenant creation if user creation fails
      await storage.deleteTenant(tenant.id);
      return res.status(500).json({ message: "Failed to create trial user account" });
    }

    // Update tenant adminId
    await storage.updateTenant(tenant.id, { adminId: user.id });

    // Auto-login the user by creating session
    if (req.session) {
      req.session.userId = user.id;
      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        tenantId: user.tenantId,
      };
      
      await new Promise<void>((resolve, reject) => {
        req.session!.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Return success with user and tenant info
    res.status(201).json({
      message: "Trial account created successfully!",
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        isTrial: tenant.isTrial,
        ticketLimit: tenant.ticketLimit,
        ticketsCreated: tenant.ticketsCreated,
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    
    console.error("Error in trial registration:", error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to create trial account" 
    });
  }
});

// GET /api/trial/check-availability - Check if username/email is available
router.post("/check-availability", async (req: Request, res: Response) => {
  try {
    const { username, email } = req.body;
    
    const availability = {
      username: true,
      email: true,
    };

    if (username) {
      const existingUsername = await storage.getUserByUsername(username);
      availability.username = !existingUsername;
    }

    if (email) {
      const existingEmail = await storage.getUserByEmail(email);
      availability.email = !existingEmail;
    }

    res.json(availability);
  } catch (error) {
    console.error("Error checking availability:", error);
    res.status(500).json({ message: "Failed to check availability" });
  }
});

export { router as trialRoutes };
