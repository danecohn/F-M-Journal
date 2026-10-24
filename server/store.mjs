import {randomBytes,createCipheriv,createDecipheriv,createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,renameSync,existsSync,unlinkSync,accessSync,constants} from 'node:fs';
import {join} from 'node:path';
export const emptyJournal=()=>({entries:[],days:{},templates:[],settings:{name:'',waterGoal:2000,theme:'dark'}});
export function validateJournal(value){
 if(!value||typeof value!=='object'||!Array.isArray(value.entries)||value.entries.length>20000||!Array.isArray(value.templates)||value.templates.length>200)throw Error('Invalid journal. Limit: 20,000 entries and 200 saved entries.');
 if(!value.days||typeof value.days!=='object'||Array.isArray(value.days)||!value.settings||typeof value.settings!=='object')throw Error('Missing daily rhythm or preferences.');
 if(typeof value.settings.name!=='string'||value.settings.name.length>100||!Number.isFinite(value.settings.waterGoal)||value.settings.waterGoal<250||value.settings.waterGoal>10000||!['dark','light'].includes(value.settings.theme))throw Error('Invalid journal preferences.');
 for(const [date,day]of Object.entries(value.days))if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!day||typeof day!=='object'||['wake','sleep','reflection'].some(k=>day[k]!==undefined&&(typeof day[k]!=='string'||day[k].length>12000)))throw Error('Invalid daily rhythm.');
 const ids=new Set();
 for(const e of value.entries){
  if(!e||typeof e.id!=='string'||e.id.length>100||ids.has(e.id)||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||!['food','drink','mood','movement','digestion','supplement'].includes(e.type))throw Error('Invalid or duplicate journal entry.');
  ids.add(e.id);
  if(!Number.isFinite(Date.parse(e.date+'T12:00:00Z'))||e.time&& !/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time))throw Error('Choose a valid journal date and time.');
  if(e.tags!==undefined&&(!Array.isArray(e.tags)||e.tags.length>40||e.tags.some(t=>typeof t!=='string'||t.length>100)))throw Error('Use up to 40 short text tags.');
  for(const k of ['foods','drinks','supplements','moodNotes','movement','digestion','notes','title','time','originalTime'])if(e[k]!==undefined&&(typeof e[k]!=='string'||e[k].length>12000))throw Error('Entry text is too long.');
  for(const k of ['mood','energy','hunger','fullness'])if(e[k]!==null&&e[k]!==undefined&&(!Number.isFinite(e[k])||e[k]<1||e[k]>5))throw Error('Ratings must be from 1 to 5.');
  if(e.bristol!=null&&(!Number.isInteger(e.bristol)||e.bristol<1||e.bristol>7))throw Error('Bristol type must be from 1 to 7.');
  if(e.water!=null&&(!Number.isFinite(e.water)||e.water<0||e.water>10000))throw Error('Water must be between 0 and 10,000 mL per entry.');
 }
 for(const e of value.templates)if(!e||typeof e.id!=='string'||!['food','drink','mood','movement','digestion','supplement'].includes(e.type)||['foods','drinks','title','supplements','moodNotes','movement','digestion'].some(k=>e[k]!==undefined&&typeof e[k]!=='string')||e.tags!==undefined&&(!Array.isArray(e.tags)||e.tags.some(t=>typeof t!=='string')))throw Error('Invalid saved entry.');
 if(Buffer.byteLength(JSON.stringify(value))>5*1024*1024)throw Error('Journal exceeds the 5 MB limit. Export and archive older entries.');
 return value;
}
export function createStore(dir,keyHex){
 if(!/^[a-f0-9]{64}$/i.test(keyHex||''))throw Error('Set DATA_ENCRYPTION_KEY to 32 random bytes encoded as 64 hexadecimal characters.');
 mkdirSync(dir,{recursive:true,mode:0o700});accessSync(dir,constants.W_OK);const key=Buffer.from(keyHex,'hex');
 const file=user=>join(dir,createHash('sha256').update(user).digest('hex')+'.enc');
 function read(user){const p=file(user);if(!existsSync(p))return {revision:0,journal:emptyJournal()};const b=readFileSync(p),dec=createDecipheriv('aes-256-gcm',key,b.subarray(0,12));dec.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([dec.update(b.subarray(28)),dec.final()]).toString());}
 function write(user,journal,revision){validateJournal(journal);const previous=read(user);if(previous.revision!==revision)throw Object.assign(Error('This journal changed on another device. Export your local copy before loading the cloud version.'),{status:409});const value={revision:revision+1,journal,updatedAt:new Date().toISOString()},iv=randomBytes(12),enc=createCipheriv('aes-256-gcm',key,iv);const encrypted=Buffer.concat([enc.update(JSON.stringify(value)),enc.final()]);const temp=file(user)+'.tmp';writeFileSync(temp,Buffer.concat([iv,enc.getAuthTag(),encrypted]),{mode:0o600});renameSync(temp,file(user));return value;}
 function readAccess(){const p=join(dir,'access.enc');if(!existsSync(p))return [];const b=readFileSync(p),d=createDecipheriv('aes-256-gcm',key,b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([d.update(b.subarray(28)),d.final()]).toString());}
 function writeAccess(value){const iv=randomBytes(12),e=createCipheriv('aes-256-gcm',key,iv),b=Buffer.concat([e.update(JSON.stringify(value)),e.final()]),p=join(dir,'access.enc');writeFileSync(p+'.tmp',Buffer.concat([iv,e.getAuthTag(),b]),{mode:0o600});renameSync(p+'.tmp',p);}
 return {read,write,readAccess,writeAccess,remove(user){if(existsSync(file(user)))unlinkSync(file(user));}};
}
