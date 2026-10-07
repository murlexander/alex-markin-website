// Run with: node --test scripts/test-site-activity.cjs
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync(require('node:path').join(__dirname, '../site.js'), 'utf8');
const now = Date.parse('2026-10-07T13:00:00Z');
const profileKey = 'github-activity-v1:users/murlexander/events/public?per_page=1';

async function run({ datasets = [{ user: 'murlexander' }], data, ok = true,
  cache = new Map(), blockedStorage = false, reject = false, pending = false } = {}) {
  const elements = datasets.map(dataset => ({ dataset, textContent: '' }));
  const calls = [], timers = new Map();
  vm.runInNewContext(source, {
    Date: class extends Date { static now() { return now; } },
    document: {
      querySelectorAll: selector => selector === '.ago[data-user], .ago[data-repo]' ? elements : [],
      querySelector: () => null,
      documentElement: { getAttribute: () => null }
    },
    window: {}, AbortController,
    setTimeout: callback => { const id = timers.size + 1; timers.set(id, callback); return id; },
    clearTimeout: id => timers.delete(id),
    sessionStorage: {
      getItem: key => { if (blockedStorage) throw Error('blocked'); return cache.get(key) || null; },
      setItem: (key, value) => { if (blockedStorage) throw Error('blocked'); cache.set(key, value); }
    },
    fetch: (url, options) => {
      calls.push({ url, options });
      if (pending) return new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(Error('aborted')));
      });
      if (reject) return Promise.reject(Error('offline'));
      return Promise.resolve({ ok, json: () => Promise.resolve(data) });
    }
  });
  await new Promise(setImmediate);
  return { elements, calls, cache, timers };
}

test('profile reads public events and formats compact minutes', async () => {
  const result = await run({ data: [{ created_at: '2026-10-07T12:57:00Z' }] });
  assert.equal(result.elements[0].textContent, 'upd 3 min ago');
  assert.match(result.elements[0].title, /Latest public GitHub activity/);
  assert.equal(result.calls[0].url, 'https://api.github.com/users/murlexander/events/public?per_page=1');
  assert.equal(result.calls[0].options.credentials, 'omit');
  assert.equal(result.calls[0].options.referrerPolicy, 'no-referrer');
  assert.equal(result.timers.size, 0);
  assert.equal(JSON.parse(result.cache.get(profileKey)).value, '2026-10-07T12:57:00Z');
});

test('repository uses its last push rather than metadata edits', async () => {
  const result = await run({ datasets: [{ repo: 'murlexander/louppe-media-culler' }],
    data: { pushed_at: '2026-10-03T04:42:39Z', updated_at: '2026-10-07T12:59:00Z' } });
  assert.equal(result.elements[0].textContent, 'upd 4 days ago');
  assert.match(result.elements[0].title, /Latest repository push/);
  assert.equal(result.calls[0].url, 'https://api.github.com/repos/murlexander/louppe-media-culler');
});

test('fresh cache avoids another request and recalculates relative time', async () => {
  const cache = new Map([[profileKey, JSON.stringify({ at: now - 60000, value: '2026-10-07T12:58:00Z' })]]);
  const result = await run({ cache });
  assert.equal(result.calls.length, 0);
  assert.equal(result.elements[0].textContent, 'upd 2 min ago');
});

test('stale, invalid, and future caches are refreshed', async () => {
  for (const cached of ['broken JSON', JSON.stringify({ at: now - 900000, value: '2026-08-07T13:00:00Z' }),
    JSON.stringify({ at: now + 1, value: '2026-10-07T12:59:00Z' }),
    JSON.stringify({ at: now, value: 'invalid' })]) {
    const result = await run({ cache: new Map([[profileKey, cached]]), data: [{ created_at: '2026-10-07T12:59:00Z' }] });
    assert.equal(result.calls.length, 1);
    assert.equal(result.elements[0].textContent, 'upd 1 min ago');
  }
});

test('blocked storage still permits live labels', async () => {
  const result = await run({ blockedStorage: true, data: [{ created_at: '2026-10-07T13:00:00Z' }] });
  assert.equal(result.elements[0].textContent, 'upd just now');
  assert.equal(result.timers.size, 0);
});

test('offline, rate-limited, empty, and invalid responses never show fixed dates', async () => {
  for (const options of [{ reject: true }, { ok: false }, { data: [] }, { data: null },
    { data: {} }, { data: [{ created_at: 'invalid' }] }, { data: [{ created_at: '2026-10-08T13:00:00Z' }] }]) {
    const result = await run({ ...options, datasets: [{ user: 'murlexander', fallbackUpdated: '2026-08-07T13:00:00Z' }] });
    assert.equal(result.elements[0].textContent, '');
    assert.equal(result.timers.size, 0);
  }
});

test('slow requests are aborted and leave the label empty', async () => {
  const result = await run({ pending: true });
  for (const callback of result.timers.values()) callback();
  await new Promise(setImmediate);
  assert.equal(result.calls[0].options.signal.aborted, true);
  assert.equal(result.elements[0].textContent, '');
  assert.equal(result.timers.size, 0);
});

test('pages without activity labels make no GitHub requests', async () => {
  const result = await run({ datasets: [] });
  assert.equal(result.calls.length, 0);
});
