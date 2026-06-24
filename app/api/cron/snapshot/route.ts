import { NextResponse } from "next/server";
import { captureSnapshot } from "@/lib/snapshots";
import { logProductionError } from "@/lib/errors";
import type { SnapshotType } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as SnapshotType | null;

  if (type !== "open" && type !== "close") {
    return NextResponse.json(
      { error: "Invalid type. Use open or close." },
      { status: 400 },
    );
  }

  try {
    const result = await captureSnapshot(type);
    return NextResponse.json({ ok: true, snapshot: result });
  } catch (error) {
    console.error(error);
    await logProductionError("cron/snapshot", error, { type });
    return NextResponse.json(
      { error: "Failed to capture snapshot" },
      { status: 500 },
    );
  }
}
