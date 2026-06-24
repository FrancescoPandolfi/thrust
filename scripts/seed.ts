import { getDb } from "../lib/db";
import { cashBalances, exchanges, positions, quoteSources } from "../lib/schema";

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

const SEED_POSITIONS = [
  {
    isin: "IE00B4L5Y983",
    micCode: "XAMS",
    yahooSymbol: "IWDA.AS",
    title: "MSCI World",
    category: "equity_etf" as const,
    shares: "816.243921",
    loadValueEur: "100368",
    sortOrder: "1",
  },
  {
    isin: "IE00B53SZB19",
    micCode: "XAMS",
    yahooSymbol: "CNDX.AS",
    title: "Nasdaq 100",
    category: "equity_etf" as const,
    shares: "42.061662",
    loadValueEur: "10037",
    sortOrder: "2",
  },
  {
    isin: "IE00BKM4GZ66",
    micCode: "XMIL",
    yahooSymbol: "EIMI.MI",
    title: "Emerging Markets",
    category: "equity_etf" as const,
    shares: "147.438376",
    loadValueEur: "10038",
    sortOrder: "3",
  },
  {
    isin: "IE00B5BMR087",
    micCode: "XAMS",
    yahooSymbol: "CSPX.AS",
    title: "S&P 500",
    category: "equity_etf" as const,
    shares: "33.875034",
    loadValueEur: "10037",
    sortOrder: "4",
  },
  {
    isin: "LU1650488494",
    micCode: "XPAR",
    yahooSymbol: "EGOV.PA",
    title: "Euro Gov Bonds",
    category: "bond_etf" as const,
    shares: "36.334523",
    loadValueEur: "3778",
    sortOrder: "5",
  },
  {
    isin: "LU1650488494",
    micCode: "XMIL",
    yahooSymbol: "EM35.MI",
    title: "Govt Bond 3-5yr",
    category: "bond_etf" as const,
    shares: "33.422906",
    loadValueEur: "3778",
    sortOrder: "6",
  },
  {
    isin: "IE00BF59RX87",
    micCode: "XETR",
    yahooSymbol: "JREB.DE",
    title: "EUR Corporate Bond",
    category: "bond_etf" as const,
    shares: "39.255615",
    loadValueEur: "3787",
    sortOrder: "7",
  },
  {
    isin: "IE000RHYOR04",
    micCode: "XSES",
    yahooSymbol: "IE000RHYOR04.SG",
    title: "Ultrashort Bond",
    category: "bond_etf" as const,
    shares: "69.001349",
    loadValueEur: "4004",
    sortOrder: "8",
  },
  {
    symbol: "BTC-EUR",
    coingeckoId: "bitcoin",
    title: "Bitcoin",
    category: "crypto" as const,
    shares: "0.158316",
    loadValueEur: "10000",
    sortOrder: "9",
  },
  {
    symbol: "SOL-EUR",
    coingeckoId: "solana",
    title: "Solana",
    category: "crypto" as const,
    shares: "32.672547",
    loadValueEur: "2571",
    sortOrder: "10",
  },
  {
    symbol: "ETH-EUR",
    coingeckoId: "ethereum",
    title: "Ethereum",
    category: "crypto" as const,
    shares: "0.924557",
    loadValueEur: "2571",
    sortOrder: "11",
  },
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
