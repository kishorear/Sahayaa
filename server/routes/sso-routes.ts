import { Express, Request, Response, NextFunction } from "express";
import passport from "passport";
import { getSsoService } from "../sso-service";
import { storage } from "../storage";

export function registerSsoRoutes(app: Express, requireAuth: any, requireRole: any) {
  // Fetch available SSO providers
  app.get("/api/sso/providers", async (req: Request, res: Response) => {
    try {
      // Get tenant ID from user or request
      const tenantId = req.user?.tenantId || 1;
      
      // Get all enabled identity providers for this tenant
      const providers = await storage.getIdentityProviders(tenantId);
      const enabledProviders = providers.filter(p => p.enabled);
      
      // Return only the necessary info (no secrets)
      const providerList = enabledProviders.map(p => ({
        id: p.id,
        name: p.name,
        type: p.type
      }));
      
      res.status(200).json(providerList);
    } catch (error) {
      console.error('Error fetching SSO providers:', error);
      res.status(500).json({ message: 'Failed to fetch SSO providers' });
    }
  });
  
  // Admin endpoints for managing SSO providers
  app.get("/api/admin/sso/providers", requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId || 1;
      const providers = await storage.getIdentityProviders(tenantId);
      res.status(200).json(providers);
    } catch (error) {
      console.error('Error fetching SSO providers:', error);
      res.status(500).json({ message: 'Failed to fetch SSO providers' });
    }
  });
  
  app.get("/api/admin/sso/providers/:id", requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = req.user?.tenantId || 1;
      const provider = await storage.getIdentityProviderById(id, tenantId);
      
      if (!provider) {
        return res.status(404).json({ message: 'SSO provider not found' });
      }
      
      res.status(200).json(provider);
    } catch (error) {
      console.error('Error fetching SSO provider:', error);
      res.status(500).json({ message: 'Failed to fetch SSO provider' });
    }
  });
  
  app.post("/api/admin/sso/providers", requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const ssoService = getSsoService();
      
      // Set the tenant ID from the authenticated user
      const tenantId = req.user?.tenantId || 1;
      const providerData = {
        ...req.body,
        tenantId
      };
      
      const provider = await ssoService.createProvider(providerData);
      res.status(201).json(provider);
    } catch (error) {
      console.error('Error creating SSO provider:', error);
      res.status(500).json({ message: 'Failed to create SSO provider' });
    }
  });
  
  app.put("/api/admin/sso/providers/:id", requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = req.user?.tenantId || 1;
      const ssoService = getSsoService();
      
      const provider = await storage.getIdentityProviderById(id, tenantId);
      if (!provider) {
        return res.status(404).json({ message: 'SSO provider not found' });
      }
      
      const updatedProvider = await ssoService.updateProvider(id, req.body, tenantId);
      res.status(200).json(updatedProvider);
    } catch (error) {
      console.error('Error updating SSO provider:', error);
      res.status(500).json({ message: 'Failed to update SSO provider' });
    }
  });
  
  app.delete("/api/admin/sso/providers/:id", requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = req.user?.tenantId || 1;
      
      const provider = await storage.getIdentityProviderById(id, tenantId);
      if (!provider) {
        return res.status(404).json({ message: 'SSO provider not found' });
      }
      
      const deleted = await storage.deleteIdentityProvider(id, tenantId);
      if (deleted) {
        res.status(200).json({ message: 'SSO provider deleted successfully' });
      } else {
        res.status(500).json({ message: 'Failed to delete SSO provider' });
      }
    } catch (error) {
      console.error('Error deleting SSO provider:', error);
      res.status(500).json({ message: 'Failed to delete SSO provider' });
    }
  });
  
  app.post("/api/admin/sso/providers/test", requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const ssoService = getSsoService();
      const result = await ssoService.testProvider(req.body);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error testing SSO provider:', error);
      res.status(500).json({ 
        success: false,
        message: `Error testing SSO provider: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  });
  
  // SSO Authentication routes
  app.get("/api/sso/:providerType/:providerId", async (req: Request, res: Response) => {
    const { providerType, providerId } = req.params;
    
    // Redirect to appropriate OAuth provider
    if (providerType === 'oauth2') {
      passport.authenticate(`oauth2-${providerId}`, {
        scope: ['profile', 'email']
      })(req, res);
    } else if (providerType === 'google') {
      passport.authenticate(`google-${providerId}`, {
        scope: ['profile', 'email']
      })(req, res);
    } else if (providerType === 'saml') {
      passport.authenticate(`saml-${providerId}`)(req, res);
    } else {
      res.status(400).json({ message: 'Unsupported SSO provider type' });
    }
  });
  
  // Handle SSO callback
  app.get("/api/sso/:providerType/:providerId/callback", (req: Request, res: Response, next: NextFunction) => {
    const { providerType, providerId } = req.params;
    
    const authHandler = passport.authenticate(`${providerType}-${providerId}`, {
      failureRedirect: '/auth?error=Failed%20to%20authenticate'
    }, (err: Error | null, user: any) => {
      if (err || !user) {
        console.error('SSO authentication error:', err);
        return res.redirect('/auth?error=Failed%20to%20authenticate');
      }
      
      // Log the user in
      req.session.userId = user.id;
      res.redirect('/');
    });
    
    authHandler(req, res, next);
  });
}