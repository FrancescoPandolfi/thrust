import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { refreshPortfolioQuotes } from "@/lib/prices";
import { positionToInstrument } from "@/lib/instruments";
import { positions } from "@/lib/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "1";

  try {
    const db = getDb();
    const rows = await db.select().from(positions);
    const instruments = rows.map(positionToInstrument);

    const result = await refreshPortfolioQuotes(instruments, {
      force,
      bypassCooldown: true,
    });

    return NextResponse.json({
      ok: true,
      updated: result.updated,
      skipped: result.skipped,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Price refresh failed",
      },
      { status: 500 },
    );
  }
}
