// Helper script to login as admin
// Run this script in the browser console using:
// fetch('/client/login-helper.js').then(r => r.text()).then(eval);

(async function() {
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: 'admin', 
        password: 'admin123'
      }),
      credentials: 'include'
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log('Login successful:', data);
      
      // Set a cookie directly as a fallback measure
      const essentialUserData = {
        id: data.id,
        username: data.username,
        role: data.role,
        tenantId: data.tenantId
      };
      document.cookie = `essential_user_data=${JSON.stringify(essentialUserData)};path=/;max-age=86400`;
      
      // Refresh the page to apply the session
      window.location.reload();
      return true;
    } else {
      const errorText = await res.text();
      console.error('Login failed:', errorText);
      return false;
    }
  } catch (error) {
    console.error('Login error:', error);
    return false;
  }
})();