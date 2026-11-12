import {config,equal,token,authorized,decrypt} from '../lib/archive.js';
const failures=new Map();
const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));};
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('X-Content-Type-Options','nosniff');
 const url=new URL(req.url,'http://localhost'),action=url.searchParams.get('action')||'list';
 try{
  config();
  if(req.method==='POST'){
   const origin=req.headers.origin;if(!origin||new URL(origin).host!==req.headers.host)return json(res,403,{error:'Richiesta non consentita.'});
   if(action==='logout'){res.setHeader('Set-Cookie','casa_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'+(process.env.VERCEL?'; Secure':''));return json(res,200,{ok:true});}
   if(action!=='login')return json(res,405,{error:'Metodo non consentito.'});
   // Limite aggiuntivo per istanza; la password predefinita è casuale a 144 bit.
   const ip=req.headers['x-forwarded-for']?.split(',')[0]||req.socket?.remoteAddress||'unknown',now=Date.now();
   const entry=failures.get(ip);if(entry&&entry.until>now&&entry.count>=10){res.setHeader('Retry-After','900');return json(res,429,{error:'Troppi tentativi. Riprova tra 15 minuti.'});}
   let body=req.body;
   if(body===undefined){let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>4096)return json(res,413,{error:'Richiesta troppo grande.'});chunks.push(chunk);}body=JSON.parse(Buffer.concat(chunks).toString()||'{}');}
   if(typeof body==='string')body=JSON.parse(body);
   if(typeof body?.password!=='string'||body.password.length>256||!equal(body.password,config().password)){
    if(failures.size>1000)for(const [k,v]of failures)if(v.until<now)failures.delete(k);
    failures.set(ip,{count:entry&&entry.until>now?entry.count+1:1,until:now+900000});return json(res,401,{error:'Password non corretta.'});
   }
   failures.delete(ip);res.setHeader('Set-Cookie',`casa_session=${token()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${process.env.VERCEL?'; Secure':''}`);return json(res,200,{ok:true});
  }
  if(req.method!=='GET')return json(res,405,{error:'Metodo non consentito.'});
  if(!authorized(req))return json(res,401,{error:'Accedi per consultare l’archivio.'});
  if(action==='list')return json(res,200,{documents:JSON.parse((await decrypt('catalog')).toString())});
  if(action==='file'){
   const id=url.searchParams.get('id');if(!/^p\d{3}$/.test(id||''))return json(res,404,{error:'Documento non trovato.'});
   let b;try{b=await decrypt(id);}catch{return json(res,404,{error:'Documento non trovato.'});}
   res.setHeader('Content-Type','image/webp');res.setHeader('Content-Disposition',`${url.searchParams.get('download')==='1'?'attachment':'inline'}; filename="documento-${id}.webp"`);return res.end(b);
  }
  return json(res,404,{error:'Risorsa non trovata.'});
 }catch(e){return json(res,e.message==='CONFIG'?503:500,{error:e.message==='CONFIG'?'Archivio da configurare: aggiungi le due variabili di ambiente su Vercel.':'Impossibile aprire l’archivio. Controlla la chiave e i file cifrati.'});}
}
