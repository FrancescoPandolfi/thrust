import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { probeQuote } from "@/lib/prices";
import { resolveYahooSymbol } from "@/lib/ticker-map";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const googleTicker = searchParams.get("googleTicker")?.trim();
  const symbolParam = searchParams.get("symbol")?.trim();
  const refresh = searchParams.get("refresh") === "1";

  let yahooSymbol = symbolParam ?? null;
  let resolved = true;

  if (googleTicker) {
    yahooSymbol = resolveYahooSymbol(googleTicker);
    resolved = yahooSymbol !== null;
  }

  if (!yahooSymbol) {
    return NextResponse.json({
      googleTicker: googleTicker ?? undefined,
      yahooSymbol: null,
      resolved: false,
      ok: false,
      error: googleTicker
        ? `Cannot resolve Yahoo symbol for "${googleTicker}"`
        : "Provide googleTicker or symbol query param",
    });
  }

  const result = await probeQuote(yahooSymbol, { refresh });

  return NextResponse.json({
    googleTicker: googleTicker ?? undefined,
    yahooSymbol,
    resolved,
    provider: result.provider,
    ok: result.ok,
    error: result.ok ? undefined : result.error,
    quote: result.quote
      ? {
          symbol: result.quote.symbol,
          price: result.quote.price,
          currency: result.quote.currency,
          priceEur: result.quote.priceEur,
          fetchedAt: result.quote.fetchedAt.toISOString(),
          stale: result.quote.stale ?? false,
        }
      : null,
  });
}
