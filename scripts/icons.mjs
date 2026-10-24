import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
await mkdir('build',{recursive:true});const svg=await readFile('public/mark.svg');
for(const size of [180,192,512])await writeFile(`public/icon-${size}.png`,await sharp(svg).resize(size,size).png().toBuffer());
const png=await sharp(svg).resize(1024,1024).png().toBuffer();await writeFile('build/icon.png',png);
await writeFile('build/icon.ico',await pngToIco(await sharp(svg).resize(256,256).png().toBuffer()));
const chunks=[];for(const[type,size]of[['ic07',128],['ic08',256],['ic09',512],['ic10',1024]]){const b=await sharp(svg).resize(size,size).png().toBuffer(),h=Buffer.alloc(8);h.write(type);h.writeUInt32BE(b.length+8,4);chunks.push(h,b);}const h=Buffer.alloc(8);h.write('icns');h.writeUInt32BE(8+chunks.reduce((n,b)=>n+b.length,0),4);await writeFile('build/icon.icns',Buffer.concat([h,...chunks]));
