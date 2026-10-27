import {uid,empty,bristol,safeJournal} from './model.mjs';
const text=v=>v==null?'':v instanceof Date?v.toISOString():typeof v==='object'?(v.text||v.result||v.richText?.map(x=>x.text).join('')||''):String(v);
const dateValue=v=>v instanceof Date?`${v.getUTCFullYear()}-${String(v.getUTCMonth()+1).padStart(2,'0')}-${String(v.getUTCDate()).padStart(2,'0')}`:String(v||'').slice(0,10);
function timeValue(v){if(v instanceof Date)return {time:`${String(v.getUTCHours()).padStart(2,'0')}:${String(v.getUTCMinutes()).padStart(2,'0')}`,originalTime:''};if(typeof v==='number'&&v>0&&v<1){const m=Math.round(v*1440);return {time:`${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`,originalTime:''};}const s=text(v);return /^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(s)?{time:s.slice(0,5),originalTime:''}:{time:'',originalTime:s};}
export async function readImport(file){
 if(file.size>10*1024*1024)throw Error('Choose a file smaller than 10 MB.');
 if(file.name.endsWith('.json'))return {journal:safeJournal(JSON.parse(await file.text())),warnings:[],backup:true};
 if(!/\.xlsx$/i.test(file.name))throw Error('Choose an .xlsx workbook or a Vigil Journal JSON backup.');
 const ExcelJS=(await import('exceljs')).default,w=new ExcelJS.Workbook();await w.xlsx.load(await file.arrayBuffer());const j=empty(),warnings=[];
 const normalized=w.getWorksheet('Entries');
 if(normalized){const headers=normalized.getRow(1).values.slice(1);for(let i=2;i<=normalized.rowCount;i++){const row=normalized.getRow(i);if(!row.getCell(1).value)continue;const e={};headers.forEach((h,k)=>{let v=row.getCell(k+1).value;if(v!==null)e[h]=['tags'].includes(h)?String(v).split(',').map(s=>s.trim()).filter(Boolean):v;});e.id=uid();e.date=dateValue(e.date);e.time=text(e.time);j.entries.push(e);}const days=w.getWorksheet('Daily rhythm');if(days)for(let i=2;i<=days.rowCount;i++){const r=days.getRow(i);if(r.getCell(1).value)j.days[dateValue(r.getCell(1).value)]={wake:text(r.getCell(2).value),sleep:text(r.getCell(3).value),reflection:text(r.getCell(4).value)};}return {journal:safeJournal(j),warnings};}
 for(const s of w.worksheets){if(!text(s.getCell('B7').value).toLowerCase().includes('meal'))continue;const date=dateValue(s.getCell('C5').value);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){warnings.push(`${s.name}: date is missing. This sheet was skipped.`);continue;}
  j.settings.name=text(s.getCell('C4').value);j.days[date]={wake:timeValue(s.getCell('G4').value).time,sleep:timeValue(s.getCell('G5').value).time};
  for(let r=8;r<=s.rowCount;r++){if(text(s.getCell(r,2).value).includes('Bristol Stool Scale'))break;const vals=Array.from({length:6},(_,k)=>text(s.getCell(r,k+3).value));if(!vals.some(Boolean))continue;
   const [foods,drinks,supplements,moodNotes,movement,digestion]=vals,t=timeValue(s.getCell(r,2).value),match=digestion.match(/Bristol\s*#?\s*([1-7])/i);
   if(t.originalTime)warnings.push(`Row ${r}: “${t.originalTime}” needs a time review. Original text is retained.`);
   j.entries.push({id:uid(),date,...t,foods,drinks,supplements,moodNotes,movement,digestion,type:foods?'food':drinks?'drink':supplements?'supplement':movement?'movement':digestion?'digestion':'mood',bristol:match?Number(match[1]):null,title:'',tags:['Imported'],updatedAt:new Date().toISOString()});
  }
 }
 if(!j.entries.length)throw Error('No journal rows were found. Use the original Journal Template or a Vigil Journal export.');return {journal:j,warnings};
}
export function download(name,content,type='application/json'){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
export const fields=['id','date','time','originalTime','type','title','foods','drinks','supplements','moodNotes','mood','energy','hunger','fullness','movement','digestion','bristol','water','tags','notes','updatedAt'];
export async function exportFile(journal,format){
 if(format==='json')return download('FM-Journal-backup.json',JSON.stringify(journal,null,2));
 if(format==='csv'){const esc=v=>{let s=Array.isArray(v)?v.join(', '):String(v??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};return download('FM-Journal-entries.csv',[fields.join(','),...journal.entries.map(e=>fields.map(k=>esc(e[k])).join(','))].join('\r\n'),'text/csv');}
 const ExcelJS=(await import('exceljs')).default,w=new ExcelJS.Workbook();w.creator='VigilTech';const s=w.addWorksheet('Entries');s.addRow(fields);for(const e of journal.entries)s.addRow(fields.map(k=>Array.isArray(e[k])?e[k].join(', '):e[k]??''));s.columns.forEach(c=>c.width=24);s.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};s.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF234B3A'}};s.views=[{state:'frozen',ySplit:1}];
 const d=w.addWorksheet('Daily rhythm');d.addRow(['date','wake','sleep','reflection']);Object.entries(journal.days).sort().forEach(([date,v])=>d.addRow([date,v.wake,v.sleep,v.reflection]));d.columns.forEach(c=>c.width=30);
 const ref=w.addWorksheet('Bristol reference');ref.addRow(['Type','Description']);bristol.forEach((v,i)=>ref.addRow([i+1,v]));ref.getColumn(2).width=65;
 download('FM-Journal.xlsx',await w.xlsx.writeBuffer(),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
