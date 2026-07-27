const { execFile } = require("node:child_process");
const path = require("node:path");
const { getTestProviders } = require("../providers/providerRegistry");

function runMarketOracle(ticker) {
  const testProvider = getTestProviders()?.marketOracle;
  if (testProvider) return testProvider.analyze(ticker);
  return new Promise((resolve) => {
    execFile(
      "python3",
      ["tools/market_oracle.py", ticker],
      {
        cwd: path.join(__dirname, "../../.."),
        timeout: 10000,
      },
      (error, stdout) => {
        if (error) {
          console.error(`Error running market_oracle: ${error.message}`);
          return resolve({ error: error.message });
        }
        try {
          const result = JSON.parse(stdout);
          resolve(result[ticker] || { error: "No data returned" });
        } catch (e) {
          console.error("Oracle JSON parse error:", e.message);
          resolve({ error: "Failed to parse oracle output" });
        }
      },
    );
  });
}

module.exports = { runMarketOracle };
