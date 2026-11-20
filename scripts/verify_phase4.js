import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn,spawnSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {Simulation} from '../src/sim.js';
import {makeBenchmarkScenario} from '../src/bench-scenario.js';
import {summarizeFrameTimes} from '../src/bench-metrics.js';
import {keyboardMove} from '../src/input.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),node=process.execPath;
const contract=JSON.parse(fs.readFileSync(path.join(root,'game.contract.json'),'utf8'));
assert.equal(contract.contract_version,'1.3');assert.equal(contract.bench_cmd,'node scripts/bench.js');assert.equal(contract.soak_cmd,'node --expose-gc scripts/soak.js');
assert.deepEqual(summarizeFrameTimes(Array.from({length:100},(_,i)=>i+1),5050),{frames:100,avg_fps:19.8,p1_low_fps:10,frame_ms_p95:95});
const bindings={forward:'i',back:'k',left:'j',right:'l'};assert.deepEqual(keyboardMove(new Set(['i','j']),bindings),[1,1]);
const scenario=makeBenchmarkScenario(42);assert.equal(scenario.shades.length,200);assert(scenario.shades.every(s=>s.state==='wander'));assert.equal(scenario.motes.length,100);assert.deepEqual(scenario.lanterns.slice(0,3).map(l=>[l.lit,l.fuel]),[[true,100],[true,100],[true,100]]);assert.equal(scenario.lanterns.filter(l=>l.lit).length,3);assert.deepEqual(scenario,makeBenchmarkScenario(42));
const sim=new Simulation(42,scenario,1),startingPositions=sim.shades.map(s=>[...s.pos]),startingFuel=sim.lanterns.slice(0,3).map(l=>l.fuel_units);sim.events.length=0;for(let i=0;i<60;i++)sim.benchmarkWanderStep();assert.equal(sim.tick,60);assert.equal(sim.timeLeft,240);assert.equal(sim.player.flames,3);assert.equal(sim.player.carried,0);assert.deepEqual(sim.lanterns.slice(0,3).map(l=>l.fuel_units),startingFuel);assert(sim.shades.every(s=>s.state==='wander'));assert(sim.shades.some((s,i)=>s.pos.some((v,j)=>v!==startingPositions[i][j])));assert.deepEqual(sim.events,[]);

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'lantern-phase4-'));
const freePort=()=>new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port))})});
const port=await freePort(),boardFile=path.join(temp,'leaderboard.json'),exportFile=path.join(temp,'export.json'),env={...process.env,PORT:String(port),LEADERBOARD_FILE:boardFile};let child;
try{
 const startServer=()=>{child=spawn(node,['server.js'],{cwd:root,env,stdio:'ignore',windowsHide:true})};
 const stopServer=()=>new Promise(resolve=>{if(!child||child.exitCode!==null)return resolve();child.once('exit',resolve);child.kill()});
 const wait=async(fn)=>{for(let i=0;i<80;i++){try{const value=await fn();if(value)return value}catch{}await delay(100)}throw Error('leaderboard server did not start')};
 startServer();await wait(async()=>{const response=await fetch(`http://127.0.0.1:${port}/api/leaderboard`);return response.ok});
 let response=await fetch(`http://127.0.0.1:${port}/api/leaderboard`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'bad-name',score:100,nights_won:1,seed:7})});assert.equal(response.status,400);
 for(let i=0;i<11;i++){response=await fetch(`http://127.0.0.1:${port}/api/leaderboard`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:`P${String(i).padStart(2,'0')}`,score:i*100,nights_won:i%4,seed:7+i})});assert.equal(response.status,201)}
 let data=await(await fetch(`http://127.0.0.1:${port}/api/leaderboard`)).json();assert.equal(data.entries.length,10);assert.equal(data.entries[0].score,1000);assert.equal(data.entries.at(-1).score,100);assert.match(data.entries[0].achieved_at,/Z$/);
 await stopServer();startServer();await wait(async()=>{const res=await fetch(`http://127.0.0.1:${port}/api/leaderboard`);return res.ok});data=await(await fetch(`http://127.0.0.1:${port}/api/leaderboard`)).json();assert.equal(data.entries[0].name,'P10','leaderboard persists across app restarts');
 const exported=spawnSync(node,['server.js','--export-leaderboard',exportFile],{cwd:root,env,encoding:'utf8'});assert.equal(exported.status,0,exported.stderr);assert.deepEqual(JSON.parse(fs.readFileSync(exportFile,'utf8')).entries,data.entries);
 await stopServer();
}finally{if(child&&child.exitCode===null)child.kill();const resolved=path.resolve(temp);if(path.dirname(resolved)===path.resolve(os.tmpdir())&&path.basename(resolved).startsWith('lantern-phase4-'))fs.rmSync(resolved,{recursive:true,force:true})}
console.log('Phase 4 checks passed (v1.3 contract, deterministic 200-shade benchmark scene, locked benchmark sim, frame metrics, key remapping, local top-10 persistence and export).');
