import test from 'node:test';
import assert from 'node:assert';
import { getUserHoldings } from '../src/db.js';

test('getUserHoldings should be a function', () => {
  assert.strictEqual(typeof getUserHoldings, 'function');
});
