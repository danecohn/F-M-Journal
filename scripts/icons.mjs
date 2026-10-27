// Copy canonical Cohnsoft icons unchanged; no raster resampling or logo redraws.
import {mkdir,copyFile} from 'node:fs/promises';
const root='public/brand/cohnsoft/icons/';await mkdir('build',{recursive:true});
for(const [from,to]of [['apple-touch-icon.png','public/icon-180.png'],['icon-256.png','public/icon-192.png'],['icon-512.png','public/icon-512.png'],['icon-512.png','build/icon.png'],['cohnsoft.ico','build/icon.ico'],['cohnsoft.icns','build/icon.icns']])await copyFile(root+from,to);
