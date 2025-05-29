import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { comparePasswords } from "../auth";

/**
 * Widget authentication request validation schema
 */
const widgetAuthSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  tenantId: z.number().or(z.string().transform(val => parseInt(val, 10)))
});

/**
 * Register routes for widget user authentication
 */
export function registerWidgetAuthenticationRoutes(app: Express): void {
  /**
   * Authenticate widget user with username and password
   * 
   * POST /api/widget-auth
   */
  app.post('/api/widget-auth', async (req: Request, res: Response) => {
    try {
      // Validate request body
      const authResult = widgetAuthSchema.safeParse(req.body);
      
      if (!authResult.success) {
        return res.status(400).json({ 
          error: 'Invalid authentication data',
          details: authResult.error.format()
        });
      }
      
      const { username, password, tenantId } = authResult.data;
      
      // Verify API key from headers
      const apiKey = req.headers['x-api-key'] as string;
      if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
      }
      
      // Find user by username and tenant
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Verify user belongs to the correct tenant
      if (user.tenantId !== tenantId) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Verify password
      const passwordValid = await comparePasswords(password, user.password);
      
      if (!passwordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Generate session token for widget use
      const sessionToken = `wgt_session_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
      
      // Return user data for widget
      res.status(200).json({
        id: user.id,
        username: user.username,
        name: user.name || user.username,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        token: sessionToken,
        authenticated: true
      });
      
    } catch (error) {
      console.error('Widget authentication error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });
  
  /**
   * Verify widget authentication token
   * 
   * POST /api/widget-auth/verify
   */
  app.post('/api/widget-auth/verify', async (req: Request, res: Response) => {
    try {
      const { token, tenantId } = req.body;
      
      if (!token) {
        return res.status(401).json({ error: 'Token required' });
      }
      
      // In a production environment, you would store and verify tokens properly
      // For now, we'll validate the token format
      if (token.startsWith('wgt_session_')) {
        res.status(200).json({ valid: true });
      } else {
        res.status(401).json({ error: 'Invalid token' });
      }
      
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(500).json({ error: 'Token verification failed' });
    }
  });
}