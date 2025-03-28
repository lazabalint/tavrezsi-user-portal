import { db } from "./server/db";
import { passwordResetTokens } from "./shared/schema";
import { sql } from "drizzle-orm";

async function main() {
  try {
    console.log("Táblák módosítása...");
    
    // Először eldobjuk a táblát, ha létezik
    await db.execute(sql`
      DROP TABLE IF EXISTS "password_reset_tokens";
    `);
    
    console.log("A password_reset_tokens tábla eldobva. Újralétrehozás...");
    
    // Most létrehozzuk a táblát a helyes oszlopnevekkel
    await db.execute(sql`
      CREATE TABLE "password_reset_tokens" (
        "id" SERIAL PRIMARY KEY,
        "token" TEXT NOT NULL,
        "user_id" INTEGER NOT NULL,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "expires_at" TIMESTAMP NOT NULL,
        "is_used" BOOLEAN DEFAULT FALSE,
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);
    
    console.log("A password_reset_tokens tábla sikeresen létrehozva!");
  } catch (error) {
    console.error("Hiba történt:", error);
  } finally {
    process.exit(0);
  }
}

main();