import { AIProviderInterface, AIProviderConfig } from './AIProviderInterface';
import { OpenAIProvider } from './OpenAIProvider';
import { GeminiProvider } from './GeminiProvider';
import { AnthropicProvider } from './AnthropicProvider';
import { BedrockProvider } from './BedrockProvider';
import { CustomProvider } from './CustomProvider';
import { AiProvider } from '@shared/schema';

/**
 * Convert database provider model to provider config
 */
function convertDbProviderToConfig(provider: AiProvider): AIProviderConfig {
  // Ensure provider type is one of the valid types before conversion
  // This prevents runtime type errors from invalid data
  const validTypes = ['openai', 'gemini', 'anthropic', 'aws-bedrock', 'bedrock', 'custom'];
  
  // Map bedrock to aws-bedrock for internal consistency
  let mappedType = provider.type;
  if (mappedType === 'bedrock') {
    mappedType = 'aws-bedrock';
  }
  
  const providerType = validTypes.includes(mappedType) 
    ? mappedType as 'openai' | 'gemini' | 'anthropic' | 'aws-bedrock' | 'custom'
    : 'custom'; // Fallback to custom if type is invalid
    
  return {
    type: providerType,
    apiKey: provider.apiKey || undefined,
    baseUrl: provider.baseUrl || undefined,
    model: provider.model || undefined,
    settings: provider.settings as Record<string, any>,
    isPrimary: Boolean(provider.isPrimary),
    useForClassification: Boolean(provider.useForClassification),
    useForAutoResolve: Boolean(provider.useForAutoResolve),
    useForChat: Boolean(provider.useForChat),
    useForEmail: Boolean(provider.useForEmail),
  };
}

/**
 * Factory class to create and manage AI providers
 */
export class AIProviderFactory {
  private static providers: Map<string, AIProviderInterface> = new Map();
  private static configs: Map<number, AIProviderConfig[]> = new Map();
  
  /**
   * Get all configurations for a tenant
   * 
   * @param tenantId Tenant ID
   * @returns Array of provider configurations
   */
  static getProviderConfigs(tenantId: number): AIProviderConfig[] {
    return this.configs.get(tenantId) || [];
  }
  
  /**
   * Set provider configurations for a tenant
   * 
   * @param tenantId Tenant ID
   * @param configs Array of provider configurations
   */
  static setProviderConfigs(tenantId: number, configs: AIProviderConfig[]): void {
    this.configs.set(tenantId, configs);
    
    // Clear existing providers for this tenant
    const tenantPrefix = `${tenantId}:`;
    Array.from(this.providers.keys()).forEach(key => {
      if (key.startsWith(tenantPrefix)) {
        this.providers.delete(key);
      }
    });
  }
  
  /**
   * Add a provider configuration for a tenant
   * 
   * @param tenantId Tenant ID
   * @param config Provider configuration
   */
  static addProviderConfig(tenantId: number, config: AIProviderConfig): void {
    const configs = this.getProviderConfigs(tenantId);
    configs.push(config);
    this.setProviderConfigs(tenantId, configs);
  }
  
  /**
   * Remove a provider configuration for a tenant
   * 
   * @param tenantId Tenant ID
   * @param type Provider type to remove
   * @returns Boolean indicating if removal was successful
   */
  static removeProviderConfig(tenantId: number, type: string): boolean {
    const configs = this.getProviderConfigs(tenantId);
    const initialLength = configs.length;
    
    const updatedConfigs = configs.filter(config => config.type !== type);
    this.setProviderConfigs(tenantId, updatedConfigs);
    
    return updatedConfigs.length < initialLength;
  }
  
  /**
   * Create a provider instance based on configuration
   * 
   * @param config Provider configuration
   * @returns AI provider implementation
   */
  private static createProvider(config: AIProviderConfig): AIProviderInterface {
    switch (config.type) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'gemini':
        return new GeminiProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      case 'aws-bedrock':
        return new BedrockProvider(config);
      case 'custom':
        return new CustomProvider(config);
      default:
        throw new Error(`Unknown provider type: ${config.type}`);
    }
  }
  
  /**
   * Get a specific AI provider for a tenant
   * 
   * @param tenantId Tenant ID
   * @param type Provider type
   * @returns AI provider instance
   */
  static getProvider(tenantId: number, type: string): AIProviderInterface | null {
    const key = `${tenantId}:${type}`;
    
    // Return cached provider if exists
    if (this.providers.has(key)) {
      return this.providers.get(key) || null;
    }
    
    // Find configuration
    const configs = this.getProviderConfigs(tenantId);
    const config = configs.find(c => c.type === type);
    
    if (!config) {
      return null;
    }
    
    try {
      // Create new provider
      const provider = this.createProvider(config);
      this.providers.set(key, provider);
      return provider;
    } catch (error) {
      console.error(`Failed to create provider ${type} for tenant ${tenantId}:`, error);
      return null;
    }
  }
  
  /**
   * Get the primary provider for a tenant
   * 
   * @param tenantId Tenant ID
   * @returns Primary AI provider or null if none configured
   */
  static getPrimaryProvider(tenantId: number): AIProviderInterface | null {
    const configs = this.getProviderConfigs(tenantId);
    
    // First try to get a provider marked as primary
    const primaryConfig = configs.find(c => c.isPrimary);
    if (primaryConfig) {
      return this.getProvider(tenantId, primaryConfig.type);
    }
    
    // Fall back to OpenAI if available
    const openaiConfig = configs.find(c => c.type === 'openai');
    if (openaiConfig) {
      return this.getProvider(tenantId, 'openai');
    }
    
    // Otherwise, just use the first provider
    if (configs.length > 0) {
      return this.getProvider(tenantId, configs[0].type);
    }
    
    // No fallback to default/environment providers - strict tenant isolation
    console.warn(`No AI provider configured for tenant ${tenantId}`);
    return null;
  }
  
  /**
   * Get a provider for a specific operation (chat, classification, auto-resolve)
   * 
   * @param tenantId Tenant ID
   * @param operation Operation type ('chat', 'classification', 'autoResolve', 'email')
   * @returns AI provider for the operation or primary provider
   */
  static getProviderForOperation(
    tenantId: number, 
    operation: 'chat' | 'classification' | 'autoResolve' | 'email'
  ): AIProviderInterface | null {
    const configs = this.getProviderConfigs(tenantId);
    
    // Map operation to config property
    const configProperty = this.mapOperationToConfigProperty(operation);
    
    // Find a provider specifically configured for this operation
    const specificConfig = configs.find(c => c[configProperty] === true);
    if (specificConfig) {
      return this.getProvider(tenantId, specificConfig.type);
    }
    
    // Fall back to primary provider
    return this.getPrimaryProvider(tenantId);
  }
  
  /**
   * Map operation type to config property name
   */
  private static mapOperationToConfigProperty(
    operation: 'chat' | 'classification' | 'autoResolve' | 'email'
  ): keyof AIProviderConfig {
    switch (operation) {
      case 'chat':
        return 'useForChat';
      case 'classification':
        return 'useForClassification';
      case 'autoResolve':
        return 'useForAutoResolve';
      case 'email':
        return 'useForEmail';
      default:
        return 'isPrimary';
    }
  }
  
  /**
   * Initialize all providers and ensure they're available
   * 
   * @param tenantId Tenant ID
   * @returns Object mapping provider types to availability status
   */
  static async checkAllProviders(tenantId: number): Promise<Record<string, boolean>> {
    const configs = this.getProviderConfigs(tenantId);
    const results: Record<string, boolean> = {};
    
    for (const config of configs) {
      try {
        const provider = this.getProvider(tenantId, config.type);
        if (provider) {
          results[config.type] = await provider.isAvailable();
        } else {
          results[config.type] = false;
        }
      } catch (error) {
        console.error(`Error checking provider ${config.type}:`, error);
        results[config.type] = false;
      }
    }
    
    return results;
  }
  
  /**
   * Clear all cached providers
   */
  static clearProviders(): void {
    this.providers.clear();
  }
  
  /**
   * Get a provider instance from database model
   * 
   * @param provider Database provider model
   * @returns AI provider instance
   */
  static getInstance(provider: AiProvider): AIProviderInterface {
    // Convert DB model to config
    const config = convertDbProviderToConfig(provider);
    
    try {
      // Create new provider
      return this.createProvider(config);
    } catch (error) {
      console.error(`Failed to create provider ${provider.type} (ID: ${provider.id}):`, error);
      // Fallback to custom provider in case of error
      return new CustomProvider({
        type: 'custom',
        model: provider.model || 'unknown',
        settings: provider.settings as Record<string, any>
      });
    }
  }
  
  /**
   * Load AI provider configurations from database
   * 
   * @param tenantId Tenant ID to load providers for
   * @param providers Array of provider configurations from database
   */
  static loadProvidersFromDatabase(tenantId: number, providers: AiProvider[]): void {
    if (!providers || providers.length === 0) {
      console.log(`No AI providers found in database for tenant ${tenantId}`);
      return;
    }
    
    // Convert database models to provider configs
    const configs = providers
      .filter(p => p.enabled)
      .map(convertDbProviderToConfig);
    
    console.log(`Loaded ${configs.length} AI providers from database for tenant ${tenantId}`);
    
    // Set the configurations
    this.setProviderConfigs(tenantId, configs);
  }
}