const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

// Create a sample SVG image for testing
const createTestImage = () => {
  const testImagePath = path.join(__dirname, 'uploads', 'test-profile-image.svg');
  const svgContent = `
  <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="45" fill="#4299e1" />
    <text x="50" y="55" font-family="Arial" font-size="30" fill="white" text-anchor="middle">Test</text>
  </svg>
  `;
  
  fs.writeFileSync(testImagePath, svgContent);
  console.log(`Test image created at ${testImagePath}`);
  return testImagePath;
};

// Test uploading a profile picture
const testProfilePictureUpload = async () => {
  try {
    console.log('Starting profile picture upload test...');
    
    // First, we need to authenticate (Note: This would be replaced with actual login in a real app)
    console.log('Note: Authentication is required to test this endpoint.');
    console.log('Please login to the application first and then run this test manually.');
    
    // Create test image
    const imagePath = createTestImage();
    
    // Create form data for upload
    const form = new FormData();
    form.append('profilePicture', fs.createReadStream(imagePath));
    
    console.log('Sample curl command to test profile picture upload:');
    console.log(`curl -X POST http://localhost:5000/api/profile/picture -F "profilePicture=@${imagePath}" -H "Cookie: your-session-cookie"`);
    
    console.log('Sample fetch code for frontend testing:');
    console.log(`
    // Frontend code for testing upload:
    const fileInput = document.getElementById('profile-picture-upload');
    const files = fileInput.files;
    if (files.length > 0) {
      const formData = new FormData();
      formData.append('profilePicture', files[0]);
      
      const response = await fetch('/api/profile/picture', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      const result = await response.json();
      console.log('Upload result:', result);
    }
    `);
    
    console.log('Sample curl command to test profile picture deletion:');
    console.log(`curl -X DELETE http://localhost:5000/api/profile/picture -H "Cookie: your-session-cookie"`);
    
  } catch (error) {
    console.error('Error during profile picture upload test:', error);
  }
};

// Run the test
testProfilePictureUpload();