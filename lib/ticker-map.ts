const GOOGLE_TO_YAHOO: Record<string, string> = {
  "AMS:IWDA": "IWDA.AS",
  "AMS:CNDX": "CNDX.AS",
  "LON:EIMI": "EIMI.L",
  "AMS:CSPX": "CSPX.AS",
  "EPA:EGOV": "EGOV.PA",
  "EPA:EM35": "EM35.MI",
  "LON:JRBE": "JRBE.L",
  "OTCMKTS:IIPUF": "IIPUF",
  "CURRENCY:BTCUSD": "BTC-EUR",
  "CURRENCY:BTCEUR": "BTC-EUR",
  "CURRENCY:ETHUSD": "ETH-EUR",
  "CURRENCY:ETHEUR": "ETH-EUR",
  "CURRENCY:SOLUSD": "SOL-EUR",
  "CURRENCY:SOLEUR": "SOL-EUR",
  "CURRENCY:EURUSD": "EURUSD=X",
};

/** Twelve Data MIC codes for ETF listings (Yahoo-style symbol → ticker + MIC). */
export const YAHOO_TO_TWELVEDATA: Record<
  string,
  { ticker: string; mic_code?: string }
> = {
  "IWDA.AS": { ticker: "IWDA", mic_code: "XAMS" },
  "CNDX.AS": { ticker: "CNDX", mic_code: "XAMS" },
  "CSPX.AS": { ticker: "CSPX", mic_code: "XAMS" },
  "EIMI.L": { ticker: "EIMI", mic_code: "XLON" },
  "EGOV.PA": { ticker: "EGOV", mic_code: "XPAR" },
  "EM35.MI": { ticker: "EM35", mic_code: "XMIL" },
  "EM35.PA": { ticker: "EM35", mic_code: "XMIL" },
  "JRBE.L": { ticker: "JRBE", mic_code: "XLON" },
  IIPUF: { ticker: "IIPUF" },
};

const YAHOO_SUFFIX_TO_MIC: Record<string, string> = {
  AS: "XAMS",
  L: "XLON",
  PA: "XPAR",
  MI: "XMIL",
};

export function resolveTwelveDataInstrument(yahooSymbol: string): {
  ticker: string;
  mic_code?: string;
} {
  const normalized = yahooSymbol.trim().toUpperCase();
  const mapped = YAHOO_TO_TWELVEDATA[normalized];
  if (mapped) return mapped;

  const dot = normalized.lastIndexOf(".");
  if (dot > 0) {
    const ticker = normalized.slice(0, dot);
    const suffix = normalized.slice(dot + 1);
    const mic_code = YAHOO_SUFFIX_TO_MIC[suffix];
    if (mic_code) return { ticker, mic_code };
  }

  return { ticker: normalized };
}

export function resolveYahooSymbol(googleTicker: string): string | null {
  const normalized = googleTicker.trim().toUpperCase();
  const direct = GOOGLE_TO_YAHOO[normalized];
  if (direct) return direct;

  const upperKey = Object.keys(GOOGLE_TO_YAHOO).find(
    (k) => k.toUpperCase() === normalized,
  );
  if (upperKey) return GOOGLE_TO_YAHOO[upperKey];

  if (normalized.startsWith("CURRENCY:") && normalized.endsWith("EUR")) {
    const base = normalized.replace("CURRENCY:", "").replace("EUR", "");
    return `${base}-EUR`;
  }

  if (normalized.startsWith("CURRENCY:") && normalized.endsWith("USD")) {
    const base = normalized.replace("CURRENCY:", "").replace("USD", "");
    if (base === "EUR") return "EURUSD=X";
    return `${base}-EUR`;
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
