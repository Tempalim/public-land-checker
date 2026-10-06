const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fetchJson } = require('../src/api/request.ts');
const { createLatestRequest } = require('../src/utils/latestRequest.ts');

test('new selections abort old requests and suppress out-of-order completion', () => {
  const requests = createLatestRequest();
  const old = requests.start();
  const latest = requests.start();
  assert.equal(old.signal.aborted, true);
  assert.equal(old.isCurrent(), false);
  assert.equal(latest.isCurrent(), true);
  requests.cancel();
  assert.equal(latest.isCurrent(), false);
});

test('request timeout covers headers even if transport ignores abort', async t => {
  t.mock.method(global, 'fetch', () => new Promise(() => {}));
  await assert.rejects(fetchJson('https://example.invalid', undefined, 10), e => e.code === 'TIMEOUT');
});

test('request timeout covers a stalled JSON body', async t => {
  t.mock.method(global, 'fetch', async () => ({ ok: true, json: () => new Promise(() => {}) }));
  await assert.rejects(fetchJson('https://example.invalid', undefined, 10), e => e.code === 'TIMEOUT');
});

test('external cancellation ends a pending lookup', async t => {
  t.mock.method(global, 'fetch', () => new Promise(() => {}));
  const controller = new AbortController();
  const response = fetchJson('https://example.invalid', controller.signal);
  controller.abort();
  await assert.rejects(response, e => e.code === 'CANCELLED');
});

test('pre-aborted signals never fetch', async t => {
  const fetch = t.mock.method(global, 'fetch', async () => { throw Error('must not fetch'); });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(fetchJson('https://example.invalid', controller.signal), e => e.code === 'CANCELLED');
  assert.equal(fetch.mock.callCount(), 0);
});

test('invalid JSON is a schema error, HTTP quota failures are classified', async t => {
  t.mock.method(global, 'fetch', async () => ({ ok: true, json: async () => { throw new SyntaxError('invalid'); } }));
  await assert.rejects(fetchJson('https://example.invalid'), e => e.code === 'SCHEMA');
  global.fetch = async () => ({ ok: false, status: 429 });
  await assert.rejects(fetchJson('https://example.invalid'), e => e.code === 'RATE_LIMIT');
});

test('transport errors never expose a key-bearing URL', async t => {
  t.mock.method(global, 'fetch', async () => { throw Error('https://example.invalid?key=SECRET'); });
  await assert.rejects(fetchJson('https://example.invalid'), e => e.code === 'NETWORK' && !e.message.includes('SECRET'));
});
