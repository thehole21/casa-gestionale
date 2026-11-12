import http from 'node:http';
import {readFile} from 'node:fs/promises';
import handler from './api/archive.js';
const types={'/':'text/html; charset=utf-8','/index.html':'text/html; charset=utf-8','/app.js':'text/javascript; charset=utf-8','/style.css':'text/css; charset=utf-8','/robots.txt':'text/plain'};
http.createServer(async(req,res)=>{
 const p=new URL(req.url,'http://localhost').pathname;
 if(p==='/api/archive'||p==='/api/archive.js')return handler(req,res);
 if(!types[p]){res.writeHead(404);return res.end('Non trovato');}
 try{res.setHeader('Content-Type',types[p]);res.setHeader('X-Content-Type-Options','nosniff');res.end(await readFile(new URL('./public'+(p==='/'?'/index.html':p),import.meta.url)));}catch{res.writeHead(404);res.end();}
}).listen(Number(process.env.PORT)||3000,'127.0.0.1',()=>console.log('Archivio: http://localhost:'+(process.env.PORT||3000)));
