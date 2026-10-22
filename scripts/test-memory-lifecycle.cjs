const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync(require('node:path').join(__dirname, '../appearance.js'), 'utf8');

function setup({ look = 'paper', objectURLs = true, script = source } = {}) {
  const attrs = new Map(), properties = new Map(), frames = new Map();
  const events = { window: {}, document: {}, control: {} };
  const resources = new Map(), revoked = [], observers = [];
  let serial = 0, seed = 0;
  const listen = target => (name, callback) => (events[target][name] ||= []).push(callback);
  const style = {
    setProperty: (name, value) => properties.set(name, String(value)),
    removeProperty: name => properties.delete(name),
    getPropertyValue: name => properties.get(name) || ''
  };
  const root = {
    style,
    setAttribute: (name, value) => attrs.set(name, value),
    getAttribute: name => attrs.get(name) ?? null,
    removeAttribute: name => attrs.delete(name),
    hasAttribute: name => attrs.has(name),
    toggleAttribute: (name, on) => on ? attrs.set(name, '') : attrs.delete(name)
  };
  const page = { offsetTop: 0, offsetHeight: 1258 };
  const body = { offsetHeight: 1258, scrollHeight: 6000 };
  const label = { setAttribute() {}, focus() {} };
  const control = {
    addEventListener: listen('control'), querySelectorAll: () => [],
    querySelector: () => label, hasAttribute: () => false, toggleAttribute() {}
  };
  const document = {
    documentElement: root, body, hidden: false,
    addEventListener: listen('document'),
    querySelector: selector => selector === '.page' ? page : selector === '[data-appearance-control]' ? control : null,
    querySelectorAll: () => []
  };
  const storage = new Map();
  class ImageURL extends URL {
    static createObjectURL(blob) {
      const url = 'blob:test-' + ++serial;
      resources.set(url, blob);
      return url;
    }
    static revokeObjectURL(url) {
      assert.ok(resources.has(url), 'each resource is revoked exactly once');
      resources.delete(url);
      revoked.push(url);
    }
  }
  const window = {
    Blob: objectURLs ? Blob : undefined, URL: ImageURL,
    innerHeight: 800, scrollY: 0,
    location: { search: '?look=' + look + '&seed=memory-check', href: 'https://example.com/' },
    history: { replaceState() {} },
    sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    crypto: { getRandomValues: values => values.fill(++seed) },
    matchMedia: () => ({ matches: false }), addEventListener: listen('window'),
    requestAnimationFrame: callback => { frames.set(++serial, callback); return serial; },
    cancelAnimationFrame: frame => frames.delete(frame)
  };
  class ResizeObserver {
    constructor(callback) { this.callback = callback; this.connected = false; observers.push(this); }
    observe() { this.connected = true; }
    disconnect() { this.connected = false; }
  }
  window.ResizeObserver = ResizeObserver;
  vm.runInNewContext(script, { window, document, ResizeObserver, URL, URLSearchParams, console });
  const fire = (target, name, event = {}) => events[target][name]?.forEach(callback => callback(event));
  const flush = () => { const work = [...frames.values()]; frames.clear(); work.forEach(callback => callback()); };
  fire('document', 'DOMContentLoaded');
  flush();
  return { attrs, properties, frames, resources, revoked, observers, page, body, document, window, fire, flush,
    choose: look => fire('control', 'click', { target: { closest: selector => selector === '[data-choose-look]' ? { dataset: { chooseLook: look } } : null } }) };
}

test('hundreds of appearance changes retain only the current edition SVGs', async () => {
  const env = setup();
  const looks = ['simple', 'paper', 'blobs', 'eno', '70mm', 'crt', 'terminal'];
  for (let i = 0; i < 210; i++) {
    const old = [...env.resources.keys()];
    env.choose(looks[i % looks.length]);
    assert.ok(env.resources.size <= 3, 'at most grain, dust, and perforations');
    for (const url of old) assert.ok(!env.resources.has(url));
    env.flush();
  }
  for (const blob of env.resources.values()) {
    assert.equal(blob.type, 'image/svg+xml');
    assert.match(await blob.text(), /^<svg .*<\/svg>$/);
  }
  assert.ok(env.revoked.length > 210);
});

test('departure releases images, frames, and observers; history restoration rebuilds the same SVGs', async () => {
  const env = setup();
  const originals = await Promise.all([...env.resources.values()].map(blob => blob.text()));
  env.fire('window', 'resize');
  assert.ok(env.frames.size);
  env.fire('window', 'pagehide', { persisted: true });
  assert.equal(env.resources.size, 0);
  assert.equal(env.frames.size, 0);
  assert.equal(env.observers[0].connected, false);
  assert.equal(env.properties.get('--grain-url'), 'none');
  assert.ok(env.attrs.has('data-appearance-suspended'));
  env.fire('window', 'resize');
  assert.equal(env.frames.size, 0);
  env.fire('window', 'pageshow', { persisted: true });
  env.flush();
  assert.deepEqual(await Promise.all([...env.resources.values()].map(blob => blob.text())), originals);
  assert.equal(env.observers[0].connected, true);
  assert.ok(!env.attrs.has('data-appearance-suspended'));
  assert.equal(env.attrs.get('data-edition-seed'), 'memory-check');
});

test('paper artwork shrinks with content despite its previous scroll overflow', () => {
  const env = setup();
  env.page.offsetHeight = env.body.offsetHeight = 2322;
  env.fire('window', 'resize'); env.flush();
  assert.equal(env.properties.get('--appearance-document-height'), '2322px');
  env.page.offsetHeight = env.body.offsetHeight = 1258.25;
  env.fire('window', 'resize'); env.flush();
  assert.equal(env.properties.get('--appearance-document-height'), '1259px');
  env.page.offsetHeight = env.body.offsetHeight = 400;
  env.fire('window', 'resize'); env.flush();
  assert.equal(env.properties.get('--appearance-document-height'), '800px');
});

test('scroll work is absent for static looks and coalesces for blobs', () => {
  const env = setup({ look: 'simple' });
  for (let i = 0; i < 100; i++) env.fire('window', 'scroll');
  assert.equal(env.frames.size, 0);
  env.choose('blobs'); env.flush();
  for (let i = 0; i < 100; i++) env.fire('window', 'scroll');
  assert.equal(env.frames.size, 1);
});

test('hidden tabs pause and resume without changing the edition', () => {
  const env = setup();
  const urls = [...env.resources.keys()];
  env.document.hidden = true;
  env.fire('document', 'visibilitychange');
  assert.ok(env.attrs.has('data-appearance-paused'));
  env.document.hidden = false;
  env.fire('document', 'visibilitychange');
  assert.ok(!env.attrs.has('data-appearance-paused'));
  assert.deepEqual([...env.resources.keys()], urls);
});

test('browsers without object URL support retain exact SVG fallbacks across history', () => {
  const env = setup({ objectURLs: false });
  const grain = env.properties.get('--grain-url');
  assert.match(grain, /^url\("data:image\/svg\+xml,/);
  env.fire('window', 'pagehide');
  env.fire('window', 'pageshow', { persisted: true });
  assert.equal(env.properties.get('--grain-url'), grain);
  assert.equal(env.resources.size, 0);
});

test('object URL allocation failure keeps the appearance available', () => {
  const env = setup();
  env.window.URL.createObjectURL = () => { throw new Error('allocation unavailable'); };
  env.choose('paper');
  assert.match(env.properties.get('--grain-url'), /^url\("data:image\/svg\+xml,/);
  assert.equal(env.resources.size, 0);
});

test('duplicate restore notifications do not allocate another image set', () => {
  const env = setup();
  env.fire('window', 'pagehide', { persisted: true });
  env.fire('window', 'pageshow', { persisted: true });
  const urls = [...env.resources.keys()];
  env.fire('window', 'pageshow', { persisted: true });
  assert.deepEqual([...env.resources.keys()], urls);
});

module.exports = { setup };
