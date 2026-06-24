import { AppShell } from "@/components/AppShell";
import { TickerDiagnostics } from "@/components/TickerDiagnostics";
import { getDb } from "@/lib/db";
import { getQuoteProvider, getQuotes, type Quote } from "@/lib/prices";
import { positions } from "@/lib/schema";
import { GOOGLE_TO_YAHOO } from "@/lib/ticker-map";

export const dynamic = "force-dynamic";

function toSnapshot(quote: Quote) {
  return {
    symbol: quote.symbol,
    price: quote.price,
    currency: quote.currency,
    priceEur: quote.priceEur,
    fetchedAt: quote.fetchedAt.toISOString(),
    stale: quote.stale ?? false,
  };
}

export default async function SettingsPage() {
  const db = getDb();
  const posRows = await db.select().from(positions).orderBy(positions.sortOrder);
  const symbols = posRows.map((p) => p.yahooSymbol);
  const quotes = await getQuotes(symbols);
  const quoteBySymbol = new Map(quotes.map((q) => [q.symbol, q]));

  const rows = posRows.map((pos) => {
    const quote = quoteBySymbol.get(pos.yahooSymbol);
    const ok = quote != null && quote.price > 0;
    return {
      id: pos.id,
      googleTicker: pos.googleTicker,
      yahooSymbol: pos.yahooSymbol,
      title: pos.title,
      provider: getQuoteProvider(pos.yahooSymbol),
      ok,
      error: ok ? undefined : "No cached price",
      quote: quote && quote.price > 0 ? toSnapshot(quote) : null,
    };
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Settings</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Verify ticker mappings and live market data before trusting portfolio
            values.
          </p>
        </div>
        <TickerDiagnostics positions={rows} tickerMap={GOOGLE_TO_YAHOO} />
      </div>
    </AppShell>
  );
}
