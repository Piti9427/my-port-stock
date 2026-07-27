const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const fs = require("node:fs");
const path = require("node:path");

describe("Dashboard Component Check", () => {
  it("should exist and export default", () => {
    const filePath = path.join(__dirname, "../../frontend/src/Dashboard.jsx");
    const content = fs.readFileSync(filePath, "utf8");
    assert.match(content, /export default/);
  });
});
