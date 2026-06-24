import { getDb } from "../lib/db";
import { exchanges, quoteSources } from "../lib/schema";

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

  console.log("Reference data seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
