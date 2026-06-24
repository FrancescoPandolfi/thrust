const MIN_SESSION_SECRET_LENGTH = 32;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export function getSessionSecret(): string {
  const secret = requireEnv("SESSION_SECRET");
  if (secret.length < MIN_SESSION_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters`,
    );
  }
  return secret;
}

export function validateEnv(): void {
  getSessionSecret();
  requireEnv("CRON_SECRET");
}

export function productionErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (process.env.NODE_ENV === "development" && error instanceof Error) {
    return error.message;
  }
  return fallback;
}
