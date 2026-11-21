import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync as read } from 'node:fs';
const source = file => read(new URL(file, import.meta.url), 'utf8');

test('all element IDs referenced by UI exist in HTML', () => {
  const js = source('../four-square/app.mjs');
  const html = source('../four-square/index.html');
  const ids = [...js.matchAll(/\$\('([a-z-]+)'\)/g)].map(m => m[1]);
  const absent = [...new Set(ids)].filter(id => !html.includes(`id="${id}"`));
  assert.deepEqual(absent, []);
});

test('mobile UI, telegram bridge and standalone PWA files', () => {
  const html=source('../four-square/index.html');
  const app=source('../four-square/app.mjs');
  const css=source('../four-square/style.css');
  const manifest=JSON.parse(source('../four-square/manifest.webmanifest'));
  assert.match(html, /telegram-web-app\.js/);
  assert.match(html, /type="module" src="\.\/app\.mjs"/);
  assert.match(app, /tg\?\.ready\?\./);
  assert.match(app, /tg\?\.expand\?\./);
  assert.match(app, /visibilitychange/);
  assert.match(css, /@media\(max-width:475px\)/);
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.lang, 'ru');
});