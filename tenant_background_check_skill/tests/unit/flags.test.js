import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeFlag, SEVERITIES } from '../../src/engine/flags.js';

test('makeFlag uses catalogue severity and message', () => {
  const f = makeFlag('UNREADABLE_FILE', 'ab12cd');
  assert.deepEqual(Object.keys(f).sort(), ['code', 'docId', 'message', 'severity']);
  assert.equal(f.severity, 'unverifiable');
  assert.equal(f.docId, 'ab12cd');
});

test('makeFlag rejects unknown codes', () => {
  assert.throws(() => makeFlag('NOPE', null), /Unknown flag code/);
});

test('severities are exactly red, soft, unverifiable, ok', () => {
  assert.deepEqual([...SEVERITIES], ['red', 'soft', 'unverifiable', 'ok']);
});
