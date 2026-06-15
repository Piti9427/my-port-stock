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
      return {
        select(columns) {
          calls.push(["select", columns]);
          return {
            eq(column, value) {
              calls.push(["eq", column, value]);
              return Promise.resolve({ data: [], error: null });
            },
          };
        },
      };
    },
  };

  const db = createPortfolioDb(fakeClient);
  await db.getUserHoldings("user_123");

  assert.deepEqual(calls, [
    ["from", "holdings"],
    ["select", "*"],
    ["eq", "user_id", "user_123"],
  ]);
});
