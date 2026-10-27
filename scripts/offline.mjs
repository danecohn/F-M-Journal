import {readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
async function brandFiles(folder){const result=[];for(const e of await readdir(folder,{withFileTypes:true})){const path=folder+'/'+e.name;if(e.isDirectory())result.push(...await brandFiles(path));else if(/\.(?:css|woff2|svg|png)$/.test(e.name))result.push('/'+path.slice(5));}return result;}
const assets=['/','/index.html','/mark.svg','/favicon.ico','/favicon-32.png','/manifest.webmanifest','/icon-180.png','/icon-192.png','/icon-512.png','/maskable-512.png',...(await brandFiles('dist/brand/vigiltech')),...(await readdir('dist/assets')).map(n=>'/assets/'+n)];
const version='fm-path-v2-'+createHash('sha256').update(assets.join('|')).digest('hex').slice(0,12);
await writeFile('dist/sw.js',`const CACHE=${JSON.stringify(version)},FILES=${JSON.stringify(assets)};
const ROOT=new URL('./',self.location.href),URLS=FILES.map(p=>new URL(p.replace(/^\\//,''),ROOT).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(URLS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('fm-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url),p=u.pathname.slice(ROOT.pathname.length-1);if(event.request.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith(ROOT.pathname)||p.startsWith('/api/')||p.startsWith('/mcp')||p==='/downloads'||p==='/healthz')return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).catch(()=>event.request.mode==='navigate'?caches.match(ROOT.href):Response.error())));});`);
