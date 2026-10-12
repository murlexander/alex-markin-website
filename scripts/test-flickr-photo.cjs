const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = readFileSync(path.join(__dirname, '../site.js'), 'utf8');
const photos = JSON.parse(readFileSync(path.join(__dirname, '../flickr-photos.json'), 'utf8'));

async function run({ random = 0, data = photos, ok = true, offline = false } = {}) {
  const title = { textContent: 'fallback' };
  const links = [{ href: 'fallback' }, { href: 'fallback' }];
  const image = { src: 'flickr-photo.jpg', alt: 'fallback', closest: () => ({
    querySelector: () => title, querySelectorAll: () => links
  }) };
  const previews = [], calls = [];
  vm.runInNewContext(source, {
    document: { querySelectorAll: () => [],
      querySelector: selector => selector === '[data-flickr-photo]' ? image : null,
      documentElement: { getAttribute: () => null } },
    window: {}, Math: Object.assign(Object.create(Math), { random: () => random }),
    Image: function () { previews.push(this); },
    fetch: (url, options) => { calls.push({ url, options }); return offline ? Promise.reject(Error('offline'))
      : Promise.resolve({ ok, json: async () => data }); }
  });
  await new Promise(setImmediate);
  return { image, title, links, previews, calls };
}

test('every photo in the full manifest can be selected with matching metadata', async () => {
  for (let i = 0; i < photos.length; i++) {
    const result = await run({ random: (i + 0.5) / photos.length });
    assert.equal(result.image.src, 'flickr-photo.jpg');
    assert.equal(result.previews[0].src, photos[i].src);
    result.previews[0].onload();
    assert.equal(result.image.src, photos[i].src);
    assert.equal(result.image.alt, photos[i].title);
    assert.equal(result.title.textContent, photos[i].title);
    assert.equal(result.image.width, photos[i].width);
    assert.equal(result.image.height, photos[i].height);
    for (const link of result.links) assert.equal(link.href, photos[i].href);
    assert.equal(result.calls.length, 1);
    assert.equal(result.calls[0].url, 'flickr-photos.json');
    assert.equal(result.calls[0].options.cache, 'no-cache');
  }
});

test('failed manifest and failed image loads retain the authored fallback', async () => {
  for (const options of [{ offline: true }, { ok: false }, { data: [] }, { data: null }, {}]) {
    const result = await run(options);
    assert.equal(result.image.src, 'flickr-photo.jpg');
    assert.equal(result.title.textContent, 'fallback');
    for (const link of result.links) assert.equal(link.href, 'fallback');
  }
});
