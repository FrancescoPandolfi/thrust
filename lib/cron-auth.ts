import { safeEqual } from "@/lib/secure-compare";

export function isAuthorizedCron(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || !authHeader) {
    return false;
  }
  return safeEqual(authHeader, `Bearer ${cronSecret}`);
}
