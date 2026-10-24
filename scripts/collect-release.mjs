import {readdir,mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [os,arch]=process.argv.slice(2);await mkdir('release-files',{recursive:true});let count=0;const seen=new Set();
// Electron-builder uses x86_64 for AppImage and amd64 for deb, even for the same x64 job.
for(const source of await readdir('release'))if(source.startsWith('FMJournal-')&&/\.(exe|dmg|deb|AppImage)$/.test(source)){const ext=source.split('.').at(-1);if(seen.has(ext))throw Error('More than one installer of the same type was produced.');seen.add(ext);const name=`FMJournal-${os}-${arch}.${ext}`;await copyFile('release/'+source,'release-files/'+name);const sum=createHash('sha256').update(await readFile('release/'+source)).digest('hex');await writeFile('release-files/'+name+'.sha256',sum+'  '+name+'\n');count++;}
if(!count)throw Error('No matching installer was produced.');
