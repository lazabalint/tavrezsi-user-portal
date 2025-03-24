// Production wrapper
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import fs from 'fs';

// Set up require for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Set environment for production
process.env.NODE_ENV = 'production';

// Load environment variables from .env file
try {
  console.log('Loading environment variables for production...');
  require('./load-env.cjs')();
} catch (err) {
  console.warn('Warning: Could not load environment variables from .env file:', err.message);
}

// Hard-code critical Mailjet values if not in environment
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

// Fix node-mailjet by conditionally requiring it
global.mailjet = null;
try {
  // Initialize Mailjet
  const Mailjet = require('node-mailjet');
  // Use masked API key for logging
  const maskedKey = process.env.MAILJET_API_KEY.substring(0, 4) + 
                    '*'.repeat(process.env.MAILJET_API_KEY.length - 4);
  
  console.log(`Initializing Mailjet with API key: ${maskedKey}`);
  
  global.mailjet = new Mailjet({
    apiKey: process.env.MAILJET_API_KEY,
    apiSecret: process.env.MAILJET_API_SECRET
  });
  
  console.log('Mailjet client initialized successfully in production wrapper');
} catch (err) {
  console.error('Error initializing Mailjet client:', err.message);
  console.warn('Warning: Could not load node-mailjet. Email functionality will be disabled.');
}

// Import and run the application
console.log('Starting server in production mode...');
import('./dist/index.js').catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});