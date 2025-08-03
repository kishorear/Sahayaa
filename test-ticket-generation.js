// Test ticket generation to ensure it's working
import fetch from 'node-fetch';

async function testTicketGeneration() {
  try {
    console.log('Testing ticket generation...');
    
    // Test widget ticket creation 
    const requestData = {
      tenantId: 1,
      sessionId: 'test-session-123',
      conversation: [
        {
          role: 'user',
          content: 'I cannot log into my account. The login button is not working properly.',
          timestamp: new Date().toISOString()
        },
        {
          role: 'assistant', 
          content: 'I understand you are having trouble with login. Let me help you with this issue.',
          timestamp: new Date().toISOString()
        }
      ],
      context: {
        url: 'https://example.com/login',
        title: 'Login Page',
        userAgent: 'Test User Agent'
      }
    };
    
    const response = await fetch('http://localhost:5000/api/widget/create-ticket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Ticket generation successful!');
      console.log('Ticket ID:', result.ticket?.id);
      console.log('Title:', result.ticket?.title);
      console.log('Category:', result.ticket?.category);
      console.log('Status:', result.ticket?.status);
      
      if (result.agentInsights) {
        console.log('✅ Agent insights generated successfully');
        console.log('Agent category:', result.agentInsights.category);
        console.log('Agent urgency:', result.agentInsights.urgency);
      } else {
        console.log('ℹ️ No agent insights (this is okay if agent service is unavailable)');
      }
      
      return true;
    } else {
      console.log('❌ Ticket generation failed');
      console.log('Error:', result.error || result.message);
      console.log('Response status:', response.status);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  }
}

// Run the test
testTicketGeneration().then(success => {
  console.log(success ? 'Ticket generation is working correctly' : 'Ticket generation has issues');
  process.exit(success ? 0 : 1);
});