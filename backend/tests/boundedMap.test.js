const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { BoundedMap } = require("../src/common/BoundedMap");

describe("BoundedMap", () => {
  it("evicts the least recently used entry", () => {
    const cache = new BoundedMap(2);
    cache.set("A", 1);
    cache.set("B", 2);
    cache.get("A");
    cache.set("C", 3);

    assert.equal(cache.has("A"), true);
    assert.equal(cache.has("B"), false);
    assert.equal(cache.has("C"), true);
  });

  it("rejects invalid limits", () => {
    assert.throws(() => new BoundedMap(0), /positive integer/i);
    assert.throws(() => new BoundedMap(1.5), /positive integer/i);
  });

  it("does not grow when an existing key is overwritten", () => {
    const cache = new BoundedMap(2);
    cache.set("A", 1);
    cache.set("A", 2);

    assert.equal(cache.size, 1);
    assert.equal(cache.get("A"), 2);
  });
});
