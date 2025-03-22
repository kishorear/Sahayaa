import { Strategy as SamlStrategy } from 'passport-saml';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import { User, IdentityProvider, InsertUser } from '@shared/schema';
import { storage } from './storage';
import passport from 'passport';

/**
 * Service for handling Single Sign-On (SSO) authentication
 */
export class SsoService {
  /**
   * Initialize SSO providers for a tenant
   * 
   * @param tenantId The ID of the tenant to initialize SSO for
   */
  async initializeProviders(tenantId: number): Promise<void> {
    // Get all enabled identity providers for the tenant
    const providers = await storage.getIdentityProviders(tenantId);
    const enabledProviders = providers.filter(p => p.enabled);
    
    for (const provider of enabledProviders) {
      this.setupProvider(provider);
    }
  }
  
  /**
   * Set up a specific identity provider
   * 
   * @param provider The identity provider to set up
   */
  private setupProvider(provider: IdentityProvider): void {
    const { type, config } = provider;
    
    if (type === 'saml') {
      this.setupSamlProvider(provider.id, config);
    } else if (type === 'oauth2') {
      this.setupOAuth2Provider(provider.id, config);
    }
  }
  
  /**
   * Set up a SAML identity provider
   * 
   * @param providerId The ID of the identity provider
   * @param config The SAML configuration
   */
  private setupSamlProvider(providerId: number, config: any): void {
    const samlConfig = {
      callbackUrl: config.callbackUrl,
      entryPoint: config.entryPoint,
      issuer: config.issuer,
      cert: config.cert,
      identifierFormat: config.identifierFormat || 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      validateInResponseTo: config.validateInResponseTo !== false,
      disableRequestedAuthnContext: config.disableRequestedAuthnContext === true,
      passReqToCallback: true
    };
    
    passport.use(`saml-${providerId}`, new SamlStrategy(
      samlConfig,
      async (req: any, profile: any, done: any) => {
        try {
          // Extract tenant ID from request or state
          const tenantId = req.tenant?.id || 1;
          
          // Find or create user
          const user = await this.findOrCreateSsoUser(
            'saml',
            profile.nameID,
            tenantId,
            {
              name: profile.displayName || `${profile.firstName} ${profile.lastName}`.trim(),
              email: profile.email,
              // Extract role from attributes if available
              role: profile['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || 'user'
            }
          );
          
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    ));
  }
  
  /**
   * Set up an OAuth2 identity provider
   * 
   * @param providerId The ID of the identity provider
   * @param config The OAuth2 configuration
   */
  private setupOAuth2Provider(providerId: number, config: any): void {
    const oauth2Config = {
      authorizationURL: config.authorizationURL,
      tokenURL: config.tokenURL,
      clientID: config.clientID,
      clientSecret: config.clientSecret,
      callbackURL: config.callbackURL,
      scope: config.scope || 'profile email',
      passReqToCallback: true
    };
    
    passport.use(`oauth2-${providerId}`, new OAuth2Strategy(
      oauth2Config,
      async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          // Extract tenant ID from request or state
          const tenantId = req.tenant?.id || 1;
          
          // For OAuth2, we need to fetch user profile from API 
          // This is provider-specific, so we'll need to use the provider's API
          // Here's a generic implementation that assumes profile is already fetched by middleware
          
          // Find or create user
          const user = await this.findOrCreateSsoUser(
            'oauth2',
            profile.id || profile.sub,
            tenantId,
            {
              name: profile.name || profile.displayName,
              email: profile.email,
              role: 'user' // Default role
            },
            {
              accessToken,
              refreshToken,
              profile
            }
          );
          
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    ));
  }
  
  /**
   * Find or create a user for SSO authentication
   * 
   * @param provider The SSO provider type
   * @param providerId The user ID from the provider
   * @param tenantId The tenant ID
   * @param profileInfo The user profile information
   * @param providerData Additional provider data
   * @returns The found or created user
   */
  private async findOrCreateSsoUser(
    provider: string,
    providerId: string,
    tenantId: number,
    profileInfo: { name?: string; email?: string; role?: string },
    providerData: any = {}
  ): Promise<User> {
    // First, try to find an existing user with this SSO provider and ID
    let user = await storage.getUserBySsoId(provider, providerId, tenantId);
    
    if (user) {
      // Update the user's provider data if needed
      if (providerData && Object.keys(providerData).length > 0) {
        user = await storage.updateUser(user.id, {
          ssoProviderData: providerData,
          updatedAt: new Date()
        });
      }
      return user;
    }
    
    // User doesn't exist, create a new one
    // Generate a random secure password since SSO users don't need one
    const randomPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
    
    const newUser: InsertUser = {
      username: profileInfo.email || `${provider}_${providerId}`,
      password: randomPassword, // This won't be used for login
      name: profileInfo.name || null,
      email: profileInfo.email || null,
      role: profileInfo.role || 'user',
      tenantId
    };
    
    const createdUser = await storage.createUser(newUser);
    
    // Update the user with SSO info
    return await storage.updateUser(createdUser.id, {
      ssoEnabled: true,
      ssoProvider: provider,
      ssoProviderId: providerId,
      ssoProviderData: providerData
    });
  }
  
  /**
   * Get an SSO provider configuration
   * 
   * @param providerId The ID of the provider to get
   * @param tenantId Optional tenant ID to restrict access
   * @returns The identity provider configuration
   */
  async getProvider(providerId: number, tenantId?: number): Promise<IdentityProvider | undefined> {
    return storage.getIdentityProviderById(providerId, tenantId);
  }
  
  /**
   * Create a new SSO provider configuration
   * 
   * @param provider The provider configuration to create
   * @returns The created provider
   */
  async createProvider(provider: any): Promise<IdentityProvider> {
    const createdProvider = await storage.createIdentityProvider(provider);
    
    // Set up the provider for immediate use
    this.setupProvider(createdProvider);
    
    return createdProvider;
  }
  
  /**
   * Update an SSO provider configuration
   * 
   * @param providerId The ID of the provider to update
   * @param updates The updates to apply
   * @param tenantId Optional tenant ID to restrict access
   * @returns The updated provider
   */
  async updateProvider(providerId: number, updates: any, tenantId?: number): Promise<IdentityProvider> {
    const updatedProvider = await storage.updateIdentityProvider(providerId, updates, tenantId);
    
    // Re-initialize the provider if it's enabled
    if (updatedProvider.enabled) {
      this.setupProvider(updatedProvider);
    }
    
    return updatedProvider;
  }
  
  /**
   * Delete an SSO provider configuration
   * 
   * @param providerId The ID of the provider to delete
   * @param tenantId Optional tenant ID to restrict access
   * @returns Whether the deletion was successful
   */
  async deleteProvider(providerId: number, tenantId?: number): Promise<boolean> {
    return storage.deleteIdentityProvider(providerId, tenantId);
  }
  
  /**
   * Test an SSO provider configuration
   * 
   * @param providerConfig The configuration to test
   * @returns A result object indicating success or failure
   */
  async testProvider(providerConfig: any): Promise<{ success: boolean; message: string }> {
    try {
      const { type, config } = providerConfig;
      
      if (type === 'saml') {
        // Basic validation
        if (!config.entryPoint || !config.callbackUrl || !config.cert) {
          return { 
            success: false, 
            message: 'Missing required SAML configuration: entryPoint, callbackUrl, and cert are required' 
          };
        }
      } else if (type === 'oauth2') {
        // Basic validation
        if (!config.authorizationURL || !config.tokenURL || !config.clientID || !config.clientSecret || !config.callbackURL) {
          return { 
            success: false, 
            message: 'Missing required OAuth2 configuration: authorizationURL, tokenURL, clientID, clientSecret, and callbackURL are required' 
          };
        }
      } else {
        return { success: false, message: `Unsupported SSO provider type: ${type}` };
      }
      
      return { success: true, message: 'SSO provider configuration looks valid' };
    } catch (error) {
      return { 
        success: false, 
        message: `Error testing SSO provider: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
}

// Singleton instance
let ssoService: SsoService | null = null;

/**
 * Get the SSO service instance
 * 
 * @returns The SSO service
 */
export function getSsoService(): SsoService {
  if (!ssoService) {
    ssoService = new SsoService();
  }
  return ssoService;
}