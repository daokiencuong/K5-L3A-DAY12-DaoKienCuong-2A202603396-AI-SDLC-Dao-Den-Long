#!/usr/bin/env node
import fs from 'node:fs';
import {Simulation} from './sim.js';
try{
 const args={};for(let i=2;i<process.argv.length;i++){const key=process.argv[i];if(!key.startsWith('--'))throw Error(`unexpected argument: ${key}`);const name=key.slice(2);if(name==='help'){args.help=true;continue}if(!process.argv[i+1]||process.argv[i+1].startsWith('--'))throw Error(`missing value for ${key}`);args[name]=process.argv[++i];}
 if(args.help){console.log('node src/headless.js --seed INT --night 1|2|3 --ticks INT --out FILE [--scenario FILE] [--inputs FILE] [--snapshot-every 10]');process.exit(0)}
 for(const key of ['seed','night','ticks','out'])if(args[key]===undefined)throw Error(`missing required --${key}`);
 const seed=Number(args.seed),night=Number(args.night),ticks=Number(args.ticks),every=Number(args['snapshot-every']??10);
 if(!Number.isInteger(seed)||![1,2,3].includes(night)||!Number.isInteger(ticks)||ticks<0||ticks>21600||!Number.isInteger(every)||every<1)throw Error('invalid seed/night/ticks/snapshot interval; ticks must be in [0,21600]');
 const readJson=(file,label)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch(e){throw Error(`invalid ${label}: ${e.message}`)}};
 const scenario=args.scenario?readJson(args.scenario,'scenario'):null,input=args.inputs?readJson(args.inputs,'inputs'):{frames:[]},frames=input?.frames;
 if(!Array.isArray(frames))throw Error('inputs.frames must be an array');let prev=-1;for(const f of frames){if(!Number.isInteger(f.tick)||f.tick<0||f.tick<=prev||f.tick>=ticks)throw Error('frame ticks must be strictly increasing and below --ticks');prev=f.tick;for(const k of ['jump','dash','interact','pulse','pause'])if(f[k]!==undefined&&typeof f[k]!=='boolean')throw Error(`${k} must be boolean`);if(f.cam_yaw_deg!==undefined&&!Number.isFinite(f.cam_yaw_deg))throw Error('cam_yaw_deg must be finite');if(f.move!==undefined&&(!Array.isArray(f.move)||f.move.length!==2||f.move.some(v=>!Number.isFinite(v)||v < -1||v>1)))throw Error('move must be [x,z] in [-1,1]');}
 const sim=new Simulation(seed,scenario,night),active={move:[0,0],cam_yaw_deg:0,jump:false,dash:false,interact:false,pulse:false,pause:false};let fi=0,out=[sim.snapshot()];
 for(let i=0;i<ticks;i++){while(fi<frames.length&&frames[fi].tick===i){Object.assign(active,Object.fromEntries(Object.entries(frames[fi]).filter(([k])=>k!=='tick')));fi++;}sim.step(active);if(sim.events.length){out.push(...sim.events);sim.events=[];}if(sim.tick%every===0)out.push(sim.snapshot());if(sim.state!=='playing'&&sim.state!=='paused')break;}
 out.push({type:'end',ticks:sim.tick,sim_ticks:sim.sim_tick,night:sim.night,state:sim.state,reason:sim.endReason,score:sim.score});fs.writeFileSync(args.out,out.map(x=>JSON.stringify(x)).join('\n')+'\n');
}catch(error){console.error(error.message);process.exitCode=/invalid scenario:|invalid inputs:|inputs\.frames|frame ticks|move must|cam_yaw_deg|must be boolean|known id|player\.|deposited/.test(error.message)?2:1;}
