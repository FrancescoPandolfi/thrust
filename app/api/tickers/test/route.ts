import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getPortfolioContext, isAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  formatInstrumentLabel,
  instrumentFromQuery,
  normalizeInstrument,
} from "@/lib/instruments";
import { probeQuote } from "@/lib/prices";
import { positions } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getPortfolioContext();
  const portfolioIds =
    context?.viewMode === "aggregate"
      ? context.aggregatePortfolioIds
      : context
        ? [context.id]
        : [];

  const { searchParams } = new URL(request.url);
  const isin = searchParams.get("isin")?.trim() || null;
  const symbol = searchParams.get("symbol")?.trim() || null;
  const refresh = searchParams.get("refresh") === "1";

  if (refresh && (!context || !context.canRefreshPrices)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isin && !symbol) {
    return NextResponse.json({
      isin: null,
      symbol: null,
      ok: false,
      error: "Provide isin (+ symbol for ETFs) or symbol query param",
    });
  }

  const db = getDb();
  let matchedPosition = null;

  if (portfolioIds.length > 0) {
    if (isin) {
      const rows = await db
        .select()
        .from(positions)
        .where(
          and(
            inArray(positions.portfolioId, portfolioIds),
            symbol
              ? and(
                  eq(positions.isin, isin.toUpperCase()),
                  eq(positions.symbol, symbol.toUpperCase()),
                )
              : eq(positions.isin, isin.toUpperCase()),
          ),
        )
        .limit(1);
      matchedPosition = rows[0] ?? null;
    } else if (symbol) {
      const rows = await db
        .select()
        .from(positions)
        .where(
          and(
            inArray(positions.portfolioId, portfolioIds),
            eq(positions.symbol, symbol.toUpperCase()),
          ),
        )
        .limit(1);
      matchedPosition = rows[0] ?? null;
    }
  }

  const instrument = normalizeInstrument(
    instrumentFromQuery({ isin, symbol }, matchedPosition),
  );
  const result = await probeQuote(instrument, { refresh });

  return NextResponse.json({
    isin: instrument.isin,
    symbol: instrument.symbol,
    label: formatInstrumentLabel(instrument),
    provider: result.provider,
    ok: result.ok,
    error: result.ok ? undefined : result.error,
    quote: result.quote
      ? {
          isin: result.quote.isin,
          symbol: result.quote.symbol,
          label: formatInstrumentLabel(result.quote),
          price: result.quote.price,
          currency: result.quote.currency,
          priceEur: result.quote.priceEur,
          fetchedAt: result.quote.fetchedAt.toISOString(),
          stale: result.quote.stale ?? false,
        }
      : null,
  });
}
