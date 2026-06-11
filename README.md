# MyPortStock Quote API

Standalone local REST API for the MyPortStock orchestrator quote packet.

This service is designed as a free Tier 2 quote adapter. It does not replace
broker confirmation. Execution decisions still need the MyPortStock acceptance
gate and final user or broker quote confirmation when required.

## Install

```bash
npm install
```

## Run

```bash
npm start
```

Default URL:

```text
http://127.0.0.1:3000
```

Use another port if needed:

```bash
PORT=3001 npm start
```

## Endpoints

### Health

```bash
curl http://localhost:3000/health
```

Returns process health, cache size, provider list, and gate thresholds.

### Quote

```bash
curl http://localhost:3000/api/quote/nvda
```

Successful response:

```json
{
  "as_of": "2026-05-26T17:27:12.245Z",
  "ticker": "NVDA",
  "last_price": 213.71,
  "price_sources": ["Yahoo Finance API", "Nasdaq Quote API"],
  "price_source_tiers": ["Tier 2", "Tier 2"],
  "quote_timestamp": "2026-05-26T17:27:11.000Z",
  "market_session": "Regular",
  "current_price_acceptance_gate": "pass",
  "cross_check": {
    "primary_source": "Yahoo Finance API",
    "secondary_source": "Nasdaq Quote API",
    "price_difference_pct": 0,
    "threshold_pct": 0.5,
    "status": "pass"
  }
}
```

Fail-closed response:

```json
{
  "status": "INSUFFICIENT_DATA",
  "error_details": "Need two valid quote sources"
}
```

## Provider Strategy

Primary pair:

- Yahoo Finance API
- Nasdaq Quote API

Fallback:

- Stooq Delayed CSV

The fallback is used only when fewer than two primary sources are valid. If the
primary pair is valid but conflicts beyond the configured threshold, the API
fails closed instead of using the fallback to override the conflict.

## Acceptance Gate

The service requires two valid Tier 2 sources.

Thresholds:

- Regular session: prices must differ by no more than 0.5%.
- Pre-market, after-hours, or closed: prices must differ by no more than 1.0%.

Only successful packets are cached. Cache TTL is 60 seconds.

## Verification

```bash
npm test
curl http://localhost:3000/health
curl http://localhost:3000/api/quote/nvda
curl http://localhost:3000/api/quote/NOT_A_REAL_TICKER_123
```

## Important Boundary

`current_price_acceptance_gate: "pass"` means the local adapter found two valid
free Tier 2 quote sources within threshold. It is not a broker execution
confirmation and should not be treated as a paid real-time market-data feed.
