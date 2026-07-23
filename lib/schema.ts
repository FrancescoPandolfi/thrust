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

export const userRoleEnum = pgEnum("user_role", ["admin", "viewer"]);

export const portfolioRoleEnum = pgEnum("portfolio_role", [
  "owner",
  "admin",
  "viewer",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  role: userRoleEnum("role").notNull().default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const portfolios = pgTable("portfolios", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdByUserId: uuid("created_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const portfolioMembers = pgTable(
  "portfolio_members",
  {
    portfolioId: uuid("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: portfolioRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.portfolioId, table.userId] })],
);

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
  portfolioId: uuid("portfolio_id")
    .notNull()
    .references(() => portfolios.id, { onDelete: "cascade" }),
  isin: text("isin"),
  symbol: text("symbol"),
  micCode: text("mic_code"),
  yahooSymbol: text("yahoo_symbol"),
  coingeckoId: text("coingecko_id"),
  title: text("title").notNull(),
  category: categoryEnum("category").notNull(),
  shares: numeric("shares", { precision: 18, scale: 6 }).notNull(),
  loadValueEur: numeric("load_value_eur", { precision: 18, scale: 2 }).notNull(),
  sortOrder: numeric("sort_order", { precision: 5, scale: 0 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cashBalances = pgTable("cash_balances", {
  id: uuid("id").primaryKey().defaultRandom(),
  portfolioId: uuid("portfolio_id")
    .notNull()
    .references(() => portfolios.id, { onDelete: "cascade" }),
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

/** Capital added to or withdrawn from positions (positive = in, negative = out). */
export const capitalFlows = pgTable("capital_flows", {
  id: uuid("id").primaryKey().defaultRandom(),
  portfolioId: uuid("portfolio_id")
    .notNull()
    .references(() => portfolios.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  amountEur: numeric("amount_eur", { precision: 18, scale: 2 }).notNull(),
  positionId: uuid("position_id").references(() => positions.id, {
    onDelete: "set null",
  }),
  /** Snapshot of position title at the time of the flow. */
  title: text("title"),
  /** Shares bought (+) or sold (−) in this operation. */
  sharesDelta: numeric("shares_delta", { precision: 18, scale: 6 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** One row per calendar day per portfolio: positions value at midnight Europe/Rome. */
export const dailySnapshots = pgTable(
  "daily_snapshots",
  {
    portfolioId: uuid("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    positionsValueEur: numeric("positions_value_eur", {
      precision: 18,
      scale: 2,
    }).notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.portfolioId, table.date] })],
);

export type Position = typeof positions.$inferSelect;
export type Exchange = typeof exchanges.$inferSelect;
export type QuoteSource = typeof quoteSources.$inferSelect;
export type CashBalance = typeof cashBalances.$inferSelect;
export type CapitalFlow = typeof capitalFlows.$inferSelect;
export type DailySnapshot = typeof dailySnapshots.$inferSelect;
export type Category = (typeof categoryEnum.enumValues)[number];
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type PortfolioRole = (typeof portfolioRoleEnum.enumValues)[number];
export type User = typeof users.$inferSelect;
export type Portfolio = typeof portfolios.$inferSelect;
export type PortfolioMember = typeof portfolioMembers.$inferSelect;
