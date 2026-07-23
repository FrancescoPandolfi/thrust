import { TickerDiagnostics } from "@/components/TickerDiagnostics";
import Link from "next/link";
import { getCurrentUserRole, getPortfolioContext } from "@/lib/auth";
import {
  formatInstrumentLabel,
  positionToInstrument,
  quoteKey,
} from "@/lib/instruments";
import { getDb } from "@/lib/db";
import { loadMarketContext } from "@/lib/market-data";
import { getQuoteProvider, getQuotes, type Quote } from "@/lib/prices";
import { positions } from "@/lib/schema";
import { and, eq, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

function toSnapshot(quote: Quote) {
  return {
    isin: quote.isin,
    symbol: quote.symbol,
    micCode: quote.micCode,
    label: formatInstrumentLabel(quote),
    price: quote.price,
    currency: quote.currency,
    priceEur: quote.priceEur,
    fetchedAt: quote.fetchedAt.toISOString(),
    stale: quote.stale ?? false,
  };
}

export default async function SettingsPage() {
  const [context, ctx, role] = await Promise.all([
    getPortfolioContext(),
    loadMarketContext(),
    getCurrentUserRole(),
  ]);

  const portfolioIds =
    context?.viewMode === "aggregate"
      ? context.aggregatePortfolioIds
      : context
        ? [context.id]
        : [];

  const posRows =
    portfolioIds.length > 0
      ? await getDb()
          .select()
          .from(positions)
          .where(inArray(positions.portfolioId, portfolioIds))
          .orderBy(positions.sortOrder)
      : [];

  const readOnly = context?.readOnly ?? role === "viewer";
  const canRefreshPrices = context?.canRefreshPrices ?? !readOnly;
  const instruments = posRows.map(positionToInstrument);
  const quotes = await getQuotes(instruments);
  const quoteByKey = new Map(quotes.map((q) => [quoteKey(q), q]));

  const rows = posRows.map((pos) => {
    const instrument = positionToInstrument(pos);
    const quote = quoteByKey.get(quoteKey(instrument));
    const ok = quote != null && quote.price > 0;
    return {
      id: pos.id,
      isin: pos.isin,
      symbol: pos.symbol,
      micCode: pos.micCode,
      label: formatInstrumentLabel(instrument),
      title: pos.title,
      provider: getQuoteProvider(instrument, ctx),
      ok,
      error: ok ? undefined : "No cached price",
      quote: quote && quote.price > 0 ? toSnapshot(quote) : null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Verify ISIN mappings and live market data before trusting portfolio
          values.
        </p>
        {context?.viewMode === "single" && (
          <p className="mt-2 text-sm">
            <Link
              href="/settings/portfolio"
              className="text-accent hover:underline"
            >
              Portfolio settings →
            </Link>
          </p>
        )}
      </div>
      <TickerDiagnostics
        positions={rows}
        readOnly={readOnly}
        canRefreshPrices={canRefreshPrices}
      />
    </div>
  );
}
