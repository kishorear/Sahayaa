import { db } from "./db";
import { integrationSettings, type IntegrationSettings, type InsertIntegrationSettings } from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Service for managing integration settings with persistent database storage
 * This service handles JIRA, Zendesk, and other third-party integration configurations
 */
export class IntegrationSettingsService {
  /**
   * Get all integration settings for a tenant
   */
  async getIntegrationSettings(tenantId: number): Promise<IntegrationSettings[]> {
    try {
      console.log(`IntegrationSettingsService: Getting all settings for tenant ${tenantId}`);
      const settings = await db
        .select()
        .from(integrationSettings)
        .where(eq(integrationSettings.tenantId, tenantId));
      
      console.log(`IntegrationSettingsService: Found ${settings.length} integration settings for tenant ${tenantId}`);
      return settings;
    } catch (error) {
      console.error(`IntegrationSettingsService: Error getting settings for tenant ${tenantId}:`, error);
      return [];
    }
  }

  /**
   * Get integration settings for a specific service type
   */
  async getIntegrationSettingsByService(tenantId: number, serviceType: string): Promise<IntegrationSettings | undefined> {
    try {
      console.log(`IntegrationSettingsService: Getting ${serviceType} settings for tenant ${tenantId}`);
      const results = await db
        .select()
        .from(integrationSettings)
        .where(and(
          eq(integrationSettings.tenantId, tenantId),
          eq(integrationSettings.serviceType, serviceType)
        ));
      
      const setting = results[0];
      if (setting) {
        console.log(`IntegrationSettingsService: Found ${serviceType} settings for tenant ${tenantId}, enabled: ${setting.isEnabled}`);
      } else {
        console.log(`IntegrationSettingsService: No ${serviceType} settings found for tenant ${tenantId}`);
      }
      
      return setting;
    } catch (error) {
      console.error(`IntegrationSettingsService: Error getting ${serviceType} settings for tenant ${tenantId}:`, error);
      return undefined;
    }
  }

  /**
   * Create or update integration settings (upsert operation)
   */
  async saveIntegrationSettings(tenantId: number, serviceType: string, configuration: any, isEnabled: boolean = true): Promise<IntegrationSettings> {
    try {
      console.log(`IntegrationSettingsService: Saving ${serviceType} settings for tenant ${tenantId}, enabled: ${isEnabled}`);
      
      // First, try to update existing settings
      const existingSettings = await this.getIntegrationSettingsByService(tenantId, serviceType);
      
      if (existingSettings) {
        // Update existing settings
        console.log(`IntegrationSettingsService: Updating existing ${serviceType} settings for tenant ${tenantId}`);
        const [updated] = await db
          .update(integrationSettings)
          .set({
            configuration,
            isEnabled,
            updatedAt: new Date()
          })
          .where(and(
            eq(integrationSettings.tenantId, tenantId),
            eq(integrationSettings.serviceType, serviceType)
          ))
          .returning();
        
        console.log(`IntegrationSettingsService: Successfully updated ${serviceType} settings for tenant ${tenantId}`);
        return updated;
      } else {
        // Create new settings
        console.log(`IntegrationSettingsService: Creating new ${serviceType} settings for tenant ${tenantId}`);
        const newSettings: InsertIntegrationSettings = {
          tenantId,
          serviceType,
          isEnabled,
          configuration
        };
        
        const [created] = await db
          .insert(integrationSettings)
          .values(newSettings)
          .returning();
        
        console.log(`IntegrationSettingsService: Successfully created ${serviceType} settings for tenant ${tenantId}`);
        return created;
      }
    } catch (error) {
      console.error(`IntegrationSettingsService: Error saving ${serviceType} settings for tenant ${tenantId}:`, error);
      throw new Error(`Failed to save ${serviceType} integration settings: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Enable or disable an integration
   */
  async toggleIntegration(tenantId: number, serviceType: string, isEnabled: boolean): Promise<IntegrationSettings | undefined> {
    try {
      console.log(`IntegrationSettingsService: ${isEnabled ? 'Enabling' : 'Disabling'} ${serviceType} for tenant ${tenantId}`);
      
      const [updated] = await db
        .update(integrationSettings)
        .set({
          isEnabled,
          updatedAt: new Date()
        })
        .where(and(
          eq(integrationSettings.tenantId, tenantId),
          eq(integrationSettings.serviceType, serviceType)
        ))
        .returning();
      
      if (updated) {
        console.log(`IntegrationSettingsService: Successfully ${isEnabled ? 'enabled' : 'disabled'} ${serviceType} for tenant ${tenantId}`);
      } else {
        console.log(`IntegrationSettingsService: No ${serviceType} settings found to update for tenant ${tenantId}`);
      }
      
      return updated;
    } catch (error) {
      console.error(`IntegrationSettingsService: Error toggling ${serviceType} for tenant ${tenantId}:`, error);
      return undefined;
    }
  }

  /**
   * Delete integration settings
   */
  async deleteIntegrationSettings(tenantId: number, serviceType: string): Promise<boolean> {
    try {
      console.log(`IntegrationSettingsService: Deleting ${serviceType} settings for tenant ${tenantId}`);
      
      const result = await db
        .delete(integrationSettings)
        .where(and(
          eq(integrationSettings.tenantId, tenantId),
          eq(integrationSettings.serviceType, serviceType)
        ));
      
      console.log(`IntegrationSettingsService: Successfully deleted ${serviceType} settings for tenant ${tenantId}`);
      return !!result;
    } catch (error) {
      console.error(`IntegrationSettingsService: Error deleting ${serviceType} settings for tenant ${tenantId}:`, error);
      return false;
    }
  }

  /**
   * Load integration settings from database and return configuration for initialization
   */
  async loadIntegrationConfigurations(tenantId: number): Promise<Array<{type: string, config: any}>> {
    try {
      console.log(`IntegrationSettingsService: Loading all integration configurations for tenant ${tenantId}`);
      
      const settings = await this.getIntegrationSettings(tenantId);
      const enabledSettings = settings.filter(setting => setting.isEnabled);
      
      const configurations = enabledSettings.map(setting => ({
        type: setting.serviceType,
        config: {
          ...(typeof setting.configuration === 'object' && setting.configuration !== null ? setting.configuration : {}),
          enabled: setting.isEnabled
        }
      }));
      
      console.log(`IntegrationSettingsService: Loaded ${configurations.length} enabled integration configurations for tenant ${tenantId}`);
      return configurations;
    } catch (error) {
      console.error(`IntegrationSettingsService: Error loading integration configurations for tenant ${tenantId}:`, error);
      return [];
    }
  }
}

// Export a singleton instance
export const integrationSettingsService = new IntegrationSettingsService();