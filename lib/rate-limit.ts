const MAX_LOGIN_ATTEMPTS = 15;
const LOCKOUT_MS = 15 * 60 * 1000;

type LoginAttemptEntry = {
  failures: number;
  lockedUntil: number;
};

const loginAttempts = new Map<string, LoginAttemptEntry>();

export function getLoginRateLimitStatus(ip: string): {
  limited: boolean;
  retryAfterSec: number;
} {
  const entry = loginAttempts.get(ip);
  const now = Date.now();

  if (!entry || entry.lockedUntil <= now) {
    return { limited: false, retryAfterSec: 0 };
  }

  return {
    limited: true,
    retryAfterSec: Math.ceil((entry.lockedUntil - now) / 1000),
  };
}

export function recordLoginFailure(ip: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || entry.lockedUntil <= now) {
    loginAttempts.set(ip, { failures: 1, lockedUntil: 0 });
    return;
  }

  const failures = entry.failures + 1;
  loginAttempts.set(ip, {
    failures,
    lockedUntil:
      failures >= MAX_LOGIN_ATTEMPTS ? now + LOCKOUT_MS : entry.lockedUntil,
  });
}

export function clearLoginAttempts(ip: string): void {
  loginAttempts.delete(ip);
}
