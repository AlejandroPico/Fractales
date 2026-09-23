import { copyFile, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const dist = new URL('../dist/', import.meta.url);
await copyFile(new URL('index.html', dist), new URL('404.html', dist));

async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = `${prefix}${entry.name}`;
    return entry.isDirectory()
      ? listFiles(new URL(`${entry.name}/`, directory), `${path}/`)
      : [path];
  }));
  return nested.flat();
}

const base = '/Fractales/';
const files = (await listFiles(dist))
  .filter((path) => path !== '404.html' && path !== 'service-worker.js');
const assets = files.map((path) => `${base}${path}`);
const hash = createHash('sha256');
for (const path of files) {
  hash.update(path).update(await readFile(new URL(path, dist)));
}
const version = hash.digest('hex').slice(0, 12);
const worker = `const CACHE = 'fractales-${version}';
const SCOPE = ${JSON.stringify(base)};
const ASSETS = ${JSON.stringify(assets)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('fractales-') && key !== CACHE).map((key) => caches.delete(key)))),
    self.clients.claim()
  ]));
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match(SCOPE + 'index.html')) || Response.error();
    }));
    return;
  }

  if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
  }
});
`;
await writeFile(new URL('service-worker.js', dist), worker);
