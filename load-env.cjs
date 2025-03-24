// Explicitly load environment variables from .env file at startup
const fs = require('fs');
const path = require('path');

// Function to parse .env file
function parseEnvFile(filePath) {
  try {
    const envContent = fs.readFileSync(filePath, 'utf8');
    const lines = envContent.split('\n');
    const envVars = {};

    lines.forEach(line => {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || !line.trim()) {
        return;
      }

      // Parse key-value pairs
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        
        envVars[key] = value;
      }
    });

    return envVars;
  } catch (error) {
    console.error(`Error parsing .env file: ${error.message}`);
    return {};
  }
}

// Load environment variables from .env file
function loadEnvVars() {
  const envPath = path.resolve(process.cwd(), '.env');
  
  if (fs.existsSync(envPath)) {
    console.log('Loading environment variables from .env file');
    const envVars = parseEnvFile(envPath);
    
    // Set each environment variable if not already set
    Object.entries(envVars).forEach(([key, value]) => {
      if (!process.env[key]) {
        process.env[key] = value;
        console.log(`Set environment variable: ${key}`);
      }
    });
    
    // Log Mailjet-related environment variables (masked)
    if (process.env.MAILJET_API_KEY) {
      const maskedKey = process.env.MAILJET_API_KEY.substring(0, 4) + 
                        '*'.repeat(process.env.MAILJET_API_KEY.length - 4);
      console.log(`MAILJET_API_KEY: ${maskedKey}`);
    } else {
      console.log('MAILJET_API_KEY: not set');
    }
    
    if (process.env.MAILJET_API_SECRET) {
      console.log('MAILJET_API_SECRET: [is set]');
    } else {
      console.log('MAILJET_API_SECRET: not set');
    }
    
    if (process.env.MAILJET_FROM_EMAIL) {
      console.log(`MAILJET_FROM_EMAIL: ${process.env.MAILJET_FROM_EMAIL}`);
    } else {
      console.log('MAILJET_FROM_EMAIL: not set');
    }
  } else {
    console.log('.env file not found. Using existing environment variables.');
  }
}

// Export the function
module.exports = loadEnvVars;

// If this script is run directly, execute the loading function
if (require.main === module) {
  loadEnvVars();
}