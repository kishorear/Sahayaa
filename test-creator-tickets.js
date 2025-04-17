import fetch from 'node-fetch';

async function testCreatorTicketsEndpoint() {
  try {
    console.log('Testing /api/creator/tickets endpoint...');
    
    // First login as creator to get session cookie
    const loginResponse = await fetch('http://localhost:4000/api/creator/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin_creator',
        password: 'creator123'
      }),
      credentials: 'include',
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }
    
    const loginData = await loginResponse.json();
    console.log('Login successful:', loginData);
    
    // Get the cookie from the login response
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Cookies:', cookies);
    
    // Now try to fetch the tickets with the session cookie
    const ticketsResponse = await fetch('http://localhost:4000/api/creator/tickets', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      credentials: 'include',
    });
    
    if (!ticketsResponse.ok) {
      throw new Error(`Failed to fetch tickets: ${ticketsResponse.status} ${ticketsResponse.statusText}`);
    }
    
    const tickets = await ticketsResponse.json();
    console.log('Tickets fetched successfully:', tickets);
    console.log(`Total tickets: ${tickets.length}`);
    
    return tickets;
  } catch (error) {
    console.error('Error testing creator tickets endpoint:', error);
    throw error;
  }
}

testCreatorTicketsEndpoint()
  .then(tickets => {
    console.log('Test completed successfully');
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });