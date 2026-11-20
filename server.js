import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url)),boardFile=process.env.LEADERBOARD_FILE?path.resolve(process.env.LEADERBOARD_FILE):path.join(root,'data','leaderboard.json'),dataDir=path.dirname(boardFile);
const args=process.argv.slice(2),exportAt=args.indexOf('--export-leaderboard');
function sorted(entries){return entries.slice().sort((a,b)=>b.score-a.score||Date.parse(a.achieved_at)-Date.parse(b.achieved_at)).slice(0,10)}
function readBoard(){try{const data=JSON.parse(fs.readFileSync(boardFile,'utf8'));return sorted(Array.isArray(data.entries)?data.entries:[])}catch(error){if(error.code==='ENOENT')return[];throw error}}
if(exportAt>=0){const dest=args[exportAt+1];if(!dest)throw Error('usage: node server.js --export-leaderboard out.json');fs.writeFileSync(path.resolve(dest),JSON.stringify({entries:readBoard()},null,2)+'\n');process.exit(0)}
const apiOnly=args.includes('--api-only'),port=Number(process.env.PORT||(apiOnly?3001:4173)),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'};
const send=(res,status,payload)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify(payload))};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/leaderboard'&&req.method==='GET')return send(res,200,{entries:readBoard()});
  if(url.pathname==='/api/leaderboard'&&req.method==='POST'){
   let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>8192)return send(res,413,{error:'request too large'})}
   let value;try{value=JSON.parse(raw)}catch{return send(res,400,{error:'invalid JSON'})}
   const name=String(value.name||'').trim(),score=Number(value.score),nightsWon=Number(value.nights_won),seed=Number(value.seed);
   if(!/^[A-Za-z0-9_]{3,12}$/.test(name))return send(res,400,{error:'name must be 3–12 letters, numbers, or underscores'});
   if(!Number.isSafeInteger(score)||score<0||!Number.isInteger(nightsWon)||nightsWon<0||nightsWon>3||!Number.isInteger(seed))return send(res,400,{error:'invalid score, nights_won, or seed'});
   const entries=readBoard();entries.push({name,score,nights_won:nightsWon,achieved_at:new Date().toISOString(),seed});fs.mkdirSync(dataDir,{recursive:true});const temp=`${boardFile}.tmp`;fs.writeFileSync(temp,JSON.stringify({entries:sorted(entries)},null,2)+'\n');fs.renameSync(temp,boardFile);return send(res,201,{entries:readBoard()});
  }
  if(req.method==='OPTIONS'&&url.pathname.startsWith('/api/')){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'});return res.end()}
  if(apiOnly)return send(res,404,{error:'not found'});
  const relative=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname),base=path.resolve(root,'dist'),file=path.resolve(base,`.${relative}`);
  if(file!==base&&!file.startsWith(base+path.sep))return send(res,403,{error:'forbidden'});
  let body;try{body=fs.readFileSync(file)}catch{body=fs.readFileSync(path.join(base,'index.html'))}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':path.extname(file)==='.html'?'no-cache':'public, max-age=31536000, immutable'});res.end(req.method==='HEAD'?undefined:body);
 }catch(error){console.error(error);if(!res.headersSent)send(res,500,{error:'server error'})}
});
server.listen(port,'127.0.0.1',()=>console.log(`${apiOnly?'Leaderboard API':'Lantern Island'} listening at http://localhost:${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
