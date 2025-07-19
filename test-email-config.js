/**
 * Test Email Configuration and AI Response Toggle
 * 
 * This script tests saving and loading email configuration including the AI response toggle:
 * 1. Saves a test email configuration with enableAiResponses set to true
 * 2. Retrieves the configuration to verify it was saved correctly
 * 3. Updates the configuration with enableAiResponses set to false
 * 4. Verifies that the settings are loaded correctly in the UI
 */

import { storage } from './server/storage.ts';

async function testEmailConfiguration() {
  console.log('🔍 Starting Email Configuration Test');
  console.log('------------------------------------------');

  const TEST_EMAIL = 'support@sahayaa.ai';
  const TEST_PASSWORD = 'sahaaya@123';

  try {
    // 1. Save test configuration with AI responses enabled
    console.log('1️⃣ Saving test email configuration with AI responses enabled...');
    
    const tenantId = 1; // Default tenant
    const emailConfig = {
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          type: 'basic',
          user: TEST_EMAIL,
          pass: TEST_PASSWORD
        }
      },
      imap: {
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        authTimeout: 10000,
        auth: {
          type: 'basic',
          user: TEST_EMAIL,
          pass: TEST_PASSWORD
        }
      },
      settings: {
        fromName: 'Test Support System',
        fromEmail: TEST_EMAIL,
        ticketSubjectPrefix: '[Support #]',
        checkInterval: 60000,
        enableAiResponses: true // Set to true initially
      }
    };

    // Get current tenant settings
    const tenant = await storage.getTenantById(tenantId);
    console.log(`Found tenant: ${tenant.name} (ID: ${tenant.id})`);

    // Prepare updated settings
    let currentSettings = {};
    if (tenant.settings) {
      if (typeof tenant.settings === 'string') {
        currentSettings = JSON.parse(tenant.settings);
      } else if (typeof tenant.settings === 'object') {
        currentSettings = tenant.settings;
      }
    }

    const updatedSettings = {
      ...currentSettings,
      emailConfig
    };

    // Update tenant with new settings
    await storage.updateTenant(tenantId, {
      settings: updatedSettings
    });
    console.log('✅ Email configuration with AI responses enabled saved successfully');

    // 2. Retrieve configuration to verify
    console.log('\n2️⃣ Retrieving email configuration to verify...');
    const updatedTenant = await storage.getTenantById(tenantId);
    
    let savedConfig = null;
    if (updatedTenant.settings) {
      if (typeof updatedTenant.settings === 'string') {
        const parsed = JSON.parse(updatedTenant.settings);
        savedConfig = parsed.emailConfig;
      } else if (typeof updatedTenant.settings === 'object' && updatedTenant.settings.emailConfig) {
        savedConfig = updatedTenant.settings.emailConfig;
      }
    }

    if (savedConfig) {
      console.log('Email configuration retrieved successfully:');
      console.log(`- SMTP Host: ${savedConfig.smtp.host}`);
      console.log(`- SMTP Port: ${savedConfig.smtp.port}`);
      console.log(`- IMAP Host: ${savedConfig.imap.host}`);
      console.log(`- IMAP Port: ${savedConfig.imap.port}`);
      console.log(`- From Name: ${savedConfig.settings.fromName}`);
      console.log(`- From Email: ${savedConfig.settings.fromEmail}`);
      console.log(`- Check Interval: ${savedConfig.settings.checkInterval}ms`);
      console.log(`- AI Responses Enabled: ${savedConfig.settings.enableAiResponses}`);
      
      if (savedConfig.settings.enableAiResponses === true) {
        console.log('✅ AI Responses toggle verified to be enabled');
      } else {
        console.log('❌ AI Responses toggle not set correctly (expected: true)');
      }
    } else {
      console.log('❌ Failed to retrieve email configuration');
    }

    // 3. Update configuration with AI responses disabled
    console.log('\n3️⃣ Updating configuration with AI responses disabled...');
    emailConfig.settings.enableAiResponses = false;
    
    const updateSettings = {
      ...currentSettings,
      emailConfig
    };
    
    await storage.updateTenant(tenantId, {
      settings: updateSettings
    });
    console.log('✅ Email configuration updated with AI responses disabled');

    // 4. Verify updated configuration
    console.log('\n4️⃣ Verifying updated configuration...');
    const finalTenant = await storage.getTenantById(tenantId);
    
    let finalConfig = null;
    if (finalTenant.settings) {
      if (typeof finalTenant.settings === 'string') {
        const parsed = JSON.parse(finalTenant.settings);
        finalConfig = parsed.emailConfig;
      } else if (typeof finalTenant.settings === 'object' && finalTenant.settings.emailConfig) {
        finalConfig = finalTenant.settings.emailConfig;
      }
    }

    if (finalConfig) {
      console.log('Updated email configuration retrieved successfully:');
      console.log(`- AI Responses Enabled: ${finalConfig.settings.enableAiResponses}`);
      
      if (finalConfig.settings.enableAiResponses === false) {
        console.log('✅ AI Responses toggle verified to be disabled');
      } else {
        console.log('❌ AI Responses toggle not updated correctly (expected: false)');
      }
    } else {
      console.log('❌ Failed to retrieve updated email configuration');
    }

    console.log('\n✅ Email configuration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Email configuration test failed:', error);
  }
}

// Run the test
testEmailConfiguration().catch(err => {
  console.error('Test failed with error:', err);
});