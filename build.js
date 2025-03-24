#!/usr/bin/env node

/**
 * Custom build script to work around node-mailjet issues in production
 */
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Build frontend with Vite
console.log('Building frontend with Vite...');
exec('npx vite build', (error, stdout, stderr) => {
  if (error) {
    console.error(`Vite build error: ${error}`);
    return;
  }
  
  console.log(stdout);
  if (stderr) console.error(stderr);
  
  // Build server with ESBuild, but exclude problematic dependencies
  console.log('Building server with ESBuild...');
  exec('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', 
    (error, stdout, stderr) => {
      if (error) {
        console.error(`ESBuild error: ${error}`);
        return;
      }
      
      console.log(stdout);
      if (stderr) console.error(stderr);
      
      // Create a small wrapper to handle node-mailjet
      console.log('Creating production wrapper...');
      const wrapperContent = `// Production wrapper
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
import('./index.js').catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
`;
      
      fs.writeFileSync('dist/wrapper.js', wrapperContent);
      console.log('Build completed successfully!');
      
      console.log('Creating start script...');
      const startScript = `#!/bin/sh
NODE_ENV=production node dist/wrapper.js
`;
      
      fs.writeFileSync('start.sh', startScript);
      fs.chmodSync('start.sh', '755');
      console.log('Created start.sh script');
    }
  );
});