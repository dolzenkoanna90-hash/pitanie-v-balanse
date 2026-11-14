import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {pipeline} from 'node:stream/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('./web/',import.meta.url));
const types={
  '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
  '.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2',
  '.wasm':'application/wasm','.txt':'text/plain; charset=utf-8',
  '.onnx':'application/octet-stream','.json':'application/json; charset=utf-8'
};
const csp="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; base-uri 'self'; form-action 'self'; object-src 'none'; frame-ancestors 'none'";
http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Content-Security-Policy',csp);
  try{
    const url=new URL(req.url,'http://localhost');
    if(req.method!=='GET'&&req.method!=='HEAD'){
      res.writeHead(405).end();
      return;
    }
    if(url.pathname==='/api/journal'){
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(req.method==='HEAD'?undefined:'{"signedIn":false}');
      return;
    }
    const pathname=decodeURIComponent(url.pathname);
    const filename=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    const mime=types[path.extname(filename)];
    const info=filename.startsWith(root)&&mime?await stat(filename).catch(()=>null):null;
    if(!info?.isFile()){
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200,{'Content-Type':mime,'Content-Length':info.size,'Cache-Control':'public, max-age=0'});
    if(req.method==='HEAD')res.end();
    else await pipeline(createReadStream(filename),res);
  }catch{
    if(res.headersSent)res.destroy();
    else res.writeHead(400).end();
  }
}).listen(Number(process.env.PORT||8080),'0.0.0.0');
