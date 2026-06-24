import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { productionErrorMessage } from "@/lib/env";
import { logProductionError } from "@/lib/errors";
import { getDb } from "@/lib/db";
import { allQuotesStale, getQuotes, hasMissingQuotes } from "@/lib/prices";
import { positionToInstrument } from "@/lib/instruments";
import { positions } from "@/lib/schema";

export const dynamic = "force-dynamic";

async function fetchQuotes(options: { refresh: boolean; force: boolean }) {
  const db = getDb();
  const rows = await db.select().from(positions);
  const instruments = rows.map(positionToInstrument);
  return getQuotes(instruments, options);
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const quotes = await fetchQuotes({ refresh: false, force: false });
    return NextResponse.json({ quotes });
  } catch (error) {
    console.error(error);
    await logProductionError("api/quotes", error);
    return NextResponse.json(
      {
        error: productionErrorMessage(error, "Failed to fetch quotes"),
        rateLimited: true,
      },
      { status: 429 },
    );
  }
}

export async function POST() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const quotes = await fetchQuotes({ refresh: true, force: false });

    if (hasMissingQuotes(quotes) && allQuotesStale(quotes)) {
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
    await logProductionError("api/quotes", error);
    return NextResponse.json(
      {
        error: productionErrorMessage(error, "Failed to refresh quotes"),
        rateLimited: true,
      },
      { status: 429 },
    );
  }
}
