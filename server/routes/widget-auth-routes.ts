import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { hashPassword, comparePasswords } from "../auth";
import jwt from "jsonwebtoken";

/**
 * Widget authentication request validation schemas
 */
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  tenantId: z.number()
});

const registerSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
  tenantId: z.number()
});

/**
 * Register routes for widget authentication
 */
export function registerWidgetAuthRoutes(app: Express): void {
  /**
   * Login handler for widget users
   * 
   * POST /api/widget/auth/login
   */
  app.post('/api/widget/auth/login', async (req: Request, res: Response) => {
    try {
      // Validate API key in header
      const apiKey = req.headers['x-api-key'] as string;
      
      if (!apiKey) {
        return res.status(401).json({ message: 'API key is required' });
      }
      
      // Validate request body
      const result = loginSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: 'Invalid request data',
          errors: result.error.format()
        });
      }
      
      const { email, password, tenantId } = result.data;
      
      // Find the tenant by API key
      const tenant = await storage.getTenantByApiKey(apiKey);
      
      if (!tenant || tenant.id !== tenantId) {
        return res.status(401).json({ message: 'Invalid API key or tenant ID' });
      }
      
      // Find the user
      const user = await storage.findUserByEmail(email, tenantId);
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Verify password
      const passwordValid = await comparePasswords(password, user.password);
      
      if (!passwordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id,
          tenantId: user.tenantId,
          email: user.email
        },
        process.env.JWT_SECRET || 'support-ai-widget-secret',
        { expiresIn: '7d' }
      );
      
      // Return user info and token
      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        token
      });
      
    } catch (error) {
      console.error('Widget login error:', error);
      res.status(500).json({ message: 'Authentication failed' });
    }
  });
  
  /**
   * Register handler for widget users
   * 
   * POST /api/widget/auth/register
   */
  app.post('/api/widget/auth/register', async (req: Request, res: Response) => {
    try {
      // Validate API key in header
      const apiKey = req.headers['x-api-key'] as string;
      
      if (!apiKey) {
        return res.status(401).json({ message: 'API key is required' });
      }
      
      // Validate request body
      const result = registerSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: 'Invalid request data',
          errors: result.error.format()
        });
      }
      
      const { name, email, password, tenantId } = result.data;
      
      // Find the tenant by API key
      const tenant = await storage.getTenantByApiKey(apiKey);
      
      if (!tenant || tenant.id !== tenantId) {
        return res.status(401).json({ message: 'Invalid API key or tenant ID' });
      }
      
      // Check if user already exists
      const existingUser = await storage.findUserByEmail(email, tenantId);
      
      if (existingUser) {
        return res.status(409).json({ message: 'User already exists' });
      }
      
      // Hash the password
      const hashedPassword = await hashPassword(password);
      
      // Create the user
      const user = await storage.createWidgetUser({
        name,
        email,
        password: hashedPassword,
        tenantId,
        role: 'widget_user'
      });
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id,
          tenantId: user.tenantId,
          email: user.email
        },
        process.env.JWT_SECRET || 'support-ai-widget-secret',
        { expiresIn: '7d' }
      );
      
      // Return user info and token
      res.status(201).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        token
      });
      
    } catch (error) {
      console.error('Widget registration error:', error);
      res.status(500).json({ message: 'Registration failed' });
    }
  });
  
  /**
   * Verify token and get user information
   * 
   * GET /api/widget/auth/verify
   */
  app.get('/api/widget/auth/verify', async (req: Request, res: Response) => {
    try {
      const token = req.headers['x-auth-token'] as string;
      
      if (!token) {
        return res.status(401).json({ message: 'Authentication token is required' });
      }
      
      // Verify token
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'support-ai-widget-secret'
      ) as { userId: number; tenantId: number; email: string };
      
      // Get user data
      const user = await storage.getUserById(decoded.userId);
      
      if (!user || user.tenantId !== decoded.tenantId) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      
      // Return user info
      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
      
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      
      console.error('Widget token verification error:', error);
      res.status(500).json({ message: 'Authentication failed' });
    }
  });
}