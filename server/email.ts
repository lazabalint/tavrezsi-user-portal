import Mailjet from 'node-mailjet';
import { User } from '@shared/schema';
import * as crypto from 'crypto';
import { storage } from './storage';

// Mailjet API kliens inicializálása
const mailjet = new Mailjet({
  apiKey: 'ef9b6978bb0be2a545c84f86297c4a2f',
  apiSecret: 'aad2183a19f9ff885b4e02391fbcd9fc'
});

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
    expiresAt
  });
  
  return token;
}

// Email sablon a jelszó-visszaállításhoz
const getPasswordResetEmailTemplate = (user: User, token: string) => {
  const resetUrl = `https://dev.tavrezsi.hu/reset-password?token=${token}`;
  
  return {
    From: {
      Email: "no-reply@tavrezsi.hu",
      Name: "TávRezsi Rendszer"
    },
    To: [
      {
        Email: user.email,
        Name: user.name
      }
    ],
    Subject: "Jelszó beállítása a TávRezsi rendszerben",
    HTMLPart: `
      <h3>Tisztelt ${user.name}!</h3>
      <p>Üdvözöljük a TávRezsi rendszerben!</p>
      <p>Egy felhasználói fiókot hoztunk létre Önnek. Kérjük, állítsa be jelszavát az alábbi linkre kattintva:</p>
      <p><a href="${resetUrl}">Jelszó beállítása</a></p>
      <p>Amennyiben nem működik a fenti link, másolja be az alábbi URL-t a böngészőjébe:</p>
      <p>${resetUrl}</p>
      <p>A link 24 óráig érvényes.</p>
      <p>Üdvözlettel,<br>TávRezsi Rendszer</p>
    `,
    TextPart: `
      Tisztelt ${user.name}!
      
      Üdvözöljük a TávRezsi rendszerben!
      
      Egy felhasználói fiókot hoztunk létre Önnek. Kérjük, állítsa be jelszavát az alábbi link segítségével:
      ${resetUrl}
      
      A link 24 óráig érvényes.
      
      Üdvözlettel,
      TávRezsi Rendszer
    `
  };
};

// Email sablon a jelszó-visszaállításhoz
const getWelcomeEmailTemplate = (user: User) => {
  return {
    From: {
      Email: "no-reply@tavrezsi.hu",
      Name: "TávRezsi Rendszer"
    },
    To: [
      {
        Email: user.email,
        Name: user.name
      }
    ],
    Subject: "Üdvözöljük a TávRezsi rendszerben!",
    HTMLPart: `
      <h3>Tisztelt ${user.name}!</h3>
      <p>Üdvözöljük a TávRezsi rendszerben!</p>
      <p>Fiókja sikeresen aktiválásra került. Mostantól bejelentkezhet a rendszerbe a beállított jelszavával.</p>
      <p>Üdvözlettel,<br>TávRezsi Rendszer</p>
    `,
    TextPart: `
      Tisztelt ${user.name}!
      
      Üdvözöljük a TávRezsi rendszerben!
      
      Fiókja sikeresen aktiválásra került. Mostantól bejelentkezhet a rendszerbe a beállított jelszavával.
      
      Üdvözlettel,
      TávRezsi Rendszer
    `
  };
};

// Email küldése jelszó-visszaállításhoz
export async function sendPasswordResetEmail(user: User): Promise<boolean> {
  try {
    const token = await generatePasswordResetToken(user.id);
    const emailData = getPasswordResetEmailTemplate(user, token);
    
    const result = await mailjet
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [emailData]
      });
    
    console.log('Email küldés sikeres:', result.body);
    return true;
  } catch (error) {
    console.error('Hiba történt az email küldése során:', error);
    return false;
  }
}

// Üdvözlő email küldése
export async function sendWelcomeEmail(user: User): Promise<boolean> {
  try {
    const emailData = getWelcomeEmailTemplate(user);
    
    const result = await mailjet
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [emailData]
      });
    
    console.log('Üdvözlő email küldés sikeres:', result.body);
    return true;
  } catch (error) {
    console.error('Hiba történt az üdvözlő email küldése során:', error);
    return false;
  }
}