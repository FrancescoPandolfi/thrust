import { getDb } from "../lib/db";
import { hashPassword } from "../lib/password";
import { exchanges, quoteSources, users } from "../lib/schema";

const SEED_EXCHANGES = [
  { micCode: "XAMS", yahooSuffix: "AS", name: "Euronext Amsterdam" },
  { micCode: "XLON", yahooSuffix: "L", name: "London Stock Exchange" },
  { micCode: "XPAR", yahooSuffix: "PA", name: "Euronext Paris" },
  { micCode: "XMIL", yahooSuffix: "MI", name: "Borsa Italiana" },
  { micCode: "XETR", yahooSuffix: "DE", name: "Xetra" },
  { micCode: "XSES", yahooSuffix: "SG", name: "Singapore Exchange" },
];

const SEED_QUOTE_SOURCES = [
  { id: "fx_eurusd", symbol: "EURUSD=X", provider: "frankfurter" },
];

async function main() {
  const db = getDb();

  console.log("Seeding exchanges...");
  for (const exchange of SEED_EXCHANGES) {
    await db
      .insert(exchanges)
      .values(exchange)
      .onConflictDoUpdate({
        target: exchanges.micCode,
        set: { yahooSuffix: exchange.yahooSuffix, name: exchange.name },
      });
  }

  console.log("Seeding quote sources...");
  for (const source of SEED_QUOTE_SOURCES) {
    await db
      .insert(quoteSources)
      .values(source)
      .onConflictDoUpdate({
        target: quoteSources.id,
        set: { symbol: source.symbol, provider: source.provider },
      });
  }

  const seedEmail = process.env.SEED_USER_EMAIL?.trim().toLowerCase();
  const seedPassword = process.env.SEED_USER_PASSWORD?.trim();

  if (seedEmail && seedPassword) {
    console.log(`Seeding user ${seedEmail}...`);
    const inserted = await db
      .insert(users)
      .values({
        email: seedEmail,
        passwordHash: hashPassword(seedPassword),
      })
      .onConflictDoNothing()
      .returning({ id: users.id });

    if (inserted.length > 0) {
      console.log("User created.");
    } else {
      console.log("User already exists, skipped.");
    }
  } else {
    console.log(
      "Skipping user seed (set SEED_USER_EMAIL and SEED_USER_PASSWORD to create the first account).",
    );
  }

  console.log("Reference data seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
