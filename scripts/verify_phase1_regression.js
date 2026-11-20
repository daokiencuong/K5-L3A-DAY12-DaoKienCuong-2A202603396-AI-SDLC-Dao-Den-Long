import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Simulation,TUNING} from '../src/sim.js';
import {keyboardMove} from '../src/input.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'lantern-v11-'));
const run=(args,code=0)=>{const p=spawnSync(process.execPath,['src/headless.js',...args],{cwd:root,encoding:'utf8'});assert.equal(p.status,code,p.stderr);return p};
try{
 const contract=JSON.parse(fs.readFileSync(path.join(root,'game.contract.json'),'utf8'));assert.equal(contract.contract_version,'1.2');for(const[key,value]of Object.entries(TUNING))assert.deepEqual(contract.tuning[key],value,`contract tuning mismatch: ${key}`);
 for(const[key,move]of[['w',[0,1]],['s',[0,-1]],['a',[1,0]],['d',[-1,0]]])assert.deepEqual(keyboardMove(new Set([key])),move);
 for(const[key,expected]of[['w',[0,1]],['s',[0,-1]],['a',[1,0]],['d',[-1,0]]]){const sim=new Simulation(5,{motes:[],random_motes:false,random_shades:false,shades:[]});sim.step({move:keyboardMove(new Set([key]))});assert.equal(Math.sign(sim.player.pos[0]),Math.sign(expected[0]));assert.equal(Math.sign(sim.player.pos[2]),Math.sign(expected[1]));}
 const pickup=new Simulation(3,{player:{pos:[0,0,0]},motes:[[0,0,0]],random_motes:false,random_shades:false,shades:[]});pickup.step();assert.equal(pickup.player.carried,1);assert.equal(pickup.score,0,'collection alone no longer scores; deposit awards points');
 const contact=new Simulation(3,{player:{pos:[0,0,0]},motes:[],random_motes:false,random_shades:false,shades:[{id:'S1',pos:[.9,0,0]}]});contact.step();assert.equal(contact.player.flames,2);const hit=contact.events.find(e=>e.name==='player_hit');assert(hit);assert.equal(hit.data.lost,0);
 const a=path.join(temp,'a.jsonl'),b=path.join(temp,'b.jsonl'),base=['--seed','23','--night','1','--scenario','docs/proof/scenario-smoke.json','--inputs','docs/proof/inputs-smoke.json','--ticks','600','--snapshot-every','10'];run([...base,'--out',a]);run([...base,'--out',b]);assert.equal(fs.readFileSync(a,'utf8'),fs.readFileSync(b,'utf8'),'seeded outputs must be byte-identical');const rows=fs.readFileSync(a,'utf8').trim().split('\n').map(JSON.parse);assert.equal(rows[0].tick,0);assert.equal(rows.at(-1).type,'end');assert(rows.some(r=>r.type==='event'&&r.name==='pulse'));
 const bad=path.join(temp,'bad.json');fs.writeFileSync(bad,'{ nope');run(['--seed','1','--night','1','--scenario',bad,'--ticks','1','--out',path.join(temp,'badout')],2);
 console.log('Phase 1 regression checks passed (legacy scenario shape, pulse/contact, collection, WASD, deterministic JSONL, invalid-input exit).');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
