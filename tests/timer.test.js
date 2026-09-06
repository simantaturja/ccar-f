const test = require('node:test');
const assert = require('node:assert');

test('timeLeft', async (t) => {
  const { timeLeft, EXAM_MINUTES } = await import('../docs/js/api.js');
  const total = EXAM_MINUTES * 60000;
  const t0 = 1_000_000;

  await t.test('counts down when running', () => {
    assert.strictEqual(timeLeft({ startedAt: t0 }, t0 + 5000), total - 5000);
  });
  await t.test('freezes while paused', () => {
    const s = { startedAt: t0, pausedMs: 0, pausedAt: t0 + 5000 };
    assert.strictEqual(timeLeft(s, t0 + 60000), total - 5000);
  });
  await t.test('accumulates multiple pauses', () => {
    const s = { startedAt: t0, pausedMs: 30000, pausedAt: null };
    assert.strictEqual(timeLeft(s, t0 + 60000), total - 30000);
  });
  await t.test('old state without pause fields', () => {
    assert.strictEqual(timeLeft({ startedAt: t0 }, t0), total);
  });
});
