import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
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

  const { searchParams } = new URL(request.url);
  const isin = searchParams.get("isin")?.trim() || null;
  const symbol = searchParams.get("symbol")?.trim() || null;
  const micCode = searchParams.get("mic_code")?.trim() || null;
  const refresh = searchParams.get("refresh") === "1";

  if (!isin && !symbol) {
    return NextResponse.json({
      isin: null,
      symbol: null,
      micCode: null,
      ok: false,
      error: "Provide isin (+ mic_code) or symbol query param",
    });
  }

  const db = getDb();
  let matchedPosition = null;

  if (isin) {
    const rows = await db
      .select()
      .from(positions)
      .where(
        micCode
          ? and(eq(positions.isin, isin.toUpperCase()), eq(positions.micCode, micCode.toUpperCase()))
          : eq(positions.isin, isin.toUpperCase()),
      )
      .limit(1);
    matchedPosition = rows[0] ?? null;
  } else if (symbol) {
    const rows = await db
      .select()
      .from(positions)
      .where(eq(positions.symbol, symbol.toUpperCase()))
      .limit(1);
    matchedPosition = rows[0] ?? null;
  }

  const instrument = normalizeInstrument(
    instrumentFromQuery({ isin, symbol, micCode }, matchedPosition),
  );
  const result = await probeQuote(instrument, { refresh });

  return NextResponse.json({
    isin: instrument.isin,
    symbol: instrument.symbol,
    micCode: instrument.micCode,
    label: formatInstrumentLabel(instrument),
    provider: result.provider,
    ok: result.ok,
    error: result.ok ? undefined : result.error,
    quote: result.quote
      ? {
          isin: result.quote.isin,
          symbol: result.quote.symbol,
          micCode: result.quote.micCode,
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
