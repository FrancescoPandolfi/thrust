import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { allQuotesStale, getQuotes, hasMissingQuotes } from "@/lib/prices";
import { positions } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const refresh = searchParams.get("refresh") === "1";
  const force = searchParams.get("force") === "1";

  try {
    const db = getDb();
    const rows = await db.select().from(positions);
    const symbols = rows.map((p) => p.yahooSymbol);
    const quotes = await getQuotes(symbols, { refresh, force });

    if (refresh && hasMissingQuotes(quotes) && allQuotesStale(quotes)) {
      return NextResponse.json(
        {
          error:
            "Yahoo Finance is rate-limiting requests. Wait 15 minutes, then try again.",
          rateLimited: true,
          quotes,
        },
        { status: 429 },
      );
    }

    return NextResponse.json({ quotes });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch quotes",
        rateLimited: true,
      },
      { status: 429 },
    );
  }
}
