import {createDecipheriv,createHmac,createHash,timingSafeEqual} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
export function config(){
 const key=process.env.ARCHIVE_KEY,password=process.env.ARCHIVE_PASSWORD;
 if(!/^[a-f0-9]{64}$/i.test(key||'')||!password||password.length<12)throw new Error('CONFIG');
 return {key:Buffer.from(key,'hex'),password};
}
export function equal(a,b){return timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());}
function signature(value){const {key,password}=config();return createHmac('sha256',key).update(password+'|'+value).digest('hex');}
export function token(){const exp=String(Date.now()+8*60*60*1000);return exp+'.'+signature(exp);}
export function authorized(req){try{const value=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('casa_session='))?.slice(13);if(!value)return false;const [exp,sig]=value.split('.');return /^\d{13}$/.test(exp)&&Number(exp)>Date.now()&&Number(exp)<=Date.now()+8*60*60*1000&&equal(sig||'',signature(exp));}catch{return false;}}
export async function decrypt(id){if(!/^(catalog|p\d{3})$/.test(id))throw new Error('NOT_FOUND');const b=await readFile(path.join(process.cwd(),'vault',id+'.bin'));const c=createDecipheriv('aes-256-gcm',config().key,b.subarray(0,12));c.setAuthTag(b.subarray(12,28));return Buffer.concat([c.update(b.subarray(28)),c.final()]);}

