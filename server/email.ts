import { users, properties } from '../shared/schema';
import * as crypto from 'crypto';
import { storage } from './storage';

// Import Mailjet properly for ESM
import Mailjet from 'node-mailjet';

// Define type for mailjet client
type MailjetClient = ReturnType<typeof Mailjet> | null;

// Function to safely get Mailjet client, handling ESM environment
function getMailjetClient(): MailjetClient {
  try {
    // For ESM environment with global variable
    if (typeof globalThis !== 'undefined') {
      // Using type assertion and hasOwnProperty to safely check for mailjet property
      const globalThisAny = globalThis as any;
      if (globalThisAny.hasOwnProperty('mailjet') && globalThisAny.mailjet !== undefined) {
        return globalThisAny.mailjet as MailjetClient;
      }
    }
    
    // Standard initialization
    return new Mailjet({
      apiKey: process.env.MAILJET_API_KEY || '',
      apiSecret: process.env.MAILJET_API_SECRET || ''
    });
  } catch (error) {
    console.warn('Failed to initialize Mailjet client:', error);
    return null;
  }
}

// Get mailjet client or null if unavailable
let mailjet: MailjetClient = null;
try {
  mailjet = getMailjetClient();
} catch (error) {
  console.warn('Mailjet initialization failed, email functionality will be disabled:', error);
}

// Token generálása jelszó-visszaállításhoz
export async function generatePasswordResetToken(userId: number): Promise<string> {
  // Generálunk egy 32 karakter hosszú véletlenszerű tokent
  const token = crypto.randomBytes(32).toString('hex');
  
  // Token lejárati idő beállítása (24 óra a jelenlegi időponttól)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);
  
  // Token tárolása az adatbázisban
  await storage.createPasswordResetToken({
    userId,
    token,
    expiresAt,
    isUsed: false
  });
  
  return token;
}

// Email sablon a jelszó-visszaállításhoz
const getPasswordResetEmailTemplate = (user: typeof users.$inferSelect, token: string) => {
  // Az abszolút URL-t használjuk a biztonság kedvéért, és hogy inkognitó módban is működjön
  const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  console.log("Jelszó visszaállító link generálva:", resetUrl.substring(0, 40) + "...");
  
  return {
    html: `
      <h1>Jelszó visszaállítás</h1>
      <p>Kedves ${user.name}!</p>
      <p>A jelszavad visszaállításához kattints az alábbi linkre:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>A link 24 óráig érvényes.</p>
      <p>Ha nem te kérted a jelszó visszaállítását, hagyd figyelmen kívül ezt az emailt.</p>
      <p>Üdvözlettel,<br>Ingatlankezelő rendszer</p>
    `,
    text: `
      Jelszó visszaállítás
      
      Kedves ${user.name}!
      
      A jelszavad visszaállításához kattints az alábbi linkre:
      ${resetUrl}
      
      A link 24 óráig érvényes.
      
      Ha nem te kérted a jelszó visszaállítását, hagyd figyelmen kívül ezt az emailt.
      
      Üdvözlettel,
      Ingatlankezelő rendszer
    `
  };
};

// Email sablon a jelszó-visszaállításhoz
const getWelcomeEmailTemplate = (user: typeof users.$inferSelect) => {
  const loginUrl = `${process.env.APP_URL || 'http://localhost:3000'}/login`;
  
  return {
    html: `
      <h1>Üdvözlünk az Ingatlankezelő rendszerben!</h1>
      <p>Kedves ${user.name}!</p>
      <p>Sikeresen beállítottad a jelszavadat. Most már bejelentkezhetsz a rendszerbe az alábbi adatokkal:</p>
      <ul>
        <li>Email cím: ${user.email}</li>
        <li>Felhasználónév: ${user.username}</li>
      </ul>
      <p>A bejelentkezéshez kattints az alábbi linkre:</p>
      <p><a href="${loginUrl}">${loginUrl}</a></p>
      <p>Üdvözlettel,<br>Ingatlankezelő rendszer</p>
    `,
    text: `
      Üdvözlünk az Ingatlankezelő rendszerben!
      
      Kedves ${user.name}!
      
      Sikeresen beállítottad a jelszavadat. Most már bejelentkezhetsz a rendszerbe az alábbi adatokkal:
      - Email cím: ${user.email}
      - Felhasználónév: ${user.username}
      
      A bejelentkezéshez kattints az alábbi linkre:
      ${loginUrl}
      
      Üdvözlettel,
      Ingatlankezelő rendszer
    `
  };
};

// Email sablon a bérlő meghívásához
const getTenantInviteEmailTemplate = (user: typeof users.$inferSelect, property: typeof properties.$inferSelect, token: string) => {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  console.log("Bérlő meghívó link generálva:", resetUrl.substring(0, 40) + "...");
  
  return {
    html: `
      <h1>Meghívó a(z) ${property.name} ingatlanhoz</h1>
      <p>Kedves ${user.name}!</p>
      <p>Meghívást kaptál a(z) ${property.name} ingatlanhoz mint bérlő.</p>
      <p>A hozzáféréshez először be kell állítanod a jelszavadat az alábbi linken:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>A link 24 óráig érvényes.</p>
      <p>A jelszó beállítása után a következő adatokkal tudsz bejelentkezni:</p>
      <ul>
        <li>Email cím: ${user.email}</li>
        <li>Felhasználónév: ${user.username}</li>
      </ul>
      <p>Üdvözlettel,<br>Ingatlankezelő rendszer</p>
    `,
    text: `
      Meghívó a(z) ${property.name} ingatlanhoz
      
      Kedves ${user.name}!
      
      Meghívást kaptál a(z) ${property.name} ingatlanhoz mint bérlő.
      
      A hozzáféréshez először be kell állítanod a jelszavadat az alábbi linken:
      ${resetUrl}
      
      A link 24 óráig érvényes.
      
      A jelszó beállítása után a következő adatokkal tudsz bejelentkezni:
      - Email cím: ${user.email}
      - Felhasználónév: ${user.username}
      
      Üdvözlettel,
      Ingatlankezelő rendszer
    `
  };
};

// Email küldése jelszó-visszaállításhoz
export async function sendPasswordResetEmail(
  user: typeof users.$inferSelect,
  token: string
): Promise<boolean> {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

  const html = `
    <h1>Jelszó visszaállítás</h1>
    <p>Kedves ${user.name}!</p>
    <p>A jelszavad visszaállításához kattints az alábbi linkre:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>A link 24 óráig érvényes.</p>
    <p>Ha nem te kérted a jelszó visszaállítását, hagyd figyelmen kívül ezt az emailt.</p>
    <p>Üdvözlettel,<br>Ingatlankezelő rendszer</p>
  `;

  const text = `
    Jelszó visszaállítás
    
    Kedves ${user.name}!
    
    A jelszavad visszaállításához kattints az alábbi linkre:
    ${resetUrl}
    
    A link 24 óráig érvényes.
    
    Ha nem te kérted a jelszó visszaállítását, hagyd figyelmen kívül ezt az emailt.
    
    Üdvözlettel,
    Ingatlankezelő rendszer
  `;

  // Check if mailjet is available
  if (!mailjet) {
    console.log('Email service (Mailjet) not available. Password reset link:', resetUrl);
    return true; // Return true to indicate operation was "successful" for development
  }

  try {
    await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: process.env.MAILJET_FROM_EMAIL || 'noreply@example.com',
            Name: 'Ingatlankezelő rendszer'
          },
          To: [
            {
              Email: user.email,
              Name: user.name
            }
          ],
          Subject: 'Jelszó visszaállítás',
          TextPart: text,
          HTMLPart: html
        }
      ]
    });
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    console.log('Password reset link (not sent):', resetUrl);
    return false;
  }
}

// Üdvözlő email küldése
export async function sendWelcomeEmail(user: typeof users.$inferSelect): Promise<void> {
  const loginUrl = `${process.env.APP_URL || 'http://localhost:3000'}/login`;

  const html = `
    <h1>Üdvözlünk az Ingatlankezelő rendszerben!</h1>
    <p>Kedves ${user.name}!</p>
    <p>Sikeresen beállítottad a jelszavadat. Most már bejelentkezhetsz a rendszerbe az alábbi adatokkal:</p>
    <ul>
      <li>Email cím: ${user.email}</li>
      <li>Felhasználónév: ${user.username}</li>
    </ul>
    <p>A bejelentkezéshez kattints az alábbi linkre:</p>
    <p><a href="${loginUrl}">${loginUrl}</a></p>
    <p>Üdvözlettel,<br>Ingatlankezelő rendszer</p>
  `;

  const text = `
    Üdvözlünk az Ingatlankezelő rendszerben!
    
    Kedves ${user.name}!
    
    Sikeresen beállítottad a jelszavadat. Most már bejelentkezhetsz a rendszerbe az alábbi adatokkal:
    - Email cím: ${user.email}
    - Felhasználónév: ${user.username}
    
    A bejelentkezéshez kattints az alábbi linkre:
    ${loginUrl}
    
    Üdvözlettel,
    Ingatlankezelő rendszer
  `;

  await mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: {
          Email: process.env.MAILJET_FROM_EMAIL || 'noreply@example.com',
          Name: 'Ingatlankezelő rendszer'
        },
        To: [
          {
            Email: user.email,
            Name: user.name
          }
        ],
        Subject: 'Üdvözlünk az Ingatlankezelő rendszerben!',
        TextPart: text,
        HTMLPart: html
      }
    ]
  });
}

// Bérlő meghívó email küldése
export async function sendTenantInviteEmail(
  user: typeof users.$inferSelect,
  property: typeof properties.$inferSelect,
  token: string
): Promise<void> {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

  const html = `
    <h1>Meghívó a(z) ${property.name} ingatlanhoz</h1>
    <p>Kedves ${user.name}!</p>
    <p>Meghívást kaptál a(z) ${property.name} ingatlanhoz mint bérlő.</p>
    <p>A hozzáféréshez először be kell állítanod a jelszavadat az alábbi linken:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>A link 24 óráig érvényes.</p>
    <p>A jelszó beállítása után a következő adatokkal tudsz bejelentkezni:</p>
    <ul>
      <li>Email cím: ${user.email}</li>
      <li>Felhasználónév: ${user.username}</li>
    </ul>
    <p>Üdvözlettel,<br>Ingatlankezelő rendszer</p>
  `;

  const text = `
    Meghívó a(z) ${property.name} ingatlanhoz
    
    Kedves ${user.name}!
    
    Meghívást kaptál a(z) ${property.name} ingatlanhoz mint bérlő.
    
    A hozzáféréshez először be kell állítanod a jelszavadat az alábbi linken:
    ${resetUrl}
    
    A link 24 óráig érvényes.
    
    A jelszó beállítása után a következő adatokkal tudsz bejelentkezni:
    - Email cím: ${user.email}
    - Felhasználónév: ${user.username}
    
    Üdvözlettel,
    Ingatlankezelő rendszer
  `;

  await mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: {
          Email: process.env.MAILJET_FROM_EMAIL || 'noreply@example.com',
          Name: 'Ingatlankezelő rendszer'
        },
        To: [
          {
            Email: user.email,
            Name: user.name
          }
        ],
        Subject: `Meghívó a(z) ${property.name} ingatlanhoz`,
        TextPart: text,
        HTMLPart: html
      }
    ]
  });
}