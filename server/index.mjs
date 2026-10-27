import express from 'express';
import {randomBytes,createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createStore,validateJournal} from './store.mjs';
import {mountMcp} from './mcp.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex'),token=()=>randomBytes(32).toString('base64url');
export function createApp(options={}){
 const env=options.env||process.env,net=options.fetch||fetch,desktop=!!options.cloudProxy;
 const store=desktop?null:createStore(env.DATA_DIR||'data',env.DATA_ENCRYPTION_KEY);
 const app=express(),sessions=new Map(),pairings=new Map(),busy=new Set(),limits=new Map();
 const origin=()=>options.origin||env.PUBLIC_ORIGIN||'http://localhost:3104',social=env.SOCIAL_ORIGIN||'https://www.amerika.social';
 const base=(env.PUBLIC_BASE_PATH||'').replace(/\/$/,'');if(base&&!/^\/[a-z][a-z0-9-]*$/.test(base))throw Error('Invalid PUBLIC_BASE_PATH');
 const allowedOrigins=new Set([new URL(origin()).origin,...(base?['https://fmjournal-production.up.railway.app']:[])]);
 const cookie=(req,name)=>(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1)||'';
 const cookieStr=(name,value,age)=>`${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${origin().startsWith('https:')?'; Secure':''}`;
 const fail=(s,message)=>{throw Object.assign(Error(message),{status:s})};
 app.disable('x-powered-by');
 app.use((req,res,next)=>{if(base&&(req.url===base||req.url.startsWith(base+'/')||req.url.startsWith(base+'?')))req.url=req.url.slice(base.length)||'/';next();});
 app.use((req,res,next)=>{
  res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"});
  if(req.path.startsWith('/api/'))res.set('Cache-Control','no-store');
  if(!req.path.startsWith('/mcp')&&!['GET','HEAD','OPTIONS'].includes(req.method)&&!allowedOrigins.has(req.headers.origin))return res.status(403).json({error:'Request origin rejected.'});
  if(req.path.startsWith('/mcp')&&req.headers.origin&&!allowedOrigins.has(req.headers.origin))return res.status(403).json({error:'MCP origin rejected.'});
  if(req.path.startsWith('/api/auth/')){const ip=req.socket.remoteAddress,now=Date.now();for(const[k,v]of limits)if(v.until<now)limits.delete(k);const r=limits.get(ip)||{n:0,until:now+60000};limits.set(ip,r);if(++r.n>60)return res.status(429).json({error:'Please wait a minute before trying again.'});}
  next();
 });
 if(desktop){
  app.use('/api',express.raw({type:()=>true,limit:'6mb'}),async(req,res)=>{try{
   const headers={'content-type':req.headers['content-type']||'application/json','origin':options.cloudProxy};if(req.headers.cookie)headers.cookie=req.headers.cookie;
   const r=await net(options.cloudProxy+'/api'+req.url,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:req.body,redirect:'manual',signal:AbortSignal.timeout(20000)});
   for(const c of r.headers.getSetCookie())res.append('Set-Cookie',c.replace(/;\s*Secure/ig,''));
   res.status(r.status).type(r.headers.get('content-type')||'application/json').send(Buffer.from(await r.arrayBuffer()));
  }catch{res.status(503).json({error:'Cloud connection unavailable. Your journal stays on this device until you reconnect.'});}});
 }else{
  app.use(express.json({limit:'6mb'}));
  const user=req=>{const h=hash(cookie(req,'fm_session')),s=sessions.get(h);if(!s||s.expires<Date.now()){sessions.delete(h);return null;}return s.user;};
  const required=req=>user(req)||fail(401,'Connect your VigilTech account to sync.');
  const call=async(path,data)=>{const r=await net(social+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(15000)});const v=await r.json();if(!r.ok)fail(502,'VigilTech sign-in is unavailable. Try again shortly.');return v;};
  app.get('/api/me',(req,res)=>res.json({user:user(req),product:'Vigil Journal'}));
  app.post('/api/auth/start',async(req,res)=>{
   const now=Date.now();for(const[k,v]of pairings)if(v.expires<now)pairings.delete(k);for(const[k,v]of sessions)if(v.expires<now)sessions.delete(k);
   if(pairings.size>1000)fail(429,'Sign-in is busy. Try again shortly.');
   const verifier=randomBytes(48).toString('base64url'),challenge=createHash('sha256').update(verifier).digest('base64url'),r=await call('desktop/start',{challenge});
   if(typeof r.id!=='string')fail(502,'Invalid sign-in response.');const state=token();pairings.set(hash(state),{id:r.id,verifier,expires:now+300000});
   res.set('Set-Cookie',cookieStr('fm_pair',state,300)).json({url:social+'/desktop-connect#'+encodeURIComponent(r.id)});
  });
  app.post('/api/auth/poll',async(req,res)=>{
   const state=hash(cookie(req,'fm_pair')),p=pairings.get(state);if(!p||p.expires<Date.now())fail(400,'Sign-in expired. Please start again.');if(busy.has(state))return res.json({pending:true});busy.add(state);
   try{const r=await call('desktop/exchange',{id:p.id,verifier:p.verifier});if(r.pending)return res.json({pending:true});if(!r.actor?.id||!r.actor?.handle||!r.token)fail(502,'Invalid account response.');
    const revoke=await net(social+'/api/logout',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+r.token},body:'{}',signal:AbortSignal.timeout(15000)});if(!revoke.ok)fail(502,'Could not finish sign-in. Try again.');
    const s=token(),account={id:r.actor.id,name:r.actor.name||r.actor.handle,handle:r.actor.handle};sessions.set(hash(s),{user:account,expires:Date.now()+7*86400000});pairings.delete(state);
    res.set('Set-Cookie',[cookieStr('fm_session',s,604800),cookieStr('fm_pair','',0)]).json({user:account});
   }finally{busy.delete(state);}
  });
  app.post('/api/logout',(req,res)=>{sessions.delete(hash(cookie(req,'fm_session')));res.set('Set-Cookie',cookieStr('fm_session','',0)).json({ok:true});});
  app.get('/api/journal',(req,res)=>res.json(store.read(required(req).id)));
  app.put('/api/journal',(req,res)=>{const u=required(req);if(!Number.isInteger(req.body.revision)||req.body.revision<0)fail(400,'Invalid journal revision.');try{validateJournal(req.body.journal);}catch(e){fail(400,e.message);}res.json(store.write(u.id,req.body.journal,req.body.revision));});
  app.delete('/api/journal',(req,res)=>{const u=required(req);if(req.body?.confirmation!=='DELETE MY JOURNAL')fail(400,'Type DELETE MY JOURNAL to confirm.');store.remove(u.id);res.json({ok:true});});
  mountMcp(app,{store,required,origin});
 }
 app.get('/healthz',(req,res)=>res.json({ok:true,product:'Vigil Journal',version:'1.0.0'}));
 const root=options.staticDir||resolve('dist');
 const index=(req,res)=>{if(!existsSync(join(root,'index.html')))return res.status(503).send('Build the client first.');let html=readFileSync(join(root,'index.html'),'utf8');if(base)html=html.replace(/(href|src)="\/(?!\/)/g,'$1="'+base+'/').replace('<head>','<head><base href="'+base+'/"><meta name="vigil-base" content="'+base+'">');res.type('html').send(html);};
 app.get(['/','/index.html'],index);
 app.get('/manifest.webmanifest',(req,res,next)=>{if(!base)return next();const m=JSON.parse(readFileSync(join(root,'manifest.webmanifest'),'utf8'));m.start_url=base+'/';m.scope=base+'/';for(const i of m.icons||[])if(i.src?.startsWith('/'))i.src=base+i.src;res.type('application/manifest+json').send(m);});
 app.use(express.static(root,{maxAge:0,index:false}));
 app.get('/downloads',async(req,res)=>{
  // Links are shown only for assets that actually exist in the public release.
  try{const r=await net('https://api.github.com/repos/danecohn/F-M-Journal/releases/latest',{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(10000)});if(!r.ok)return res.json({release:null,assets:[]});const v=await r.json();res.json({release:v.tag_name,url:v.html_url,assets:v.assets.map(a=>({name:a.name,url:a.browser_download_url,size:a.size}))});}catch{res.status(503).json({error:'Downloads are temporarily unavailable.'});}
 });
 app.get('/{*path}',(req,res)=>{if(req.path.startsWith('/api/'))return res.status(404).json({error:'Endpoint not found.'});if(!existsSync(join(root,'index.html')))return res.status(503).send('Build the client first.');index(req,res);});
 app.use((e,req,res,next)=>res.status(e.status||500).json({error:e.status?e.message:'Something went wrong. Your saved journal is unchanged.'}));
 return {app,store,sessions,close(){sessions.clear();pairings.clear();}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||3104),{app}=createApp();app.listen(port,'0.0.0.0',()=>console.log(`Vigil Journal listening on ${port}`));
}
