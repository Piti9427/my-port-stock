#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const {
  assertMarkdownImportOwner,
  buildMarkdownImportPayload,
  importMarkdownSnapshotForOwner,
} = require("../src/services/migrationService");

const root = path.resolve(__dirname, "../..");
const userId =
  process.argv
    .find((arg) => arg.startsWith("--user="))
    ?.slice("--user=".length) || process.env.MARKDOWN_IMPORT_OWNER_USER_ID;
const shouldWrite = process.argv.includes("--write");

async function main() {
  assertMarkdownImportOwner(userId);

  if (!shouldWrite) {
    const portfolioMarkdown = fs.readFileSync(
      path.join(root, "stock_portfolio.md"),
      "utf8",
    );
    const journalMarkdown = fs.readFileSync(
      path.join(root, "trade_journal.md"),
      "utf8",
    );
    const payload = buildMarkdownImportPayload({
      userId,
      portfolioMarkdown,
      journalMarkdown,
    });
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          import_batch_id: payload.batch.import_batch_id,
          journal_entries: payload.journalEntries.length,
          watchlist_items: payload.watchlistItems.length,
          journal_tickers: payload.journalEntries.map((entry) => entry.ticker),
          watchlist_tickers: payload.watchlistItems.map(
            (entry) => entry.ticker,
          ),
        },
        null,
        2,
      ),
    );
    return;
  }

  const result = await importMarkdownSnapshotForOwner(userId);
  console.log(JSON.stringify(result, null, 2));
  if (!result.migrated) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
