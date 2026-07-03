CREATE TYPE "public"."category" AS ENUM('equity_etf', 'bond_etf', 'crypto');--> statement-breakpoint
CREATE TABLE "capital_flows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"amount_eur" numeric(18, 2) NOT NULL,
	"position_id" uuid,
	"title" text,
	"shares_delta" numeric(18, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"amount_eur" numeric(18, 2) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_snapshots" (
	"date" date PRIMARY KEY NOT NULL,
	"positions_value_eur" numeric(18, 2) NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchanges" (
	"mic_code" text PRIMARY KEY NOT NULL,
	"yahoo_suffix" text NOT NULL,
	"name" text
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"isin" text,
	"symbol" text,
	"mic_code" text,
	"yahoo_symbol" text,
	"coingecko_id" text,
	"title" text NOT NULL,
	"category" "category" NOT NULL,
	"shares" numeric(18, 6) NOT NULL,
	"load_value_eur" numeric(18, 2) NOT NULL,
	"sort_order" numeric(5, 0) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_cache" (
	"isin" text NOT NULL,
	"mic_code" text DEFAULT '' NOT NULL,
	"price" numeric(18, 8) NOT NULL,
	"currency" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_cache_isin_mic_code_pk" PRIMARY KEY("isin","mic_code")
);
--> statement-breakpoint
CREATE TABLE "quote_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"provider" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "capital_flows" ADD CONSTRAINT "capital_flows_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE set null ON UPDATE no action;