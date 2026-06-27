# ADR 0003: Sub-Agent Autonomous Search and Hybrid Data Contract

## Status

Accepted

## Context

Under the Deep 7-Dimension SOP analysis, sub-agents (e.g., `@fundamental-auditor`, `@quant-technician`, `@catalyst-hunter`) require rich, real-time contextual details such as filings, upcoming catalysts, macro flow, and sentiment.
Banning sub-agent searches completely (Single Data Oracle) simplifies coordination but severely limits analysis depth.
Conversely, allowing complete search freedom introduces:
1. **Price Drift:** Different agents fetching market quotes at different milliseconds or from different sources, leading to mathematically inconsistent stop-loss, target, and THB risk calculation alignments.
2. **Cost & Quota Blowout:** Multiple concurrent agents executing redundant search requests for the same stock audit, exhausting Search API quotas.

## Decision

1. **Hybrid Data Contract:** Sub-agents are equipped with search tools to look up qualitative and contextual information (e.g., news headlines, catalyst events, macro flow, sentiment details). However, **all quantitative price data** (Last Price, entry zone, stop-loss, targets, cash balances, and risk limits) remains strictly bound to the Orchestrator-supplied verified data packet. Sub-agents must not search for current prices.
2. **Centralized Search Caching:** Implement a caching middleware at the backend/tooling layer. Contextual search results for a ticker are cached for 1 hour. Subsequent queries by other sub-agents during the same audit run will read from the cache.
3. **Strict Search Quotas:** Each sub-agent is restricted to a maximum of 3 independent search executions per analysis run.

## Consequences

- Stop-loss, entry, and position risk math remain 100% mathematically aligned and consistent across all sub-agent responses.
- API rate limits and Search token usage are safely capped, preventing unexpected cost spikes during concurrent audits.
- Requires building and maintaining query-caching logic and a cache eviction process in the backend infrastructure layer.
