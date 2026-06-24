import { count, desc, gte } from "drizzle-orm";
import { getDb } from "./db";
import { productionErrors } from "./schema";

function shouldLogToDb(): boolean {
  return process.env.NODE_ENV !== "development";
}

function serializeError(error: unknown): { message: string; stack: string | null } {
  if (error instanceof Error) {
    return {
      message: error.message.slice(0, 2000),
      stack: error.stack?.slice(0, 8000) ?? null,
    };
  }
  return { message: String(error).slice(0, 2000), stack: null };
}

export async function logProductionError(
  source: string,
  error: unknown,
  context?: Record<string, unknown>,
): Promise<void> {
  if (!shouldLogToDb()) return;

  const { message, stack } = serializeError(error);
  let contextJson: string | null = null;
  if (context) {
    try {
      contextJson = JSON.stringify(context).slice(0, 4000);
    } catch {
      contextJson = null;
    }
  }

  try {
    const db = getDb();
    await db.insert(productionErrors).values({
      source: source.slice(0, 200),
      message,
      stack,
      context: contextJson,
    });
  } catch (logError) {
    console.error("Failed to persist production error:", logError);
  }
}

export type ProductionErrorRow = typeof productionErrors.$inferSelect;

export async function getProductionErrors(limit = 200): Promise<ProductionErrorRow[]> {
  const db = getDb();
  return db
    .select()
    .from(productionErrors)
    .orderBy(desc(productionErrors.createdAt))
    .limit(limit);
}

export async function getProductionErrorStats() {
  const db = getDb();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [[{ total }], [{ last24h }], [{ last7d }], latestRows] = await Promise.all([
    db.select({ total: count() }).from(productionErrors),
    db
      .select({ last24h: count() })
      .from(productionErrors)
      .where(gte(productionErrors.createdAt, dayAgo)),
    db
      .select({ last7d: count() })
      .from(productionErrors)
      .where(gte(productionErrors.createdAt, weekAgo)),
    db
      .select({ createdAt: productionErrors.createdAt })
      .from(productionErrors)
      .orderBy(desc(productionErrors.createdAt))
      .limit(1),
  ]);

  return {
    total,
    last24h,
    last7d,
    latestAt: latestRows[0]?.createdAt ?? null,
  };
}

export async function clearProductionErrors(): Promise<number> {
  const db = getDb();
  const deleted = await db
    .delete(productionErrors)
    .returning({ id: productionErrors.id });
  return deleted.length;
}
