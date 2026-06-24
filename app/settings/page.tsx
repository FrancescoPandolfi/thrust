import { AppShell } from "@/components/AppShell";
import { TickerDiagnostics } from "@/components/TickerDiagnostics";
import {
  formatInstrumentLabel,
  positionToInstrument,
  quoteKey,
} from "@/lib/instruments";
import { getDb } from "@/lib/db";
import { loadMarketContext } from "@/lib/market-data";
import { getQuoteProvider, getQuotes, type Quote } from "@/lib/prices";
import { positions } from "@/lib/schema";

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
  const db = getDb();
  const [posRows, ctx] = await Promise.all([
    db.select().from(positions).orderBy(positions.sortOrder),
    loadMarketContext(),
  ]);
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
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Settings</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Verify ISIN mappings and live market data before trusting portfolio
            values.
          </p>
        </div>
        <TickerDiagnostics positions={rows} />
      </div>
    </AppShell>
  );
}
