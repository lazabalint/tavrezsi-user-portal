import { neon, neonConfig } from '@neondatabase/serverless';
const DATABASE_URL = "postgresql://tavrezsi-main_owner:npg_GOaANP7ZXv4w@ep-long-dream-a26etgjh-pooler.eu-central-1.aws.neon.tech/tavrezsi-main?sslmode=require";
import { hashPassword } from './server/auth';

const connectionString = DATABASE_URL;

const main = async () => {
  console.log('Fixing user passwords...');
  
  try {
    // Configure neon to work in serverless environments
    neonConfig.fetchConnectionCache = true;
    
    // Create a Neon client
    const sql = neon(connectionString);
    
    // Hash the password
    const hashedOwner1Password = await hashPassword('tulajdonos123456');
    const hashedOwner2Password = await hashPassword('tulajdonos123456');
    const hashedTenantPassword = await hashPassword('berlo123456');
    
    // Update user password
    try {
      await sql`
        UPDATE users 
        SET password = ${hashedOwner1Password} 
        WHERE username = 'tulajdonos'
      `;
      console.log('Updated tulajdonos password');
      
      await sql`
        UPDATE users 
        SET password = ${hashedOwner2Password} 
        WHERE username = 'tulajdonos2'
      `;
      console.log('Updated tulajdonos2 password');
      
      await sql`
        UPDATE users 
        SET password = ${hashedTenantPassword} 
        WHERE username = 'berlo'
      `;
      console.log('Updated berlo password');
      
    } catch (err) {
      console.error('Error updating user passwords:', err);
    }
    
    console.log('User passwords fixed successfully');
  } catch (err) {
    console.error("Error in user password fixing:", err);
  }
};

main();