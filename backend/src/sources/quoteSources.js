const YahooFinance = require("yahoo-finance2").default;

const {
  REQUEST_TIMEOUT_MS,
  SOURCE_FINNHUB,
  SOURCE_NASDAQ,
  SOURCE_STOOQ,
  SOURCE_YAHOO,
  US_EQUITY_PATTERN,
} = require("../common/constants");
const { insufficientData, isFiniteNumber } = require("../common/format");
const {
  getNewYorkMarketSession,
  normalizeTimestamp,
  zonedTimeToUtc,
} = require("./time");

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

function parseMoney(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/[$,%\s,]/g, "");
  if (!normalized || normalized.toUpperCase() === "N/A") {
    return null;
  }

  const price = Number(normalized);
  return Number.isFinite(price) ? price : null;
}

function normalizeNasdaqTimestamp(rawTimestamp) {
  if (typeof rawTimestamp !== "string") {
    return null;
  }

  const match = rawTimestamp
    .trim()
    .match(
      /^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s+(AM|PM)\s+ET$/i,
    );

  if (!match) {
    return null;
  }

  const monthMap = {
    JANUARY: 1,
    JAN: 1,
    FEBRUARY: 2,
    FEB: 2,
    MARCH: 3,
    MAR: 3,
    APRIL: 4,
    APR: 4,
    MAY: 5,
    JUNE: 6,
    JUN: 6,
    JULY: 7,
    JUL: 7,
    AUGUST: 8,
    AUG: 8,
    SEPTEMBER: 9,
    SEP: 9,
    SEPT: 9,
    OCTOBER: 10,
    OCT: 10,
    NOVEMBER: 11,
    NOV: 11,
    DECEMBER: 12,
    DEC: 12,
  };

  const month = monthMap[match[1].toUpperCase()];
  const day = Number(match[2]);
  const year = Number(match[3]);
  let hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] || 0);
  const meridiem = match[7].toUpperCase();

  if (!month || !day || !year || !Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  if (meridiem === "PM" && hour !== 12) {
    hour += 12;
  }

  if (meridiem === "AM" && hour === 12) {
    hour = 0;
  }

  return zonedTimeToUtc("America/New_York", year, month, day, hour, minute, second);
}

function normalizeStooqTimestamp(rawDate, rawTime) {
  if (typeof rawDate !== "string" || typeof rawTime !== "string") {
    return null;
  }

  const dateMatch = rawDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = rawTime.trim().match(/^(\d{2}):(\d{2}):(\d{2})$/);

  if (!dateMatch || !timeMatch) {
    return null;
  }

  return zonedTimeToUtc(
    "Europe/Warsaw",
    Number(dateMatch[1]),
    Number(dateMatch[2]),
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    Number(timeMatch[3]),
  );
}

function parseSimpleCsv(csvText) {
  if (typeof csvText !== "string") {
    return null;
  }

  const lines = csvText
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return null;
  }

  const headers = lines[0].split(",").map((header) => header.trim());
  const values = lines[1].split(",").map((value) => value.trim());

  return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
}

function buildCandidate(quote, priceField, timeField) {
  const price = quote[priceField];
  const timestamp = normalizeTimestamp(quote[timeField]);

  if (!isFiniteNumber(price) || !timestamp) {
    return null;
  }

  return { price, timestamp };
}

function selectQuoteCandidate(quote, marketSession) {
  const regular = () => buildCandidate(quote, "regularMarketPrice", "regularMarketTime");
  const preMarket = () => buildCandidate(quote, "preMarketPrice", "preMarketTime");
  const afterHours = () => buildCandidate(quote, "postMarketPrice", "postMarketTime");

  if (marketSession === "Pre-market") {
    return preMarket() || regular();
  }

  if (marketSession === "Regular") {
    return regular();
  }

  if (marketSession === "After-hours") {
    return afterHours() || regular();
  }

  return regular();
}

function buildYahooQuoteSource(quote, asOf = new Date()) {
  if (!quote || typeof quote !== "object") {
    return insufficientData("Yahoo Finance returned no quote data");
  }

  const marketSession = getNewYorkMarketSession(asOf);
  const selectedQuote = selectQuoteCandidate(quote, marketSession);

  if (!selectedQuote) {
    return insufficientData("Missing valid Yahoo price or timestamp");
  }

  return {
    source: SOURCE_YAHOO,
    tier: "Tier 2",
    last_price: selectedQuote.price,
    quote_timestamp: selectedQuote.timestamp,
    market_session: marketSession,
    quote_delay_status: "Yahoo session field",
  };
}

function buildNasdaqQuoteSource(ticker, payload) {
  if (!US_EQUITY_PATTERN.test(ticker)) {
    return insufficientData("Nasdaq cross-check supports US equity symbols only");
  }

  const quoteData = payload && payload.data;
  const primaryData = quoteData && quoteData.primaryData;

  if (!primaryData || typeof primaryData !== "object") {
    return insufficientData("Nasdaq returned no quote data");
  }

  const price = parseMoney(primaryData.lastSalePrice);
  const timestamp = normalizeNasdaqTimestamp(primaryData.lastTradeTimestamp);

  if (!isFiniteNumber(price) || !timestamp) {
    return insufficientData("Missing valid Nasdaq price or timestamp");
  }

  return {
    source: SOURCE_NASDAQ,
    tier: "Tier 2",
    last_price: price,
    quote_timestamp: timestamp,
    quote_timestamp_raw: primaryData.lastTradeTimestamp,
    market_session: quoteData.marketStatus || "Unknown",
    quote_delay_status: primaryData.isRealTime ? "Real-time" : "Delayed or unspecified",
  };
}

function buildStooqQuoteSource(ticker, csvText) {
  if (!US_EQUITY_PATTERN.test(ticker)) {
    return insufficientData("Stooq fallback supports US equity symbols only");
  }

  const row = parseSimpleCsv(csvText);
  if (!row) {
    return insufficientData("Stooq returned no quote data");
  }

  const price = parseMoney(row.Close);
  const timestamp = normalizeStooqTimestamp(row.Date, row.Time);

  if (!isFiniteNumber(price) || !timestamp) {
    return insufficientData("Missing valid Stooq price or timestamp");
  }

  return {
    source: SOURCE_STOOQ,
    tier: "Tier 2",
    last_price: price,
    quote_timestamp: timestamp,
    quote_timestamp_raw: `${row.Date} ${row.Time}`,
    market_session: getNewYorkMarketSession(new Date(timestamp)),
    quote_delay_status: "Delayed or end-of-session; Stooq CSV timestamp",
  };
}

function buildFinnhubQuoteSource(ticker, data) {
  if (!US_EQUITY_PATTERN.test(ticker)) {
    return insufficientData("Finnhub supports US equity symbols only");
  }

  if (!data || typeof data !== "object") {
    return insufficientData("Finnhub returned no quote data");
  }

  const price = data.c;
  const timestamp = data.t ? new Date(data.t * 1000).toISOString() : null;

  if (!isFiniteNumber(price) || price === 0 || !timestamp) {
    return insufficientData("Missing valid Finnhub price or timestamp");
  }

  return {
    source: SOURCE_FINNHUB,
    tier: "Tier 2",
    last_price: price,
    quote_timestamp: timestamp,
    quote_timestamp_raw: data.t,
    market_session: getNewYorkMarketSession(new Date(timestamp)),
    quote_delay_status: "Real-time for US",
  };
}

async function fetchNasdaqQuotePayload(ticker) {
  const url = `https://api.nasdaq.com/api/quote/${encodeURIComponent(
    ticker,
  )}/info?assetclass=stocks`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json,text/plain,*/*",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Nasdaq HTTP ${response.status}`);
  }

  return response.json();
}

async function fetchStooqQuoteCsv(ticker) {
  const stooqSymbol = `${ticker.toLowerCase()}.us`;
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(
    stooqSymbol,
  )}&f=sd2t2ohlcv&h&e=csv`;

  const response = await fetch(url, {
    headers: {
      Accept: "text/csv,text/plain,*/*",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Stooq HTTP ${response.status}`);
  }

  return response.text();
}

async function fetchYahooQuoteSource(ticker, asOf) {
  try {
    const quote = await yahooFinance.quote(ticker);
    return buildYahooQuoteSource(quote, asOf);
  } catch (error) {
    console.error(`Yahoo Finance quote failed for ${ticker}: ${error.message}`);
    return insufficientData("Yahoo Finance request failed");
  }
}

async function fetchFinnhubQuoteSource(ticker) {
  try {
    if (!process.env.FINNHUB_API_KEY) {
       return insufficientData("Finnhub API key not configured");
    }
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${process.env.FINNHUB_API_KEY}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`Finnhub HTTP ${response.status}`);
    }
    const data = await response.json();
    return buildFinnhubQuoteSource(ticker, data);
  } catch (error) {
    console.error(`Finnhub quote failed for ${ticker}: ${error.message}`);
    return insufficientData("Finnhub request failed");
  }
}

async function fetchNasdaqQuoteSource(ticker) {
  try {
    const payload = await fetchNasdaqQuotePayload(ticker);
    return buildNasdaqQuoteSource(ticker, payload);
  } catch (error) {
    console.error(`Nasdaq quote failed for ${ticker}: ${error.message}`);
    return insufficientData("Nasdaq request failed");
  }
}

async function fetchStooqQuoteSource(ticker) {
  try {
    const csvText = await fetchStooqQuoteCsv(ticker);
    return buildStooqQuoteSource(ticker, csvText);
  } catch (error) {
    console.error(`Stooq quote failed for ${ticker}: ${error.message}`);
    return insufficientData("Stooq request failed");
  }
}

async function fetchQuoteSources(ticker, asOf = new Date()) {
  const [yahooSource, nasdaqSource, finnhubSource] = await Promise.all([
    fetchYahooQuoteSource(ticker, asOf),
    fetchNasdaqQuoteSource(ticker),
    fetchFinnhubQuoteSource(ticker),
  ]);

  return [yahooSource, nasdaqSource, finnhubSource];
}

module.exports = {
  buildFinnhubQuoteSource,
  buildNasdaqQuoteSource,
  buildStooqQuoteSource,
  buildYahooQuoteSource,
  fetchFinnhubQuoteSource,
  fetchQuoteSources,
  fetchStooqQuoteSource,
  normalizeNasdaqTimestamp,
  normalizeStooqTimestamp,
  parseMoney,
  parseSimpleCsv,
};
