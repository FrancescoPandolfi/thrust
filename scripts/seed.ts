import { getDb } from "../lib/db";
import { cashBalances, positions } from "../lib/schema";

const SEED_POSITIONS = [
  {
    isin: "IE00B4L5Y983",
    googleTicker: "AMS:IWDA",
    yahooSymbol: "IWDA.AS",
    title: "MSCI World",
    category: "equity_etf" as const,
    shares: "816.243921",
    loadValueEur: "100368",
    sortOrder: "1",
  },
  {
    isin: "IE00B53SZB19",
    googleTicker: "AMS:CNDX",
    yahooSymbol: "CNDX.AS",
    title: "Nasdaq 100",
    category: "equity_etf" as const,
    shares: "42.061662",
    loadValueEur: "10037",
    sortOrder: "2",
  },
  {
    isin: "IE00BKM4GZ66",
    googleTicker: "LON:EIMI",
    yahooSymbol: "EIMI.L",
    title: "Emerging Markets",
    category: "equity_etf" as const,
    shares: "147.438376",
    loadValueEur: "10038",
    sortOrder: "3",
  },
  {
    isin: "IE00B5BMR087",
    googleTicker: "AMS:CSPX",
    yahooSymbol: "CSPX.AS",
    title: "S&P 500",
    category: "equity_etf" as const,
    shares: "33.875034",
    loadValueEur: "10037",
    sortOrder: "4",
  },
  {
    isin: "LU1650488494",
    googleTicker: "EPA:EGOV",
    yahooSymbol: "EGOV.PA",
    title: "Euro Gov Bonds",
    category: "bond_etf" as const,
    shares: "36.334523",
    loadValueEur: "3778",
    sortOrder: "5",
  },
  {
    isin: "LU1650488494",
    googleTicker: "EPA:EM35",
    yahooSymbol: "EM35.MI",
    title: "Govt Bond 3-5yr",
    category: "bond_etf" as const,
    shares: "33.422906",
    loadValueEur: "3778",
    sortOrder: "6",
  },
  {
    isin: "IE00BF59RX87",
    googleTicker: "LON:JRBE",
    yahooSymbol: "JRBE.L",
    title: "EUR Corporate Bond",
    category: "bond_etf" as const,
    shares: "39.255615",
    loadValueEur: "3787",
    sortOrder: "7",
  },
  {
    isin: "IE000RHYOR04",
    googleTicker: "OTCMKTS:IIPUF",
    yahooSymbol: "IIPUF",
    title: "Ultrashort Bond",
    category: "bond_etf" as const,
    shares: "69.001349",
    loadValueEur: "4004",
    sortOrder: "8",
  },
  {
    googleTicker: "CURRENCY:BTCEUR",
    yahooSymbol: "BTC-EUR",
    title: "Bitcoin",
    category: "crypto" as const,
    shares: "0.158316",
    loadValueEur: "10000",
    sortOrder: "9",
  },
  {
    googleTicker: "CURRENCY:SOLEUR",
    yahooSymbol: "SOL-EUR",
    title: "Solana",
    category: "crypto" as const,
    shares: "32.672547",
    loadValueEur: "2571",
    sortOrder: "10",
  },
  {
    googleTicker: "CURRENCY:ETHEUR",
    yahooSymbol: "ETH-EUR",
    title: "Ethereum",
    category: "crypto" as const,
    shares: "0.924557",
    loadValueEur: "2571",
    sortOrder: "11",
  },
];

async function main() {
  const db = getDb();

  console.log("Seeding positions...");
  for (const pos of SEED_POSITIONS) {
    await db.insert(positions).values(pos).onConflictDoNothing();
  }

  console.log("Seeding cash balance...");
  await db
    .insert(cashBalances)
    .values({ label: "Broker cash", amountEur: "0" })
    .onConflictDoNothing();

  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
