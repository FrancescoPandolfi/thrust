import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { allQuotesStale, getQuotes, hasMissingQuotes } from "@/lib/prices";
import { positionToInstrument } from "@/lib/instruments";
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
    const instruments = rows.map(positionToInstrument);
    const quotes = await getQuotes(instruments, { refresh, force });

    if (refresh && hasMissingQuotes(quotes) && allQuotesStale(quotes)) {
      return NextResponse.json(
        {
          error:
            "Market data provider rate-limited requests. Wait a few minutes, then try again.",
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
