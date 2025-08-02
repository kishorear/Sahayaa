// Test widget ticket creation with attachments
import fetch from 'node-fetch';

async function testWidgetTicketCreation() {
  try {
    console.log('Testing widget ticket creation with attachments...');
    
    // Create test attachment data
    const testAttachment = {
      filename: 'test-image.png',
      mimeType: 'image/png',
      data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' // 1x1 pixel PNG
    };
    
    const requestData = {
      tenantId: 1,
      sessionId: 'test-session-123',
      conversation: [
        {
          role: 'user',
          content: 'I am having trouble uploading a file to the system. It keeps showing an error message.'
        },
        {
          role: 'assistant', 
          content: 'I understand you are experiencing issues with file uploads. Let me help you with this.'
        },
        {
          role: 'user',
          content: 'The error says "File format not supported" but I am uploading a PNG image.'
        }
      ],
      attachments: [testAttachment],
      context: {
        url: 'https://example.com/upload',
        title: 'File Upload Page',
        userAgent: 'Test User Agent'
      }
    };
    
    const response = await fetch('http://localhost:5000/api/widget/ticket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'test-widget-key' // You might need a valid API key
      },
      body: JSON.stringify(requestData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Widget ticket creation successful!');
      console.log('Ticket ID:', result.ticket?.id);
      console.log('Title:', result.ticket?.title);
      console.log('Attachments processed:', result.attachments?.length || 0);
      
      if (result.attachments && result.attachments.length > 0) {
        console.log('✅ Attachments were properly saved');
        result.attachments.forEach((att, index) => {
          console.log(`  - Attachment ${index + 1}: ${att.filename} (${att.status})`);
        });
      } else {
        console.log('❌ No attachments were processed');
      }
      
      return true;
    } else {
      console.log('❌ Widget ticket creation failed');
      console.log('Error:', result.error);
      console.log('Response status:', response.status);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  }
}

// Run the test
testWidgetTicketCreation().then(success => {
  console.log(success ? 'Test completed successfully' : 'Test failed');
  process.exit(success ? 0 : 1);
});