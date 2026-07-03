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
  const { message, stack } = serializeError(error);
  console.error(`[${source}] ${message}`, { stack, context });
}
