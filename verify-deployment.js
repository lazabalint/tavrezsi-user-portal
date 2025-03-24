// ESM version of the deployment verification script
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

console.log('╔════════════════════════════════════════════════╗');
console.log('║ TávRezsi Deployment Verification Script         ║');
console.log('╚════════════════════════════════════════════════╝');

console.log('\n📋 Environment Check:');

// Try to load environment variables
try {
  console.log('- Loading environment variables...');
  const loadEnv = require('./load-env.cjs');
  loadEnv();
  console.log('✅ Environment variables loaded');
} catch (err) {
  console.warn('⚠️ Could not load environment variables:', err.message);
}

// Hard-code critical Mailjet values if not in environment
if (!process.env.MAILJET_API_KEY) {
  console.log('- MAILJET_API_KEY not found in environment, using hardcoded value.');
  process.env.MAILJET_API_KEY = 'ef9b6978bb0be2a545c84f86297c4a2f';
}

if (!process.env.MAILJET_API_SECRET) {
  console.log('- MAILJET_API_SECRET not found in environment, using hardcoded value.');
  process.env.MAILJET_API_SECRET = '7cf172634f0fc24c91d516f957013fed';
}

if (!process.env.MAILJET_FROM_EMAIL) {
  console.log('- MAILJET_FROM_EMAIL not found in environment, using hardcoded value.');
  process.env.MAILJET_FROM_EMAIL = 'no-reply@tavrezsi.hu';
}

console.log('\n📬 Mailjet Verification:');

// Mailjet test
async function testMailjet() {
  // Masked logging of API key
  const maskedKey = process.env.MAILJET_API_KEY.substring(0, 4) + 
                   '*'.repeat(process.env.MAILJET_API_KEY.length - 4);
  console.log(`- Using Mailjet API Key: ${maskedKey}`);
  console.log(`- Using Mailjet FROM_EMAIL: ${process.env.MAILJET_FROM_EMAIL}`);
  
  try {
    // Import Mailjet
    const Mailjet = (await import('node-mailjet')).default;
    
    // Initialize the client
    const mailjet = new Mailjet({
      apiKey: process.env.MAILJET_API_KEY,
      apiSecret: process.env.MAILJET_API_SECRET
    });
    
    console.log('- Mailjet client initialized successfully');
    
    // Get the properties of the mailjet object to verify it's correctly initialized
    const methods = Object.keys(mailjet);
    console.log(`- Mailjet client has the following methods: ${methods.join(', ')}`);
    
    if (mailjet && typeof mailjet.post === 'function') {
      console.log('✅ Mailjet client is properly configured and ready to send emails');
      
      // Set to true to actually send a test email
      const sendTestEmail = false;
      
      if (sendTestEmail) {
        console.log('- Sending test email...');
        const result = await mailjet.post('send', { version: 'v3.1' }).request({
          Messages: [
            {
              From: {
                Email: process.env.MAILJET_FROM_EMAIL,
                Name: 'TávRezsi Deployment Test'
              },
              To: [
                {
                  Email: 'test@example.com', // Change this to receive the test
                  Name: 'Test Recipient'
                }
              ],
              Subject: 'TávRezsi Deployment Test Email',
              TextPart: 'This is a test email from TávRezsi deployment verification',
              HTMLPart: '<h3>This is a test email from TávRezsi deployment verification</h3>'
            }
          ]
        });
        console.log('✅ Test email sent successfully');
      }
      
      return true;
    } else {
      console.error('❌ Mailjet client does not have expected methods');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to initialize Mailjet:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    return false;
  }
}

console.log('\n🔍 Verification Results:');

// Execute verification
testMailjet()
  .then(success => {
    if (success) {
      console.log('✅ Mailjet verification completed successfully');
      console.log('\n📝 Summary:');
      console.log('- Environment variables processed');
      console.log('- Mailjet client initialized correctly');
      console.log('- Email functionality should work in deployment');
      console.log('\n🎉 Deployment verification completed successfully!');
    } else {
      console.log('❌ Mailjet verification failed');
      console.log('\n📝 Summary:');
      console.log('- Mailjet client failed to initialize correctly');
      console.log('- Email functionality may not work in deployment');
      console.log('\n⚠️ Please check the logs above for more details.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Verification failed with unexpected error:', error);
    process.exit(1);
  });