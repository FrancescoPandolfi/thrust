import { eq } from "drizzle-orm";
import { getDb } from "../lib/db";
import { positions, priceCache } from "../lib/schema";

const SYMBOL_FIXES: Record<string, string> = {
  "EM35.PA": "EM35.MI",
  "BTC-USD": "BTC-EUR",
  "ETH-USD": "ETH-EUR",
  "SOL-USD": "SOL-EUR",
};

const GOOGLE_TICKER_FIXES: Record<string, string> = {
  "CURRENCY:BTCUSD": "CURRENCY:BTCEUR",
  "CURRENCY:ETHUSD": "CURRENCY:ETHEUR",
  "CURRENCY:SOLUSD": "CURRENCY:SOLEUR",
};

const ISIN_FIXES: Record<string, string> = {
  "AMS:IWDA": "IE00B4L5Y983",
  "AMS:CNDX": "IE00B53SZB19",
  "LON:EIMI": "IE00BKM4GZ66",
  "AMS:CSPX": "IE00B5BMR087",
  "EPA:EGOV": "LU1650488494",
  "EPA:EM35": "LU1650488494",
  "LON:JRBE": "IE00BF59RX87",
  "OTCMKTS:IIPUF": "IE000RHYOR04",
};

async function main() {
  const db = getDb();

  console.log("Current positions:");
  const rows = await db.select().from(positions).orderBy(positions.sortOrder);
  for (const row of rows) {
    console.log(
      `  ${row.googleTicker.padEnd(18)} ${row.yahooSymbol.padEnd(10)} ${row.title}`,
    );
  }

  let updated = 0;
  for (const [oldSymbol, newSymbol] of Object.entries(SYMBOL_FIXES)) {
    const result = await db
      .update(positions)
      .set({ yahooSymbol: newSymbol, updatedAt: new Date() })
      .where(eq(positions.yahooSymbol, oldSymbol))
      .returning({ id: positions.id, title: positions.title });

    for (const row of result) {
      console.log(`Updated position "${row.title}": ${oldSymbol} → ${newSymbol}`);
      updated += 1;
    }

    const cached = await db
      .select()
      .from(priceCache)
      .where(eq(priceCache.yahooSymbol, oldSymbol));
    if (cached[0]) {
      await db
        .insert(priceCache)
        .values({
          yahooSymbol: newSymbol,
          price: cached[0].price,
          currency: cached[0].currency,
          fetchedAt: cached[0].fetchedAt,
        })
        .onConflictDoUpdate({
          target: priceCache.yahooSymbol,
          set: {
            price: cached[0].price,
            currency: cached[0].currency,
            fetchedAt: cached[0].fetchedAt,
          },
        });
    }

    await db.delete(priceCache).where(eq(priceCache.yahooSymbol, oldSymbol));
    if (result.length > 0) {
      console.log(`Migrated price_cache ${oldSymbol} → ${newSymbol}`);
    }
  }

  for (const [oldTicker, newTicker] of Object.entries(GOOGLE_TICKER_FIXES)) {
    const result = await db
      .update(positions)
      .set({ googleTicker: newTicker, updatedAt: new Date() })
      .where(eq(positions.googleTicker, oldTicker))
      .returning({ id: positions.id, title: positions.title });

    for (const row of result) {
      console.log(`Updated google ticker "${row.title}": ${oldTicker} → ${newTicker}`);
      updated += 1;
    }
  }

  for (const [googleTicker, isin] of Object.entries(ISIN_FIXES)) {
    const result = await db
      .update(positions)
      .set({ isin, updatedAt: new Date() })
      .where(eq(positions.googleTicker, googleTicker))
      .returning({ id: positions.id, title: positions.title, isin: positions.isin });

    for (const row of result) {
      console.log(`Updated ISIN "${row.title}": ${isin}`);
      updated += 1;
    }
  }

  if (updated === 0) {
    console.log("\nNo symbol fixes needed.");
  } else {
    console.log(`\n${updated} position(s) updated.`);
  }

  console.log("\nPrice cache:");
  const cache = await db.select().from(priceCache);
  if (cache.length === 0) {
    console.log("  (empty — refresh prices from the app)");
  } else {
    for (const row of cache) {
      console.log(`  ${row.yahooSymbol.padEnd(10)} ${row.price} ${row.currency}`);
    }
  }
}

main().catch((error) => {
  console.error("Database update failed:", error);
  process.exit(1);
});
