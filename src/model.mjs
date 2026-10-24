export const types={food:{label:'Food',color:'#dbf9ad'},drink:{label:'Drink',color:'#a8d6f9'},mood:{label:'Mood',color:'#d3b9f8'},movement:{label:'Movement',color:'#f3c89d'},digestion:{label:'Digestion',color:'#e6beac'},supplement:{label:'Supplements',color:'#c9d2e0'}};
export const bristol=['Separate hard lumps, difficult to pass','Sausage-shaped, but lumpy','Like a sausage with cracks on its surface','Like a sausage or snake, smooth and soft','Soft blobs with clear-cut edges','Fluffy pieces with ragged edges; mushy','Watery, no solid pieces; entirely liquid'];
export const dayKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const parseDay=s=>new Date(s+'T12:00:00');
export const empty=()=>({entries:[],days:{},templates:[],settings:{name:'',waterGoal:2000,theme:'dark'}});
export const uid=()=>crypto.randomUUID();
export const average=a=>a.length?a.reduce((s,n)=>s+n,0)/a.length:null;
export const moodNames=['','Very low','Low','Steady','Good','Great'];
export function sleepHours(day){if(!day?.wake||!day?.sleep)return null;const min=s=>Number(s.split(':')[0])*60+Number(s.split(':')[1]);return ((min(day.wake)-min(day.sleep)+1440)%1440)/60;}
export function entryTitle(e){return e.title||e.foods||e.drinks||e.moodNotes||e.movement||e.supplements||e.digestion||types[e.type]?.label||'Journal entry';}
export function stats(entries,day){return {mood:average(entries.map(e=>e.mood).filter(Boolean)),energy:average(entries.map(e=>e.energy).filter(Boolean)),water:entries.reduce((s,e)=>s+(Number(e.water)||0),0),sleep:sleepHours(day),meals:entries.filter(e=>e.foods).length};}
export function demo(){const j=empty();j.settings.name='Alex';for(let n=0;n<14;n++){const d=new Date();d.setDate(d.getDate()-n);const date=dayKey(d);j.days[date]={wake:'06:45',sleep:n%3?'23:00':'22:30',reflection:n===0?'A slower morning made room for a better day.':''};
 const make=(type,time,data)=>j.entries.push({id:uid(),date,time,type,...data,updatedAt:new Date().toISOString()});
 make('food','08:15',{title:'A good start',foods:'Greek yogurt, blueberries & toasted oats',drinks:'Coffee with oat milk',mood:n%3+3,energy:4,hunger:3,fullness:4,tags:['At home','Unhurried']});
 make('drink','09:30',{title:'A moment to hydrate',drinks:'Water',water:500});
 make('movement','10:45',{title:'A little fresh air',movement:'25-minute walk outside',mood:4,energy:4,tags:['Outdoors']});
 if(n>0){make('food','12:30',{title:'Lunch, away from my screen',foods:'Roasted vegetables, rice and chicken',water:350,mood:4,energy:3});make('digestion','14:00',{title:'Afternoon check-in',digestion:'Comfortable',bristol:4});make('mood','19:00',{title:'Winding down',mood:n%2+3,energy:3,moodNotes:'A full day. Feeling settled.'});}}
 return j;}
export function trend(journal,days=7){const now=new Date();return Array.from({length:days},(_,i)=>{const d=new Date(now);d.setDate(d.getDate()-(days-i-1));const date=dayKey(d);return {date,label:d.toLocaleDateString(undefined,{weekday:'short'}),...stats(journal.entries.filter(e=>e.date===date),journal.days[date])};});}
export function safeJournal(v){if(!v||!Array.isArray(v.entries)||v.entries.length>20000||!v.days||!Array.isArray(v.templates)||!v.settings)throw Error('This is not an F&M Journal backup.');for(const e of v.entries)if(!e.id||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||!types[e.type])throw Error('The backup contains invalid entries.');return v;}
