const GOOGLE_TO_YAHOO: Record<string, string> = {
  "AMS:IWDA": "IWDA.AS",
  "AMS:CNDX": "CNDX.AS",
  "LON:EIMI": "EIMI.L",
  "AMS:CSPX": "CSPX.AS",
  "EPA:EGOV": "EGOV.PA",
  "EPA:EM35": "EM35.PA",
  "LON:JRBE": "JRBE.L",
  "OTCMKTS:IIPUF": "IIPUF",
  "CURRENCY:BTCUSD": "BTC-USD",
  "CURRENCY:ETHUSD": "ETH-USD",
  "CURRENCY:SOLUSD": "SOL-USD",
  "CURRENCY:EURUSD": "EURUSD=X",
};

export function resolveYahooSymbol(googleTicker: string): string | null {
  const normalized = googleTicker.trim().toUpperCase();
  const direct = GOOGLE_TO_YAHOO[normalized];
  if (direct) return direct;

  const upperKey = Object.keys(GOOGLE_TO_YAHOO).find(
    (k) => k.toUpperCase() === normalized,
  );
  if (upperKey) return GOOGLE_TO_YAHOO[upperKey];

  if (normalized.startsWith("CURRENCY:") && normalized.endsWith("USD")) {
    const base = normalized.replace("CURRENCY:", "").replace("USD", "");
    return `${base}-USD`;
  }

  const exchangeMatch = normalized.match(/^([A-Z]+):(.+)$/);
  if (exchangeMatch) {
    const [, exchange, symbol] = exchangeMatch;
    const suffixMap: Record<string, string> = {
      AMS: ".AS",
      LON: ".L",
      EPA: ".PA",
      OTCMKTS: "",
    };
    const suffix = suffixMap[exchange];
    if (suffix !== undefined) return `${symbol}${suffix}`;
  }

  return null;
}

export { GOOGLE_TO_YAHOO };
