import test from 'node:test';
import assert from 'node:assert/strict';

test('production baseline documents required runtime', () => {
  assert.equal(process.versions.node.split('.')[0] >= '24', true);
});
