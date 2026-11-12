import {readdir,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
for(const f of ['index.html','app.js','style.css'])assert((await readFile('public/'+f)).length>0);
const vault=await readdir('vault');assert(vault.includes('catalog.bin'),'Catalogo cifrato mancante');assert.equal(vault.filter(f=>/^p\d{3}\.bin$/.test(f)).length,46);
console.log('Build verificata: interfaccia, catalogo cifrato e 46 pagine presenti.');
