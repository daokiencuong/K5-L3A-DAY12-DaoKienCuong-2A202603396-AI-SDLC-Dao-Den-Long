import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';

function parseArgs(argv){const args={};for(let i=0;i<argv.length;i++){const key=argv[i];if(!key.startsWith('--'))throw Error(`unexpected argument ${key}`);if(!argv[i+1]||argv[i+1].startsWith('--'))throw Error(`missing value for ${key}`);args[key.slice(2)]=argv[++i]}return args}
const args=parseArgs(process.argv.slice(2)),seed=Number(args.seed??42),duration=Number(args.duration??30),out=args.out??'bench.json';
if(!Number.isInteger(seed)||!Number.isFinite(duration)||duration<1||duration>600)throw Error('usage: node scripts/bench.js --seed 42 --duration 30 --out bench.json');
const candidates=[process.env.CHROME_PATH,process.env.EDGE_PATH,'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe','C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean),browser=candidates.find(file=>fs.existsSync(file));
if(!browser)throw Error('Install Google Chrome or Microsoft Edge, or set CHROME_PATH');
const getPort=()=>new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port))})});
const waitFor=async(fn,timeout=15000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const value=await fn();if(value)return value}catch{}await delay(150)}throw Error('timed out waiting for benchmark browser')};
const start=Date.now(),profile=fs.mkdtempSync(path.join(os.tmpdir(),'lantern-bench-')),debugPort=await getPort(),previewPort=await getPort();let preview,browserProcess,socket;
const log=message=>console.error(`[bench] ${message}`);
try{
 log('starting static preview');
 preview=spawn(process.execPath,['server.js'],{stdio:'ignore',windowsHide:true,env:{...process.env,PORT:String(previewPort)}});
 await waitFor(async()=>{const response=await fetch(`http://127.0.0.1:${previewPort}/bench.html`);return response.ok},20000);
 log('preview ready; starting windowed Chrome');
 const url=`http://127.0.0.1:${previewPort}/bench.html?seed=${seed}&duration=${duration}&startedAt=${start}`;
 browserProcess=spawn(browser,[`--user-data-dir=${profile}`,`--remote-debugging-port=${debugPort}`,'--no-first-run','--no-default-browser-check','--disable-extensions','--disable-frame-rate-limit','--disable-gpu-vsync','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--force-device-scale-factor=1','--window-size=1280,720',`--app=${url}`],{stdio:'ignore',windowsHide:false});
 const target=await waitFor(async()=>{const response=await fetch(`http://127.0.0.1:${debugPort}/json/list`);const list=await response.json();return list.find(item=>item.type==='page')},25000);
 log('connected to Chrome DevTools');
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
 let id=0;const pending=new Map();socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')log(`page exception: ${message.params.exceptionDetails.text}`);if(message.id&&pending.has(message.id)){const {resolve,reject}=pending.get(message.id);pending.delete(message.id);message.error?reject(Error(message.error.message)):resolve(message.result)}});
 const command=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id,pendingEntry={resolve,reject};pending.set(requestId,pendingEntry);socket.send(JSON.stringify({id:requestId,method,params}));setTimeout(()=>{if(pending.delete(requestId))reject(Error(`DevTools command timed out: ${method}`))},5000).unref()});
 await command('Runtime.enable');await command('Page.enable');await command('Page.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
 log('benchmark page navigated');
 const osLabel=`${os.type()} ${os.release()} (${os.arch()})`;
 await waitFor(async()=>{const value=await command('Runtime.evaluate',{expression:`({ready:!!window.__benchReady,renderer:window.__benchRenderer||null})`,returnByValue:true});return value.result.value.ready},15000);
 await command('Runtime.evaluate',{expression:`window.__benchOS=${JSON.stringify(osLabel)}`});
 log(`collecting ${duration}s after 3s warm-up`);
 let latest=null;const result=await waitFor(async()=>{const value=await command('Runtime.evaluate',{expression:'({result:window.__benchResult||null,first:window.__benchFirstFrame,ready:window.__benchReady,now:performance.now()})',returnByValue:true});latest=value.result.value;return latest.result},duration*1000+20000).catch(error=>{throw Error(`${error.message}; browser status=${JSON.stringify(latest)}`)});
 fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{
 try{socket?.close()}catch{};try{browserProcess?.kill()}catch{};if(browserProcess&&browserProcess.exitCode===null)await Promise.race([once(browserProcess,'exit'),delay(5000)]);try{preview?.kill()}catch{};if(preview&&preview.exitCode===null)await Promise.race([once(preview,'exit'),delay(2000)]);
 const resolved=path.resolve(profile);if(path.dirname(resolved)===path.resolve(os.tmpdir())&&path.basename(resolved).startsWith('lantern-bench-')){try{fs.rmSync(resolved,{recursive:true,force:true,maxRetries:4,retryDelay:250})}catch(error){console.error(`Unable to remove temporary browser profile ${resolved}: ${error.message}`)}}
}
