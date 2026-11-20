import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Simulation,TUNING } from '../src/sim.js';
import { keyboardMove } from '../src/input.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'lantern-proof-'));
const run=(args,expected=0)=>{const p=spawnSync(process.execPath,['src/headless.js',...args],{cwd:root,encoding:'utf8'});assert.equal(p.status,expected,`exit ${p.status} != ${expected}: ${p.stderr}`);return p};
const read=file=>fs.readFileSync(file,'utf8').trim().split('\n').map(JSON.parse);
try{
  const contract=JSON.parse(fs.readFileSync(path.join(root,'game.contract.json'),'utf8'));
  assert.equal(contract.contract_version,'1.0');assert.deepEqual(contract.tuning,TUNING);
  const scenario='docs/proof/scenario-smoke.json',inputs='docs/proof/inputs-smoke.json',a=path.join(temp,'a.jsonl'),b=path.join(temp,'b.jsonl');
  const base=['--seed','23','--night','1','--scenario',scenario,'--inputs',inputs,'--ticks','600','--snapshot-every','1'];
  run([...base,'--out',a]);run([...base,'--out',b]);assert.equal(fs.readFileSync(a,'utf8'),fs.readFileSync(b,'utf8'),'seeded output should be byte-identical');
  const rows=read(a),events=rows.filter(x=>x.type==='event').map(x=>x.name);assert.deepEqual(events,['pulse','deposit','lantern_lit','game_over']);assert.equal(rows[0].tick,0);assert.deepEqual(rows.at(-1),{type:'end',ticks:3,state:'won',score:489});
  const pickup=new Simulation(7,{random_motes:false,random_shades:false,motes:[[0,0,0]],shades:[]});pickup.step();assert.equal(pickup.player.carried,1);assert.equal(pickup.score,10);
  const contact=new Simulation(7,{random_motes:false,random_shades:false,motes:[],shades:[{id:'Sx',pos:[.9,0,0]}]});contact.step();assert.equal(contact.player.flames,2);assert.equal(contact.events[0].name,'player_hit');
  for(const [key,move]of[['w',[0,1]],['s',[0,-1]],['a',[1,0]],['d',[-1,0]]])assert.deepEqual(keyboardMove(new Set([key])),move,`${key} should map to its labeled direction`);
  const forward=new Simulation(7,{random_motes:false,random_shades:false,motes:[],shades:[]});forward.step({move:keyboardMove(new Set(['w']))});assert(forward.player.pos[2]>0,'W should move forward into +Z');
  const right=new Simulation(7,{random_motes:false,random_shades:false,motes:[],shades:[]});right.step({move:keyboardMove(new Set(['d']))});assert(right.player.pos[0]<0,'D should move screen-right into -X at yaw 0');
  const bad=path.join(temp,'bad.json');fs.writeFileSync(bad,'{ nope');run(['--seed','1','--night','1','--scenario',bad,'--ticks','1','--out',path.join(temp,'badout')],2);
  const report='PASS: Node build inputs parse; contract tuning sync; pulse/deposit/light/win; mote pickup; shade contact; WASD world axes; malformed JSON exit 2; repeated output byte-identical.\nWin trace: tick 1 pulse S1 stunned; tick 3 deposit 3 into L1, L1 lit, all_lit; end tick 3, score 489.\n';
  fs.writeFileSync(path.join(root,'docs/proof/verification.txt'),report);console.log(report.trim());
}finally{fs.rmSync(temp,{recursive:true,force:true})}
