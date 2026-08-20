import { InstrumentDetailView } from "@/components/InstrumentDetailView";
import { loadInstrumentDetail } from "@/lib/instrument-detail";
import type { PriceHistoryRange } from "@/lib/price-history";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function rangeToFrom(range: string | undefined): PriceHistoryRange {
  switch (range) {
    case "3M":
      return "3M";
    case "6M":
      return "6M";
    case "1Y":
      return "1Y";
    case "All":
      return "All";
    default:
      return "1Y";
  }
}

type Props = {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{ range?: string }>;
};

export default async function InstrumentDetailPage({ params, searchParams }: Props) {
  const [{ symbol }, query] = await Promise.all([params, searchParams]);
  const range = rangeToFrom(query.range);
  const detail = await loadInstrumentDetail(symbol, range);

  if (!detail) {
    notFound();
  }

  return <InstrumentDetailView detail={detail} symbol={symbol} range={range} />;
}
