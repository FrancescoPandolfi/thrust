import { ReturnsPageClient } from "@/components/ReturnsPageClient";
import {
  getSnapshotsForChart,
  getDailyReturns,
  getTodaySummary,
  getWeeklyReturns,
} from "@/lib/returns";
import { formatIsoDate, subDays } from "@/lib/dates";

export const dynamic = "force-dynamic";

function rangeToFrom(range: string | undefined): string | undefined {
  const now = new Date();
  switch (range) {
    case "1M":
      return formatIsoDate(subDays(now, 30));
    case "3M":
      return formatIsoDate(subDays(now, 90));
    case "6M":
      return formatIsoDate(subDays(now, 180));
    case "1Y":
      return formatIsoDate(subDays(now, 365));
    case "All":
      return undefined;
    default:
      return formatIsoDate(subDays(now, 90));
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
    getSnapshotsForChart(from),
  ]);

  return (
    <ReturnsPageClient
        today={today}
        daily={daily}
        weekly={weekly}
      chart={chart}
    />
  );
}
