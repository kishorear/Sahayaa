import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { hashPassword } from "../auth";
import { z } from "zod";
import crypto from "crypto";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

const router = Router();

// Configure Google OAuth for trial registration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  const callbackURL = process.env.REPLIT_DOMAINS 
    ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}/api/trial/auth/google/callback`
    : 'http://localhost:5000/api/trial/auth/google/callback';
  
  passport.use('google-trial', new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL,
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      const name = profile.displayName || profile.name?.givenName || 'User';
      
      if (!email) {
        return done(new Error('No email found in Google profile'), undefined);
      }
      
      // Check if user already exists with this email
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        // Log in existing user
        return done(null, existingUser);
      }
      
      // Create new trial tenant and user
      const companyName = `${name}'s Company`;
      const subdomain = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30) + '-' + Date.now().toString(36);
      const apiKey = crypto.randomBytes(32).toString('hex');
      const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '') + Math.random().toString(36).substring(2, 6);
      
      // Create trial tenant
      const tenant = await storage.createTenant({
        name: companyName,
        subdomain,
        apiKey,
        adminId: null,
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
        return done(new Error('Failed to create trial account'), undefined);
      }
      
      // Create admin user
      const hashedPassword = await hashPassword(crypto.randomBytes(16).toString('hex'));
      const user = await storage.createUser({
        tenantId: tenant.id,
        username,
        password: hashedPassword,
        role: "admin",
        name,
        email,
        company: companyName,
        profilePicture: profile.photos?.[0]?.value || null,
        teamId: null,
        emailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpiry: null
      });
      
      if (!user) {
        await storage.deleteTenant(tenant.id);
        return done(new Error('Failed to create user account'), undefined);
      }
      
      // Update tenant adminId
      await storage.updateTenant(tenant.id, { adminId: user.id });
      
      // Create default OpenAI ChatGPT AI provider
      try {
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (openaiApiKey) {
          await storage.createAiProvider({
            tenantId: tenant.id,
            teamId: null,
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
            temperature: 7
          });
          console.log(`Created default OpenAI ChatGPT AI provider for trial tenant ${tenant.id}`);
        }
      } catch (aiProviderError) {
        console.error("Failed to create AI provider for trial tenant:", aiProviderError);
      }
      
      console.log(`[TRIAL] Google OAuth: Created new user ${user.username} (${email})`);
      return done(null, user);
    } catch (error) {
      console.error('[TRIAL] Google OAuth error:', error);
      return done(error as Error, undefined);
    }
  }));
  
  console.log(`Google OAuth for trial registration configured with callback: ${callbackURL}`);
} else {
  console.warn('Google OAuth for trial registration not configured: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing');
}

// GET /api/trial/auth/google - Initiate Google OAuth for trial
router.get("/auth/google", (req: Request, res: Response, next: NextFunction) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ message: "Google OAuth not configured" });
  }
  passport.authenticate('google-trial', { scope: ['profile', 'email'] })(req, res, next);
});

// GET /api/trial/auth/google/callback - Handle Google OAuth callback
router.get("/auth/google/callback", (req: Request, res: Response, next: NextFunction) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.redirect('/trial?error=Google+OAuth+not+configured');
  }
  
  passport.authenticate('google-trial', { session: false }, async (err: any, user: any) => {
    if (err || !user) {
      console.error('[TRIAL] Google OAuth callback error:', err);
      return res.redirect('/trial?error=' + encodeURIComponent(err?.message || 'Authentication failed'));
    }
    
    // Log the user in
    if (req.session) {
      req.session.userId = user.id;
      await new Promise<void>((resolve) => {
        req.session!.save(() => resolve());
      });
    }
    
    console.log(`[TRIAL] Google OAuth: User ${user.username} logged in`);
    res.redirect('/');
  })(req, res, next);
});

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

    // Create admin user for the trial tenant (verified immediately - no email verification required)
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
      emailVerified: true,
      emailVerificationCode: null,
      emailVerificationExpiry: null
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

    console.log(`[TRIAL] User ${user.username} auto-logged in after registration`);

    // Return success with auto-login
    res.status(201).json({
      message: "Trial account created successfully! You are now logged in.",
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId
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
