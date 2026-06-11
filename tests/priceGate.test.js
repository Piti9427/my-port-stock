const test = require("node:test");
const assert = require("node:assert/strict");

const { SOURCE_NASDAQ, SOURCE_YAHOO } = require("../backend/src/common/constants");
const {
  buildTwoSourceQuotePacket,
  getGateThresholdPct,
} = require("../backend/src/gates/priceGate");
const { buildNasdaqQuoteSource } = require("../backend/src/sources/quoteSources");

function source(name, price) {
  return {
    source: name,
    tier: "Tier 2",
    last_price: price,
    quote_timestamp: "2026-06-05T14:30:00.000Z",
    market_session: "Regular",
    quote_delay_status: "Delayed",
  };
}

test("one valid quote source fails closed", () => {
  const packet = buildTwoSourceQuotePacket("NVDA", [source(SOURCE_YAHOO, 100)]);

  assert.equal(packet.status, "INSUFFICIENT_DATA");
  assert.match(packet.error_details, /Need two valid quote sources/);
});

test("two regular-session quote sources beyond 0.5% fail closed", () => {
  const packet = buildTwoSourceQuotePacket(
    "NVDA",
    [source(SOURCE_YAHOO, 100), source(SOURCE_NASDAQ, 101)],
    new Date("2026-06-05T15:00:00.000Z"),
  );

  assert.equal(packet.status, "INSUFFICIENT_DATA");
  assert.match(packet.error_details, /above 0.5% threshold/);
});

test("regular and extended thresholds are selected correctly", () => {
  assert.equal(getGateThresholdPct("Regular"), 0.5);
  assert.equal(getGateThresholdPct("Closed"), 1.0);
  assert.equal(getGateThresholdPct("After-hours"), 1.0);
});

test("successful quote packet includes source metadata", () => {
  const packet = buildTwoSourceQuotePacket(
    "NVDA",
    [source(SOURCE_YAHOO, 100), source(SOURCE_NASDAQ, 100.1)],
    new Date("2026-06-05T15:00:00.000Z"),
  );

  assert.equal(packet.current_price_acceptance_gate, "pass");
  assert.deepEqual(packet.price_source_tiers, ["Tier 2", "Tier 2"]);
  assert.equal(packet.quote_timestamp, "2026-06-05T14:30:00.000Z");
  assert.equal(packet.market_session, "Regular");
  assert.equal(typeof packet.quote_delay_status, "object");
});

test("Nasdaq builder never accepts analyst target as last price", () => {
  const packet = buildNasdaqQuoteSource("NVDA", {
    data: {
      marketStatus: "Regular",
      primaryData: {
        lastSalePrice: "N/A",
        lastTradeTimestamp: "June 5, 2026 10:30:00 AM ET",
        isRealTime: false,
        analystTargetPrice: "$999.00",
      },
    },
  });

  assert.equal(packet.status, "INSUFFICIENT_DATA");
});
