const { describe, it, mock, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const childProcess = require("node:child_process");

describe("marketOracleService", () => {
  let runMarketOracle;

  beforeEach(() => {
    delete require.cache[require.resolve("../src/services/marketOracleService")];
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("Returns parsed oracle data for valid ticker", async () => {
    mock.method(childProcess, "execFile", (cmd, args, options, callback) => {
      callback(null, JSON.stringify({ NVDA: { score: 9.5 } }), "");
    });
    runMarketOracle = require("../src/services/marketOracleService").runMarketOracle;
    const result = await runMarketOracle("NVDA");
    assert.deepEqual(result, { score: 9.5 });
  });

  it("Returns error object when execFile fails", async () => {
    mock.method(childProcess, "execFile", (cmd, args, options, callback) => {
      callback(new Error("Python not found"), "", "");
    });
    runMarketOracle = require("../src/services/marketOracleService").runMarketOracle;
    const result = await runMarketOracle("NVDA");
    assert.deepEqual(result, { error: "Python not found" });
  });

  it("Returns error when stdout is not valid JSON", async () => {
    mock.method(childProcess, "execFile", (cmd, args, options, callback) => {
      callback(null, "invalid json", "");
    });
    runMarketOracle = require("../src/services/marketOracleService").runMarketOracle;
    const result = await runMarketOracle("NVDA");
    assert.deepEqual(result, { error: "Failed to parse oracle output" });
  });

  it("Returns error when ticker key is missing from result", async () => {
    mock.method(childProcess, "execFile", (cmd, args, options, callback) => {
      callback(null, JSON.stringify({ AAPL: { score: 8 } }), "");
    });
    runMarketOracle = require("../src/services/marketOracleService").runMarketOracle;
    const result = await runMarketOracle("NVDA");
    assert.deepEqual(result, { error: "No data returned" });
  });

  it("Handles timeout error gracefully", async () => {
    mock.method(childProcess, "execFile", (cmd, args, options, callback) => {
      callback(new Error("Command failed: timeout"), "", "");
    });
    runMarketOracle = require("../src/services/marketOracleService").runMarketOracle;
    const result = await runMarketOracle("NVDA");
    assert.deepEqual(result, { error: "Command failed: timeout" });
  });
});
