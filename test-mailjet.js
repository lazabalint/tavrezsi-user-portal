// Test script for sending an email with Mailjet
import Mailjet from 'node-mailjet';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Try to load environment variables
try {
  console.log('Loading environment variables...');
  const loadEnv = require('./load-env.js');
  loadEnv();
} catch (err) {
  console.warn('Warning: Could not load environment variables:', err.message);
}

// Use credentials from environment or hardcoded values
const API_KEY = process.env.MAILJET_API_KEY || 'ef9b6978bb0be2a545c84f86297c4a2f';
const API_SECRET = process.env.MAILJET_API_SECRET || '7cf172634f0fc24c91d516f957013fed';
const FROM_EMAIL = process.env.MAILJET_FROM_EMAIL || 'no-reply@tavrezsi.hu';

// Print masked API details
console.log(`Using Mailjet API Key: ${API_KEY.substring(0, 4)}${'*'.repeat(API_KEY.length - 4)}`);
console.log(`Using Mailjet FROM_EMAIL: ${FROM_EMAIL}`);

// Initialize Mailjet client
const mailjet = new Mailjet({
  apiKey: API_KEY,
  apiSecret: API_SECRET
});

// Function to send a test email
async function sendTestEmail() {
  try {
    // Check mailjet client
    console.log('Mailjet client initialized successfully');
    
    // Initialize email data
    const result = await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: FROM_EMAIL,
            Name: 'TávRezsi Test'
          },
          To: [
            {
              Email: 'test@example.com', // Change this to your email if you want to receive the test
              Name: 'Test Recipient'
            }
          ],
          Subject: 'Mailjet Test Email',
          TextPart: 'This is a test email from TávRezsi using Mailjet',
          HTMLPart: '<h3>This is a test email from TávRezsi using Mailjet</h3>'
        }
      ]
    });
    
    console.log('Email sent successfully');
    console.log('Response status:', result.response.status);
    return result;
  } catch (error) {
    console.error('Failed to send email:', error.message);
    if (error.statusCode) {
      console.error('Status code:', error.statusCode);
    }
    if (error.response && error.response.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Execute test
sendTestEmail()
  .then(() => console.log('Test completed successfully'))
  .catch((error) => {
    console.log('Test failed:', error.message);
    process.exit(1);
  });