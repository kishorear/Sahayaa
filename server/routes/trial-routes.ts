import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { hashPassword } from "../auth";
import { z } from "zod";
import crypto from "crypto";
import { EmailVerificationService } from "../email-verification-service";

const router = Router();

// Initialize email verification service with Resend
const emailVerificationService = new EmailVerificationService();

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

    // Hash password using scrypt (same as login system)
    const hashedPassword = await hashPassword(password);

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

    // Generate verification code and expiry
    const verificationCode = emailVerificationService.generateVerificationCode();
    const verificationExpiry = emailVerificationService.getVerificationExpiry();

    // Create admin user for the trial tenant (not verified yet)
    const user = await storage.createUser({
      tenantId: tenant.id,
      username,
      password: hashedPassword,
      role: "admin", // Trial users get admin role
      name,
      email,
      company: companyName,
      profilePicture: null,
      teamId: null,
      emailVerified: false,
      emailVerificationCode: verificationCode,
      emailVerificationExpiry: verificationExpiry
    });
    
    console.log(`[TRIAL] Created user:`, { id: user.id, username: user.username, tenantId: user.tenantId, role: user.role });

    if (!user) {
      // Rollback tenant creation if user creation fails
      await storage.deleteTenant(tenant.id);
      return res.status(500).json({ message: "Failed to create trial user account" });
    }

    // Update tenant adminId
    await storage.updateTenant(tenant.id, { adminId: user.id });

    // Create default OpenAI ChatGPT AI provider for trial tenant
    try {
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (openaiApiKey) {
        await storage.createAiProvider({
          tenantId: tenant.id,
          teamId: null, // Available to all teams
          type: "openai",
          name: "ChatGPT (Trial Default)",
          model: "gpt-4o",
          apiKey: openaiApiKey,
          baseUrl: null,
          isPrimary: true,
          isDefault: true,
          enabled: true,
          settings: {},
          useForClassification: true,
          useForAutoResolve: true,
          useForChat: true,
          useForEmail: true,
          priority: 50,
          contextWindow: 8000,
          maxTokens: 2000,
          temperature: 7 // 0.7 when divided by 10 (valid range for OpenAI: 0.0-2.0)
        });
        console.log(`Created default OpenAI ChatGPT AI provider for trial tenant ${tenant.id}`);
      } else {
        console.warn("OPENAI_API_KEY not found, skipping AI provider setup for trial tenant");
      }
    } catch (aiProviderError) {
      // Log but don't fail registration if AI provider creation fails
      console.error("Failed to create AI provider for trial tenant:", aiProviderError);
    }

    // Send verification email
    const emailSent = await emailVerificationService.sendVerificationEmail({
      to: email,
      name: name,
      code: verificationCode
    });

    if (!emailSent) {
      console.warn(`Failed to send verification email to ${email}, but user was created`);
    }

    // Return success without auto-login - user must verify email first
    res.status(201).json({
      message: "Trial account created successfully! Please check your email for the verification code.",
      requiresVerification: true,
      email: email,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
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

// POST /api/trial/verify-email - Verify email with code
router.post("/verify-email", async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and verification code are required" });
    }

    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    // Check if code matches
    if (user.emailVerificationCode !== code) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    // Check if code is expired
    if (!emailVerificationService.isCodeValid(user.emailVerificationExpiry)) {
      return res.status(400).json({ 
        message: "Verification code has expired. Please request a new code.",
        expired: true
      });
    }

    // Mark email as verified and clear verification fields
    await storage.updateUser(user.id, {
      emailVerified: true,
      emailVerificationCode: null,
      emailVerificationExpiry: null
    });

    // Auto-login the user by creating session
    if (req.session) {
      req.session.userId = user.id;
      
      await new Promise<void>((resolve, reject) => {
        req.session!.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    console.log(`[TRIAL] Email verified for user ${user.username} (${user.email})`);

    // Return success with user info
    res.status(200).json({
      message: "Email verified successfully!",
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      }
    });

  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(500).json({ message: "Failed to verify email" });
  }
});

// POST /api/trial/resend-verification - Resend verification code
router.post("/resend-verification", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    // Generate new verification code and expiry
    const verificationCode = emailVerificationService.generateVerificationCode();
    const verificationExpiry = emailVerificationService.getVerificationExpiry();

    // Update user with new code
    await storage.updateUser(user.id, {
      emailVerificationCode: verificationCode,
      emailVerificationExpiry: verificationExpiry
    });

    // Send verification email
    const emailSent = await emailVerificationService.sendVerificationEmail({
      to: email,
      name: user.name || 'User',
      code: verificationCode
    });

    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send verification email" });
    }

    console.log(`[TRIAL] Resent verification code to ${email}`);

    res.status(200).json({
      message: "Verification code sent successfully. Please check your email."
    });

  } catch (error) {
    console.error("Error resending verification code:", error);
    res.status(500).json({ message: "Failed to resend verification code" });
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
