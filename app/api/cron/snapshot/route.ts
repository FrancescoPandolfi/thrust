import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { captureSnapshot } from "@/lib/snapshots";
import { logProductionError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await captureSnapshot();
    return NextResponse.json({ ok: true, snapshot: result });
  } catch (error) {
    console.error(error);
    await logProductionError("cron/snapshot", error, {});
    return NextResponse.json(
      { error: "Failed to capture snapshot" },
      { status: 500 },
    );
  }
}
