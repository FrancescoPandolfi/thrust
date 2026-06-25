import {
  date,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const categoryEnum = pgEnum("category", [
  "equity_etf",
  "bond_etf",
  "crypto",
]);

export const exchanges = pgTable("exchanges", {
  micCode: text("mic_code").primaryKey(),
  yahooSuffix: text("yahoo_suffix").notNull(),
  name: text("name"),
});

export const quoteSources = pgTable("quote_sources", {
  id: text("id").primaryKey(),
  symbol: text("symbol").notNull(),
  provider: text("provider").notNull(),
});

export const positions = pgTable("positions", {
  id: uuid("id").primaryKey().defaultRandom(),
  isin: text("isin"),
  symbol: text("symbol"),
  micCode: text("mic_code"),
  yahooSymbol: text("yahoo_symbol"),
  coingeckoId: text("coingecko_id"),
  title: text("title").notNull(),
  category: categoryEnum("category").notNull(),
  shares: numeric("shares", { precision: 18, scale: 8 }).notNull(),
  loadValueEur: numeric("load_value_eur", { precision: 18, scale: 2 }).notNull(),
  sortOrder: numeric("sort_order", { precision: 5, scale: 0 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cashBalances = pgTable("cash_balances", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull(),
  amountEur: numeric("amount_eur", { precision: 18, scale: 2 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const priceCache = pgTable(
  "price_cache",
  {
    isin: text("isin").notNull(),
    micCode: text("mic_code").notNull().default(""),
    price: numeric("price", { precision: 18, scale: 8 }).notNull(),
    currency: text("currency").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.isin, table.micCode] })],
);

/** One row per calendar day: positions value at midnight Europe/Rome. */
export const dailySnapshots = pgTable("daily_snapshots", {
  date: date("date").primaryKey(),
  positionsValueEur: numeric("positions_value_eur", {
    precision: 18,
    scale: 2,
  }).notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const productionErrors = pgTable("production_errors", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").notNull(),
  message: text("message").notNull(),
  stack: text("stack"),
  context: text("context"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Position = typeof positions.$inferSelect;
export type Exchange = typeof exchanges.$inferSelect;
export type QuoteSource = typeof quoteSources.$inferSelect;
export type CashBalance = typeof cashBalances.$inferSelect;
export type DailySnapshot = typeof dailySnapshots.$inferSelect;
export type Category = (typeof categoryEnum.enumValues)[number];
export type ProductionError = typeof productionErrors.$inferSelect;
export type User = typeof users.$inferSelect;
