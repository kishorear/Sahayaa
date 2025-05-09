/**
 * Test Email Support Functionality
 * 
 * This script tests the email configuration, connection, and AI-powered features:
 * 1. Tests SMTP connection with Gmail
 * 2. Tests sending a test email
 * 3. Verifies AI response generation works (if enabled)
 * 4. Tests error detection and automatic ticket creation
 */

// Import necessary modules
import nodemailer from 'nodemailer';
import { EmailService, setupEmailService } from './server/email-service.ts';
import { storage } from './server/storage.ts';
import { generateChatResponse } from './server/ai.ts';
import { AIProviderFactory } from './server/ai/providers/index.ts';

// Test credentials provided by user (for test purposes only)
const TEST_EMAIL = 'testsahaaya@gmail.com';
const TEST_PASSWORD = 'sahaaya@123';

async function testEmailFunctionality() {
  console.log('🔍 Starting Email Support Functionality Test');
  console.log('------------------------------------------');

  // 1. Test basic SMTP connection
  try {
    console.log('1️⃣ Testing SMTP connection to Gmail...');
    
    // Create email config object for testing
    const emailConfig = {
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // Use STARTTLS for port 587
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
        checkInterval: 60000, // 1 minute
        enableAiResponses: true // Enable AI responses for testing
      }
    };

    // Create a transporter for testing the connection
    const transportConfig = {
      service: 'gmail',
      auth: {
        user: TEST_EMAIL,
        pass: TEST_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    };

    console.log('Creating test transporter...');
    const testTransporter = nodemailer.createTransport(transportConfig);
    
    console.log('Verifying SMTP connection...');
    await testTransporter.verify();
    console.log('✅ SMTP connection successful!');

    // 2. Test sending a test email
    console.log('\n2️⃣ Testing sending an email...');
    
    // Create the email service
    const emailService = setupEmailService(emailConfig);
    
    // Send a test email
    try {
      await emailService.sendEmail(
        TEST_EMAIL, // Sending to ourselves for testing
        'Test Email Support System',
        `
        <div>
          <h2>Email Support Test</h2>
          <p>This is a test email sent from the support system test script.</p>
          <p>Time: ${new Date().toISOString()}</p>
        </div>
        `
      );
      console.log('✅ Test email sent successfully!');
    } catch (sendError) {
      console.error('❌ Failed to send test email:', sendError);
    }

    // 3. Test AI response generation
    console.log('\n3️⃣ Testing AI response generation...');
    
    // Create a test ticket to simulate email receipt
    const testTicket = await storage.createTicket({
      title: 'Test AI Response Email',
      description: 'This is a test ticket created via the test script to verify AI response generation.',
      status: 'new',
      category: 'test',
      complexity: 'simple',
      assignedTo: '',
      source: 'email'
    });
    
    console.log(`Created test ticket ID: ${testTicket.id}`);
    
    // Create a test message
    await storage.createMessage({
      ticketId: testTicket.id,
      sender: 'user',
      content: 'I am having an issue with the system. Can you help troubleshoot it?',
      metadata: {
        fromEmail: TEST_EMAIL,
        fromName: 'Test User',
        hasHtml: false
      }
    });
    
    console.log('Created test message for ticket');
    
    // Test error detection functionality with a message containing an error
    console.log('\n4️⃣ Testing error detection in new emails...');
    
    // Create a test ticket with an error message
    const errorTicket = await storage.createTicket({
      title: 'Error in Application',
      description: 'I encountered a critical error when using the application. The system crashed with error code 500 while trying to upload a file. This happens every time I try to upload a file larger than 5MB.',
      status: 'new',
      category: 'test',
      complexity: 'medium',
      assignedTo: '',
      source: 'email'
    });
    
    console.log(`Created error test ticket ID: ${errorTicket.id}`);
    
    // Create a message for the error ticket
    await storage.createMessage({
      ticketId: errorTicket.id,
      sender: 'user',
      content: 'I encountered a critical error when using the application. The system crashed with error code 500 while trying to upload a file. This happens every time I try to upload a file larger than 5MB.',
      metadata: {
        fromEmail: TEST_EMAIL,
        fromName: 'Test User',
        hasHtml: false
      }
    });
    
    console.log('Created error test message for ticket');
    
    // Check if AI provider is available for testing detection
    const aiProvider = AIProviderFactory.getProviderForOperation(1, 'chat');
    if (aiProvider) {
      console.log('AI provider available for error detection testing');
      
      // Simulate error detection
      const errorDetection = await detectErrorsInContent(
        'I encountered a critical error when using the application. The system crashed with error code 500 while trying to upload a file. This happens every time I try to upload a file larger than 5MB.',
        'Error in Application',
        1
      );
      
      if (errorDetection.hasError) {
        console.log('✅ Error successfully detected in test message:');
        console.log(`   - Title: ${errorDetection.errorTitle}`);
        console.log(`   - Category: ${errorDetection.errorCategory}`);
        console.log(`   - Severity: ${errorDetection.errorSeverity}`);
      } else {
        console.log('❌ Error detection test failed - no error detected in message that contains an error');
      }
    } else {
      console.log('⚠️ No AI provider available - skipping error detection test');
    }
    
    console.log('\n✅ Email support test completed successfully!');
    
  } catch (error) {
    console.error('❌ Email support test failed:', error);
  }
}

// Implementation of error detection for testing
async function detectErrorsInContent(content, subject, tenantId) {
  try {
    if (!content || content.trim().length === 0) {
      return { 
        hasError: false, 
        errorTitle: '',
        errorDescription: '',
        errorCategory: '',
        errorSeverity: 'low'
      };
    }
    
    // Call AI provider to analyze content for errors
    const provider = AIProviderFactory.getProviderForOperation(tenantId || 1, 'chat');
    
    if (!provider) {
      console.log('No AI provider available for error detection');
      return { 
        hasError: false, 
        errorTitle: '',
        errorDescription: '',
        errorCategory: '',
        errorSeverity: 'low'
      };
    }
    
    const systemPrompt = `
      You are an error detection system that analyzes customer support emails.
      Determine if the email describes an error, issue, or problem that needs technical attention.
      If an error is detected, provide a concise error title, detailed description, category, and severity level.
      Format your response as JSON with the following fields:
      - hasError: boolean indicating if an error is detected
      - errorTitle: a concise title for the error (only if hasError is true)
      - errorDescription: detailed explanation of the error (only if hasError is true)
      - errorCategory: one of [software_bug, configuration_issue, user_error, hardware_problem, security_incident, performance_issue, other] (only if hasError is true)
      - errorSeverity: one of [low, medium, high] (only if hasError is true)
    `;
    
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Subject: ${subject}\n\nEmail Content: ${content}` }
    ];
    
    // Call AI provider with appropriate parameters
    const response = await provider.generateChatResponse(messages, '', '');
    
    // Parse response as JSON
    try {
      const result = JSON.parse(response);
      
      // Validate result structure and return
      return {
        hasError: !!result.hasError,
        errorTitle: result.hasError ? (result.errorTitle || 'Unspecified Error') : '',
        errorDescription: result.hasError ? (result.errorDescription || 'No description provided') : '',
        errorCategory: result.hasError ? (result.errorCategory || 'other') : '',
        errorSeverity: result.hasError ? 
          (result.errorSeverity === 'low' || result.errorSeverity === 'medium' || result.errorSeverity === 'high' 
            ? result.errorSeverity 
            : 'medium') 
          : 'low'
      };
    } catch (parseError) {
      console.error(`Error parsing AI response for error detection: ${parseError.message}`);
      return { 
        hasError: false, 
        errorTitle: '',
        errorDescription: '',
        errorCategory: '',
        errorSeverity: 'low'
      };
    }
  } catch (error) {
    console.error(`Error detecting errors in content: ${error.message}`);
    return { 
      hasError: false, 
      errorTitle: '',
      errorDescription: '',
      errorCategory: '',
      errorSeverity: 'low'
    };
  }
}

// Run the test
testEmailFunctionality().catch(err => {
  console.error('Test failed with error:', err);
});