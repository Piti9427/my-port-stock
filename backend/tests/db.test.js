const test = require("node:test");
const assert = require("node:assert/strict");

const { createPortfolioDb, getUserHoldings } = require("../src/db");

test("getUserHoldings should be a function", () => {
  assert.equal(typeof getUserHoldings, "function");
});

test("portfolio DB queries holdings by Clerk user id", async () => {
  const calls = [];
  const fakeClient = {
    from(table) {
      calls.push(["from", table]);
      const queryBuilder = {
        select(columns) {
          calls.push(["select", columns]);
          return queryBuilder;
        },
        eq(column, value) {
          calls.push(["eq", column, value]);
          return queryBuilder;
        },
        then(onFulfilled) {
          return Promise.resolve({ data: [], error: null }).then(onFulfilled);
        }
      };
      return queryBuilder;
    },
  };

  const db = createPortfolioDb(fakeClient);
  await db.getUserHoldings("user_123");

  assert.deepEqual(calls, [
    ["from", "holdings"],
    ["select", "*"],
    ["eq", "user_id", "user_123"],
    ["eq", "is_deleted", false],
  ]);
});

test("portfolio DB queries journal by Clerk user id and ticker", async () => {
  const calls = [];
  const fakeClient = {
    from(table) {
      calls.push(["from", table]);
      const queryBuilder = {
        select(columns) {
          calls.push(["select", columns]);
          return queryBuilder;
        },
        eq(column, value) {
          calls.push(["eq", column, value]);
          return queryBuilder;
        },
        then(onFulfilled) {
          return Promise.resolve({ data: [], error: null }).then(onFulfilled);
        },
      };
      return queryBuilder;
    },
  };

  const db = createPortfolioDb(fakeClient);
  await db.getUserJournalByTicker("user_123", "NVDA");

  assert.deepEqual(calls, [
    ["from", "journal"],
    ["select", "*"],
    ["eq", "user_id", "user_123"],
    ["eq", "ticker", "NVDA"],
    ["eq", "is_deleted", false],
  ]);
});
