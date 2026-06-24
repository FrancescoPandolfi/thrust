import { AppShell } from "@/components/AppShell";
import { ReturnsPageClient } from "@/components/ReturnsPageClient";
import {
  getCloseSnapshotsForChart,
  getDailyReturns,
  getTodaySummary,
  getWeeklyReturns,
} from "@/lib/returns";
import { format, subDays } from "date-fns";

export const dynamic = "force-dynamic";

function rangeToFrom(range: string | undefined): string | undefined {
  const now = new Date();
  switch (range) {
    case "1M":
      return format(subDays(now, 30), "yyyy-MM-dd");
    case "3M":
      return format(subDays(now, 90), "yyyy-MM-dd");
    case "6M":
      return format(subDays(now, 180), "yyyy-MM-dd");
    case "1Y":
      return format(subDays(now, 365), "yyyy-MM-dd");
    case "All":
      return undefined;
    default:
      return format(subDays(now, 90), "yyyy-MM-dd");
  }
}

type Props = {
  searchParams: Promise<{ range?: string }>;
};

export default async function ReturnsPage({ searchParams }: Props) {
  const params = await searchParams;
  const from = rangeToFrom(params.range);

  const [today, daily, weekly, chart] = await Promise.all([
    getTodaySummary(),
    getDailyReturns(from),
    getWeeklyReturns(from),
    getCloseSnapshotsForChart(from),
  ]);

  return (
    <AppShell>
      <ReturnsPageClient
        today={today}
        daily={daily}
        weekly={weekly}
        chart={chart}
      />
    </AppShell>
  );
}
