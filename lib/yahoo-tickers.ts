/**
 * Yahoo Finance tickers for ISIN + MIC pairs where `ISIN.{suffix}` lookup fails.
 */
const YAHOO_TICKERS: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  IE00B53SZB19: {
    XAMS: "CNDX.AS",
    XETR: "SXRV.DE",
    XMIL: "CSNDX.MI",
    XLON: "CNDX.L",
  },
  IE00B4L5Y983: {
    XAMS: "IWDA.AS",
    XETR: "EUNL.DE",
    XMIL: "SWDA.MI",
    XLON: "SWDA.L",
  },
};

export function lookupYahooTicker(
  isin: string,
  micCode: string,
): string | null {
  const byMic = YAHOO_TICKERS[isin.trim().toUpperCase()];
  if (!byMic) return null;
  return byMic[micCode.trim().toUpperCase()] ?? null;
}
