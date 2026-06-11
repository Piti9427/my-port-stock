const fs = require("fs");
const path = require("path");

const DEFAULT_JOURNAL_PATH = path.join(process.cwd(), "trade_journal.md");
const DEFAULT_PORTFOLIO_PATH = path.join(process.cwd(), "stock_portfolio.md");

function readTextFile(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    return null;
  }
}

function stripTickerPrefix(ticker) {
  return String(ticker || "").replace(/^\$/, "").toUpperCase();
}

function containsTicker(text, ticker) {
  if (!text) {
    return false;
  }

  const normalizedTicker = stripTickerPrefix(ticker);
  const pattern = new RegExp(`\\$?${normalizedTicker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return pattern.test(text);
}

function extractMarkdownTableRows(sectionText) {
  const rows = [];
  const lines = sectionText.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || /^ *\| *:?-+/.test(trimmed)) {
      continue;
    }

    const cells = trimmed
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());

    if (cells.length > 1) {
      rows.push(cells);
    }
  }

  return rows;
}

function getSection(markdown, heading) {
  if (!markdown) {
    return "";
  }

  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(
    new RegExp(`(^|\\n)## ${escapedHeading}[^\\n]*\\n([\\s\\S]*?)(?=\\n## |$)`, "i"),
  );

  return match ? match[2] : "";
}

function getTickerTableMatches(sectionText, ticker) {
  const normalizedTicker = stripTickerPrefix(ticker);
  return extractMarkdownTableRows(sectionText).filter((cells) =>
    cells.some((cell) => containsTicker(cell, normalizedTicker)),
  );
}

function readJournalContext(ticker, options = {}) {
  const journalPath = options.journalPath || DEFAULT_JOURNAL_PATH;
  const markdown = readTextFile(journalPath);
  const normalizedTicker = stripTickerPrefix(ticker);

  if (!markdown) {
    return {
      ticker: normalizedTicker,
      journal_checked: false,
      is_repeat_ticker: false,
      is_active_trade: false,
      unresolved_issues: ["trade_journal.md unavailable"],
      active_trade_rows: [],
      thesis_backlog_mentions: [],
      post_mortem_mentions: [],
    };
  }

  const activeTrades = getTickerTableMatches(getSection(markdown, "Active Trades"), normalizedTicker);
  const activeBacklog = getSection(markdown, "Active Thesis Backlog");
  const postMortemArchive = getSection(markdown, "Post-Mortem Archive");
  const fullMention = containsTicker(markdown, normalizedTicker);
  const thesisMentions = containsTicker(activeBacklog, normalizedTicker)
    ? activeBacklog
        .split(/\r?\n/)
        .filter((line) => containsTicker(line, normalizedTicker))
        .slice(0, 5)
    : [];
  const postMortemMentions = containsTicker(postMortemArchive, normalizedTicker)
    ? postMortemArchive
        .split(/\r?\n/)
        .filter((line) => containsTicker(line, normalizedTicker))
        .slice(0, 5)
    : [];

  const unresolvedIssues = [];
  for (const row of activeTrades) {
    const text = row.join(" | ");
    if (/pending|needs|refresh|verification|missing/i.test(text)) {
      unresolvedIssues.push(text);
    }
  }

  return {
    ticker: normalizedTicker,
    journal_checked: true,
    is_repeat_ticker: fullMention,
    is_active_trade: activeTrades.length > 0,
    unresolved_issues: unresolvedIssues,
    active_trade_rows: activeTrades,
    thesis_backlog_mentions: thesisMentions,
    post_mortem_mentions: postMortemMentions,
  };
}

function readPortfolioSnapshot(options = {}) {
  const portfolioPath = options.portfolioPath || DEFAULT_PORTFOLIO_PATH;
  const markdown = readTextFile(portfolioPath);

  if (!markdown) {
    return {
      status: "INSUFFICIENT_DATA",
      error_details: "stock_portfolio.md unavailable",
      stale_hypothesis: true,
    };
  }

  const summary = getSection(markdown, "Snapshot Summary")
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith("-"))
    .slice(0, 12);
  const holdingsRows = getTickerTableMatches(getSection(markdown, "Holdings Snapshot"), "");

  return {
    as_of: new Date().toISOString(),
    stale_hypothesis: true,
    source: "stock_portfolio.md",
    warning:
      "Portfolio snapshot is context only. Refresh broker holdings, cash, and prices before execution.",
    summary,
    holdings_rows: holdingsRows,
  };
}

function readTickerPortfolioContext(ticker, options = {}) {
  const portfolio = readPortfolioSnapshot(options);
  const normalizedTicker = stripTickerPrefix(ticker);

  if (portfolio.status === "INSUFFICIENT_DATA") {
    return portfolio;
  }

  const markdown = readTextFile(options.portfolioPath || DEFAULT_PORTFOLIO_PATH) || "";
  const isHeld = containsTicker(getSection(markdown, "Holdings Snapshot"), normalizedTicker);
  const isWatchlist = containsTicker(markdown, normalizedTicker);

  return {
    ticker: normalizedTicker,
    stale_hypothesis: true,
    is_held: isHeld,
    is_watchlist_or_context: isWatchlist,
    warning: portfolio.warning,
  };
}

module.exports = {
  containsTicker,
  readJournalContext,
  readPortfolioSnapshot,
  readTickerPortfolioContext,
  stripTickerPrefix,
};
