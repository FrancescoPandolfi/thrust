import "dotenv/config";
import { getQuotes } from "../lib/prices";
import {
  formatInstrumentLabel,
  positionToInstrument,
  quoteKey,
} from "../lib/instruments";
import { positions } from "../lib/schema";
import { getDb } from "../lib/db";

async function main() {
  const db = getDb();
  const rows = await db.select().from(positions).orderBy(positions.sortOrder);
  const instruments = rows.map(positionToInstrument);

  console.log("Fetching live quotes...\n");
  const quotes = await getQuotes(instruments, { refresh: true, bypassCooldown: true });

  for (const q of quotes) {
    const ok = q.price > 0 && q.priceEur > 0;
    const row = rows.find((p) => quoteKey(positionToInstrument(p)) === quoteKey(q));
    const title = row?.title ?? "—";
    console.log(
      `${ok ? "✓" : "✗"} ${title.padEnd(22)} ${formatInstrumentLabel(q).padEnd(22)} ${formatEur(q.priceEur).padStart(12)}  (${q.currency} ${q.price})`,
    );
  }

  const missing = quotes.filter((q) => q.price <= 0);
  if (missing.length > 0) {
    console.log(
      `\n${missing.length} missing: ${missing.map((q) => formatInstrumentLabel(q)).join(", ")}`,
    );
    process.exit(1);
  }
  console.log("\nAll quotes OK.");
}

function formatEur(n: number): string {
  return new Intl.NumberFormat("en-EU", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
