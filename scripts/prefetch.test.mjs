import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../prefetch.js', import.meta.url), 'utf8');

function setup({ rules = true, hint = true, connection, online = true, page = 'https://example.com/' } = {}) {
  const listeners = {}, timers = new Map(), requests = [];
  const location = new URL(page);
  const navigator = { connection, onLine: online };
  let nextTimer = 0;
  vm.runInNewContext(source, {
    URL, Set, Map, location, navigator,
    HTMLScriptElement: { supports: () => rules },
    document: {
      createElement: tag => ({ tag, relList: { supports: () => hint } }),
      head: { appendChild: element => requests.push(element) },
      addEventListener: (type, handler) => { listeners[type] = handler; }
    },
    setTimeout: (callback, delay) => { assert.equal(delay, 100); timers.set(++nextTimer, callback); return nextTimer; },
    clearTimeout: id => timers.delete(id)
  });
  function link(href, { download = false, optOut = false, target = '', rel = '' } = {}) {
    const anchor = {
      href: new URL(href, location).href, target, rel,
      hasAttribute: key => key === 'download' && download,
      closest: selector => selector === 'a[href]' ? anchor : optOut ? {} : null,
      contains: node => node === anchor || node === child
    };
    const child = { closest: () => anchor };
    return { anchor, child };
  }
  const fire = (type, target, extras = {}) => listeners[type]?.({ target, pointerType: 'mouse', button: 0, relatedTarget: null, ...extras });
  const flush = () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(callback => callback()); };
  const urls = () => requests.map(element => element.tag === 'script' ? JSON.parse(element.textContent).prefetch[0].urls[0] : element.href);
  return { listeners, timers, requests, link, fire, flush, urls, navigator };
}

test('hover waits for intent, cancels a brief pass, and works through nested labels', () => {
  const env = setup(), { anchor, child } = env.link('/blog/');
  assert.equal(env.requests.length, 0);
  env.fire('pointerover', child);
  assert.equal(env.requests.length, 0);
  env.fire('pointerout', child, { relatedTarget: anchor });
  assert.equal(env.timers.size, 1);
  env.fire('pointerout', anchor);
  env.flush();
  assert.equal(env.requests.length, 0);
  env.fire('pointerover', child);
  env.flush();
  assert.deepEqual(env.urls(), ['https://example.com/blog/']);
  assert.equal(env.requests[0].type, 'speculationrules');
  assert.equal(JSON.parse(env.requests[0].textContent).prefetch[0].eagerness, 'immediate');
});

test('keyboard focus and touch press prefetch, without intercepting navigation', () => {
  const env = setup();
  env.fire('focusin', env.link('/blog/').anchor);
  env.flush();
  env.fire('pointerover', env.link('/privacy/').anchor, { pointerType: 'touch' });
  env.flush();
  assert.equal(env.requests.length, 1);
  env.fire('pointerdown', env.link('/privacy/#website').anchor, { pointerType: 'touch' });
  assert.deepEqual(env.urls(), ['https://example.com/blog/', 'https://example.com/privacy/']);
  assert.equal(env.listeners.click, undefined);
});

test('canceling focus or modified presses produces no request', () => {
  const env = setup(), { anchor } = env.link('/coffee');
  env.fire('focusin', anchor);
  env.fire('focusout', anchor);
  env.flush();
  for (const extras of [{ button: 1 }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }]) env.fire('pointerdown', anchor, extras);
  assert.equal(env.requests.length, 0);
});

test('skips external links, downloads, assets, redirects, opt-outs, and action queries', () => {
  const env = setup();
  for (const href of ['#main', '/index.html#other', 'https://other.example/blog/', 'mailto:a@example.com', 'javascript:void(0)', '/image.webp', '/file.zip', '/data.json', '/privacy.html', '/louppe/', '/blog/?delete=1', 'https://user:pass@example.com/blog/']) {
    env.fire('pointerdown', env.link(href).anchor);
  }
  for (const options of [{ download: true }, { target: '_blank' }, { rel: 'external' }, { optOut: true }]) env.fire('pointerdown', env.link('/blog/', options).anchor);
  assert.equal(env.requests.length, 0);
});

test('preserves appearance parameters and resolves the latest URL after hover', () => {
  const env = setup({ page: 'https://example.com/trials/' }), { anchor } = env.link('./background/?look=paper&seed=42#main');
  env.fire('pointerover', anchor);
  anchor.href = 'https://example.com/trials/background/?look=simple&seed=43#main';
  env.flush();
  assert.deepEqual(env.urls(), ['https://example.com/trials/background/?look=simple&seed=43']);
});

test('deduplicates fragments, limits requests, and leaves localized routes intact', () => {
  const env = setup();
  env.fire('pointerdown', env.link('/ar/blog/#first').anchor);
  env.fire('pointerdown', env.link('/ar/blog/#second').anchor);
  for (let i = 0; i < 20; i++) env.fire('pointerdown', env.link(`/blog/post-${i}/`).anchor);
  assert.equal(env.requests.length, 8);
  assert.equal(env.urls()[0], 'https://example.com/ar/blog/');
});

test('respects data saver, slow connections, offline state, and changes during hover', () => {
  for (const options of [{ online: false }, { connection: { saveData: true } }, { connection: { effectiveType: '2g' } }, { connection: { effectiveType: 'slow-2g' } }]) {
    const env = setup(options);
    env.fire('pointerdown', env.link('/blog/').anchor);
    assert.equal(env.requests.length, 0);
  }
  const env = setup(), { anchor } = env.link('/blog/');
  env.fire('pointerover', anchor);
  env.navigator.connection = { saveData: true };
  env.flush();
  assert.equal(env.requests.length, 0);
});

test('falls back to a supported browser hint and safely no-ops without either API', () => {
  const env = setup({ rules: false });
  env.fire('pointerdown', env.link('/blog/').anchor);
  assert.equal(env.requests[0].rel, 'prefetch');
  assert.equal(env.requests[0].as, 'document');
  const unsupported = setup({ rules: false, hint: false });
  assert.deepEqual(Object.keys(unsupported.listeners), []);
});

test('current-page aliases do not prefetch themselves', () => {
  for (const page of ['https://example.com/coffee', 'https://example.com/coffee.html', 'https://example.com/blog/index.html']) {
    const env = setup({ page });
    env.fire('pointerdown', env.link(page.includes('coffee') ? '/coffee.html#recipe' : '/blog/').anchor);
    assert.equal(env.requests.length, 0);
  }
});

test('standard pages and every trial load the shared prefetch script', async () => {
  const { readdir } = await import('node:fs/promises');
  const root = new URL('../', import.meta.url);
  const files = ['index.html', 'cv.html', 'coffee.html', 'trials/index.html'];
  for (const entry of await readdir(new URL('trials/', root), { withFileTypes: true })) {
    if (entry.isDirectory() && !entry.name.startsWith('_')) files.push(`trials/${entry.name}/index.html`);
  }
  for (const file of files) assert.match(readFileSync(new URL(file, root), 'utf8'), /<script src="\/prefetch\.js\?v=20261008-1" defer><\/script>/, file);
});
