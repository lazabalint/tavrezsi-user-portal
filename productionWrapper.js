// Production wrapper
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Set up require for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Set environment for production
process.env.NODE_ENV = 'production';

// Fix node-mailjet by conditionally requiring it
global.mailjet = null;
try {
  // Only try to load mailjet if actually needed
  if (process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY) {
    global.mailjet = require('node-mailjet');
  }
} catch (err) {
  console.warn('Warning: Could not load node-mailjet. Email functionality will be disabled.');
}

// Import and run the application
import('./dist/index.js').catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});