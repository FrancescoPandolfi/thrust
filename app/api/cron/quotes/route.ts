import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { logProductionError } from "@/lib/errors";
import {
  quotesRefreshFailed,
  refreshAllPositionQuotes,
} from "@/lib/refresh-quotes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshAllPositionQuotes();

    if (quotesRefreshFailed(result.quotes)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Market data provider rate-limited or unavailable",
          refreshed: result.refreshed,
          skipped: result.skipped,
        },
        { status: 429 },
      );
    }

    return NextResponse.json({
      ok: true,
      refreshed: result.refreshed,
      skipped: result.skipped,
    });
  } catch (error) {
    console.error(error);
    await logProductionError("cron/quotes", error, {});
    return NextResponse.json(
      { error: "Failed to refresh quotes" },
      { status: 500 },
    );
  }
}
