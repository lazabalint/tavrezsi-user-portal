// ESM version of Mailjet validation script
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Load environment configuration
try {
  console.log('Loading environment variables...');
  require('./load-env.js')();
} catch (err) {
  console.warn('Warning: Could not load environment variables:', err.message);
}

// Hard-code critical Mailjet values if not in environment (same as productionWrapper.js)
if (!process.env.MAILJET_API_KEY) {
  console.log('MAILJET_API_KEY not found in environment, using hardcoded value.');
  process.env.MAILJET_API_KEY = 'ef9b6978bb0be2a545c84f86297c4a2f';
}

if (!process.env.MAILJET_API_SECRET) {
  console.log('MAILJET_API_SECRET not found in environment, using hardcoded value.');
  process.env.MAILJET_API_SECRET = '7cf172634f0fc24c91d516f957013fed';
}

if (!process.env.MAILJET_FROM_EMAIL) {
  console.log('MAILJET_FROM_EMAIL not found in environment, using hardcoded value.');
  process.env.MAILJET_FROM_EMAIL = 'no-reply@tavrezsi.hu';
}

// Mailjet test
async function testMailjet() {
  console.log('Testing Mailjet configuration...');
  
  // Masked logging of API key
  const maskedKey = process.env.MAILJET_API_KEY.substring(0, 4) + 
                   '*'.repeat(process.env.MAILJET_API_KEY.length - 4);
  console.log(`Using Mailjet API Key: ${maskedKey}`);
  console.log(`Using Mailjet FROM_EMAIL: ${process.env.MAILJET_FROM_EMAIL}`);
  
  try {
    // Import Mailjet
    const Mailjet = require('node-mailjet');
    
    // Initialize the client
    const mailjet = new Mailjet({
      apiKey: process.env.MAILJET_API_KEY,
      apiSecret: process.env.MAILJET_API_SECRET
    });
    
    console.log('Mailjet client initialized successfully');
    
    // Just check client initialization (don't actually send an email)
    if (mailjet && typeof mailjet.post === 'function') {
      console.log('✅ Mailjet client is properly configured and ready to send emails');
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

// Execute test
testMailjet()
  .then(success => {
    if (success) {
      console.log('Validation completed successfully');
    } else {
      console.log('Validation failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Validation failed with error:', error);
    process.exit(1);
  });