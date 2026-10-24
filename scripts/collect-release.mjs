import {readdir,mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [os,arch]=process.argv.slice(2);await mkdir('release-files',{recursive:true});let count=0;
for(const name of await readdir('release'))if(name.startsWith(`FMJournal-${os}-${arch}.`)&&/\.(exe|dmg|deb|AppImage)$/.test(name)){await copyFile('release/'+name,'release-files/'+name);const sum=createHash('sha256').update(await readFile('release/'+name)).digest('hex');await writeFile('release-files/'+name+'.sha256',sum+'  '+name+'\n');count++;}
if(!count)throw Error('No matching installer was produced.');
