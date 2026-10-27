// Copy the VigilTech Journal icon kit unchanged; no raster resampling or logo redraws.
import {mkdir,copyFile} from 'node:fs/promises';
const root='public/brand/vigiltech/icons/';await mkdir('build',{recursive:true});
for(const [from,to]of [['apple-touch-icon.png','public/icon-180.png'],['icon-192.png','public/icon-192.png'],['icon-512.png','public/icon-512.png'],['maskable-512.png','public/maskable-512.png'],['favicon.ico','public/favicon.ico'],['favicon-32.png','public/favicon-32.png'],['journal-512.png','build/icon.png'],['journal.ico','build/icon.ico'],['journal.icns','build/icon.icns']])await copyFile(root+from,to);
