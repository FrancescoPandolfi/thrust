import "dotenv/config";
import { getQuotes } from "../lib/prices";

const INSTRUMENTS = [
  { isin: "IE00B4L5Y983", yahooSymbol: "IWDA.AS" },
  { isin: "IE00B53SZB19", yahooSymbol: "CNDX.AS" },
  { isin: "IE00BKM4GZ66", yahooSymbol: "EIMI.L" },
  { isin: "IE00B5BMR087", yahooSymbol: "CSPX.AS" },
  { isin: "LU1650488494", yahooSymbol: "EGOV.PA" },
  { isin: "LU1650488494", yahooSymbol: "EM35.PA" },
  { isin: "LU1650488494", yahooSymbol: "EM35.MI" },
  { isin: "IE00BF59RX87", yahooSymbol: "JRBE.L" },
  { isin: "IE000RHYOR04", yahooSymbol: "IIPUF" },
  { isin: null, yahooSymbol: "BTC-EUR" },
  { isin: null, yahooSymbol: "ETH-EUR" },
  { isin: null, yahooSymbol: "SOL-EUR" },
] as const;

async function main() {
  const symbols = INSTRUMENTS.map((i) => i.yahooSymbol);
  const isinBySymbol = new Map<string, string | null>(
    INSTRUMENTS.map((i) => [i.yahooSymbol, i.isin]),
  );

  console.log("Fetching live quotes...\n");
  const quotes = await getQuotes(symbols, { refresh: true });

  for (const q of quotes) {
    const ok = q.price > 0 && q.priceEur > 0;
    const isin = isinBySymbol.get(q.symbol);
    const isinLabel = isin ?? "—";
    console.log(
      `${ok ? "✓" : "✗"} ${isinLabel.padEnd(14)} ${q.symbol.padEnd(10)} ${formatEur(q.priceEur).padStart(12)}  (${q.currency} ${q.price})`,
    );
  }

  const missing = quotes.filter((q) => q.price <= 0);
  if (missing.length > 0) {
    console.log(`\n${missing.length} missing: ${missing.map((q) => q.symbol).join(", ")}`);
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
