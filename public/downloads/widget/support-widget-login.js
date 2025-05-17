/**
 * Support AI Chat Widget - Authentication Module
 * Adds user authentication capabilities to the chat widget
 * 
 * This module handles user login/registration for the embedded chat widget
 * and connects to the configured AI provider once authenticated
 */

(function() {
  // Default configuration settings that will be replaced with user values
  const defaultConfig = {
    tenantId: "__TENANT_ID__",
    apiKey: "__API_KEY__",
    primaryColor: "__PRIMARY_COLOR__",
    apiEndpoint: "__API_ENDPOINT__", // Will be replaced with client's API endpoint
    requireAuth: true,
    authEndpoint: "__AUTH_ENDPOINT__" // Auth service endpoint
  };

  // Authentication state
  const authState = {
    isAuthenticated: false,
    user: null,
    token: null,
    loading: false,
    error: null
  };

  // Get authentication token from sessionStorage
  function getStoredAuth() {
    try {
      const storedAuth = sessionStorage.getItem('supportAiAuth');
      if (storedAuth) {
        const parsed = JSON.parse(storedAuth);
        authState.isAuthenticated = true;
        authState.user = parsed.user;
        authState.token = parsed.token;
        return true;
      }
    } catch (err) {
      console.error('Error reading stored authentication:', err);
    }
    return false;
  }

  // Store authentication in sessionStorage
  function storeAuth(user, token) {
    try {
      sessionStorage.setItem('supportAiAuth', JSON.stringify({
        user: user,
        token: token
      }));
    } catch (err) {
      console.error('Error storing authentication:', err);
    }
  }

  // Clear authentication from sessionStorage
  function clearAuth() {
    try {
      sessionStorage.removeItem('supportAiAuth');
    } catch (err) {
      console.error('Error clearing authentication:', err);
    }
  }

  // Create login UI
  function createLoginUI(container, onSuccess) {
    // Create login form
    const loginForm = document.createElement('div');
    loginForm.className = 'support-login-form';
    loginForm.innerHTML = `
      <div class="login-header">
        <h3>Login to Support Chat</h3>
      </div>
      <div class="login-body">
        <div class="form-group">
          <label for="support-email">Email</label>
          <input type="email" id="support-email" placeholder="Enter your email">
        </div>
        <div class="form-group">
          <label for="support-password">Password</label>
          <input type="password" id="support-password" placeholder="Enter your password">
        </div>
        <div class="login-error" style="display: none; color: red; margin-bottom: 10px;"></div>
        <button class="login-button">Login</button>
        <div class="login-footer">
          <span class="register-link">Don't have an account? <a href="#">Register</a></span>
        </div>
      </div>
    `;

    // Create registration form
    const registerForm = document.createElement('div');
    registerForm.className = 'support-register-form';
    registerForm.style.display = 'none';
    registerForm.innerHTML = `
      <div class="login-header">
        <h3>Register for Support Chat</h3>
      </div>
      <div class="login-body">
        <div class="form-group">
          <label for="register-name">Name</label>
          <input type="text" id="register-name" placeholder="Enter your name">
        </div>
        <div class="form-group">
          <label for="register-email">Email</label>
          <input type="email" id="register-email" placeholder="Enter your email">
        </div>
        <div class="form-group">
          <label for="register-password">Password</label>
          <input type="password" id="register-password" placeholder="Create a password">
        </div>
        <div class="register-error" style="display: none; color: red; margin-bottom: 10px;"></div>
        <button class="register-button">Register</button>
        <div class="login-footer">
          <span class="login-link">Already have an account? <a href="#">Login</a></span>
        </div>
      </div>
    `;

    // Add forms to container
    container.appendChild(loginForm);
    container.appendChild(registerForm);

    // Add event listeners
    const registerLink = loginForm.querySelector('.register-link a');
    registerLink.addEventListener('click', function(e) {
      e.preventDefault();
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
    });

    const loginLink = registerForm.querySelector('.login-link a');
    loginLink.addEventListener('click', function(e) {
      e.preventDefault();
      registerForm.style.display = 'none';
      loginForm.style.display = 'block';
    });

    // Login form submission
    const loginButton = loginForm.querySelector('.login-button');
    loginButton.addEventListener('click', function() {
      const email = loginForm.querySelector('#support-email').value;
      const password = loginForm.querySelector('#support-password').value;
      const errorElement = loginForm.querySelector('.login-error');
      
      if (!email || !password) {
        errorElement.textContent = 'Please enter both email and password';
        errorElement.style.display = 'block';
        return;
      }

      // Show loading state
      loginButton.textContent = 'Logging in...';
      loginButton.disabled = true;
      errorElement.style.display = 'none';

      // Call authentication endpoint
      authenticateUser(email, password)
        .then(response => {
          if (response.success) {
            // Store authentication
            storeAuth(response.user, response.token);
            authState.isAuthenticated = true;
            authState.user = response.user;
            authState.token = response.token;
            
            // Call success callback
            if (onSuccess && typeof onSuccess === 'function') {
              onSuccess(response.user);
            }
          } else {
            // Show error
            errorElement.textContent = response.message || 'Login failed. Please check your credentials.';
            errorElement.style.display = 'block';
          }
        })
        .catch(err => {
          // Show error
          errorElement.textContent = 'An error occurred. Please try again.';
          errorElement.style.display = 'block';
          console.error('Authentication error:', err);
        })
        .finally(() => {
          // Reset loading state
          loginButton.textContent = 'Login';
          loginButton.disabled = false;
        });
    });

    // Register form submission
    const registerButton = registerForm.querySelector('.register-button');
    registerButton.addEventListener('click', function() {
      const name = registerForm.querySelector('#register-name').value;
      const email = registerForm.querySelector('#register-email').value;
      const password = registerForm.querySelector('#register-password').value;
      const errorElement = registerForm.querySelector('.register-error');
      
      if (!name || !email || !password) {
        errorElement.textContent = 'Please fill all fields';
        errorElement.style.display = 'block';
        return;
      }

      // Show loading state
      registerButton.textContent = 'Registering...';
      registerButton.disabled = true;
      errorElement.style.display = 'none';

      // Call registration endpoint
      registerUser(name, email, password)
        .then(response => {
          if (response.success) {
            // Store authentication
            storeAuth(response.user, response.token);
            authState.isAuthenticated = true;
            authState.user = response.user;
            authState.token = response.token;
            
            // Call success callback
            if (onSuccess && typeof onSuccess === 'function') {
              onSuccess(response.user);
            }
          } else {
            // Show error
            errorElement.textContent = response.message || 'Registration failed. Please try again.';
            errorElement.style.display = 'block';
          }
        })
        .catch(err => {
          // Show error
          errorElement.textContent = 'An error occurred. Please try again.';
          errorElement.style.display = 'block';
          console.error('Registration error:', err);
        })
        .finally(() => {
          // Reset loading state
          registerButton.textContent = 'Register';
          registerButton.disabled = false;
        });
    });

    return {
      showLogin: function() {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
      },
      showRegister: function() {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
      },
      hide: function() {
        loginForm.style.display = 'none';
        registerForm.style.display = 'none';
      }
    };
  }

  // Authenticate user against the auth endpoint
  async function authenticateUser(email, password) {
    try {
      const config = window.supportAiConfig || defaultConfig;
      const authUrl = config.authEndpoint || defaultConfig.authEndpoint;
      
      const response = await fetch(authUrl + '/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': config.tenantId
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Authentication error:', error);
      return { 
        success: false, 
        message: 'Authentication failed. Please try again.' 
      };
    }
  }

  // Register a new user
  async function registerUser(name, email, password) {
    try {
      const config = window.supportAiConfig || defaultConfig;
      const authUrl = config.authEndpoint || defaultConfig.authEndpoint;
      
      const response = await fetch(authUrl + '/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': config.tenantId
        },
        body: JSON.stringify({
          name: name,
          email: email,
          password: password
        })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        message: 'Registration failed. Please try again.' 
      };
    }
  }

  // Initialize the authentication module
  function initAuth(container, onSuccess) {
    // Check if already authenticated
    if (getStoredAuth()) {
      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess(authState.user);
      }
      return true;
    }
    
    // Create login UI
    const loginUI = createLoginUI(container, onSuccess);
    loginUI.showLogin();
    return false;
  }

  // Connect to the configured AI provider
  async function connectToAI() {
    try {
      const config = window.supportAiConfig || defaultConfig;
      const apiUrl = config.apiEndpoint || defaultConfig.apiEndpoint;
      
      // Only proceed if authenticated
      if (!authState.isAuthenticated || !authState.token) {
        throw new Error('User not authenticated');
      }
      
      // Get AI provider configuration
      const response = await fetch(apiUrl + '/ai-config', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          'X-Tenant-ID': config.tenantId,
          'X-API-Key': config.apiKey
        }
      });
      
      const aiConfig = await response.json();
      
      if (!aiConfig.success) {
        throw new Error(aiConfig.message || 'Failed to get AI configuration');
      }
      
      return aiConfig.config;
    } catch (error) {
      console.error('AI connection error:', error);
      return null;
    }
  }

  // Expose methods to the window object
  window.SupportAIAuth = {
    init: initAuth,
    login: authenticateUser,
    register: registerUser,
    connectToAI: connectToAI,
    getAuthState: () => ({ ...authState }),
    isAuthenticated: () => authState.isAuthenticated,
    logout: function() {
      clearAuth();
      authState.isAuthenticated = false;
      authState.user = null;
      authState.token = null;
      return true;
    }
  };
})();