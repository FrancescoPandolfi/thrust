import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { logProductionError } from "@/lib/errors";
import {
  getDailyReturns,
  getWeeklyReturns,
  getSnapshotsForChart,
} from "@/lib/returns";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "day";
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  try {
    if (period === "week") {
      const weekly = await getWeeklyReturns(from, to);
      return NextResponse.json({ period: "week", data: weekly });
    }

    const daily = await getDailyReturns(from, to);
    const chart = await getSnapshotsForChart(from, to);
    return NextResponse.json({ period: "day", data: daily, chart });
  } catch (error) {
    console.error(error);
    await logProductionError("api/returns", error, { period, from, to });
    return NextResponse.json(
      { error: "Failed to fetch returns" },
      { status: 500 },
    );
  }
}
