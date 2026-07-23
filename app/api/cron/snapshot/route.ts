import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { captureAllSnapshots } from "@/lib/snapshots";
import { logProductionError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshots = await captureAllSnapshots();
    return NextResponse.json({ ok: true, snapshots });
  } catch (error) {
    console.error(error);
    await logProductionError("cron/snapshot", error, {});
    return NextResponse.json(
      { error: "Failed to capture snapshot" },
      { status: 500 },
    );
  }
}
