import {readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const assets=['/','/index.html','/mark.svg','/Inter.woff2','/manifest.webmanifest',...(await readdir('dist/assets')).map(n=>'/assets/'+n)];
const version='fm-'+createHash('sha256').update(assets.join('|')).digest('hex').slice(0,12);
await writeFile('dist/sw.js',`const CACHE=${JSON.stringify(version)},FILES=${JSON.stringify(assets)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('fm-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/api/')||u.pathname.startsWith('/mcp')||u.pathname==='/downloads'||u.pathname==='/healthz')return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).catch(()=>event.request.mode==='navigate'?caches.match('/'):Response.error())));});`);
