import type { Instrumentation } from "next";
import { logProductionError } from "@/lib/errors";

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context,
) => {
  const digest =
    err instanceof Error && "digest" in err
      ? String((err as Error & { digest?: string }).digest ?? "")
      : undefined;

  await logProductionError("next/server", err, {
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    digest,
  });
};
