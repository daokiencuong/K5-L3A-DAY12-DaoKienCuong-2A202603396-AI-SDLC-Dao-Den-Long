import fs from 'node:fs';
import {Simulation,TUNING} from '../src/sim.js';

function parseArgs(argv){const args={};for(let i=0;i<argv.length;i++){const key=argv[i];if(!key.startsWith('--'))throw Error(`unexpected argument ${key}`);if(!argv[i+1]||argv[i+1].startsWith('--'))throw Error(`missing value for ${key}`);args[key.slice(2)]=argv[++i]}return args}
const args=parseArgs(process.argv.slice(2)),baseSeed=Number(args.seed),nights=Number(args.nights),out=args.out;
if(!Number.isInteger(baseSeed)||!Number.isInteger(nights)||nights<1||nights>100||!out)throw Error('usage: node scripts/soak.js --seed 7 --nights 10 --out soak.json');
const rss=()=>Number((process.memoryUsage().rss/1048576).toFixed(1)),start=Date.now(),results=[];let crashes=0,memStart=null;
let warmup=new Simulation(baseSeed,null,1);for(let tick=0;tick<1200;tick++){warmup.step({move:[0,0]});warmup.events.length=0}warmup=null;global.gc?.();
for(let index=0;index<nights;index++){
 const night=index%3+1,seed=baseSeed+index;let seedState=seed>>>0,sim;const random=()=>{seedState=(1664525*seedState+1013904223)>>>0;return seedState/4294967296};
 try{
  sim=new Simulation(seed,null,night);if(index===0)memStart=rss();
  let direction=[0,0];
  const maxTicks=TUNING[`night${night}_duration_s`]*60;
  for(let tick=0;tick<maxTicks&&sim.state==='playing';tick++){
   if(tick%30===0){const angle=random()*Math.PI*2;direction=[Math.sin(angle),Math.cos(angle)]}
   sim.step({move:direction,jump:random()<.05,dash:random()<.03,pulse:random()<.02,interact:random()<.1});
   sim.events.length=0;
  }
  results.push(sim.state==='won'?'won':sim.state==='lost'?'lost':'incomplete');
 }catch(error){crashes++;results.push('crash');console.error(`night ${index+1}: ${error.stack||error}`)}
 sim=null;global.gc?.();
}
const memEnd=rss(),payload={nights,crashes,results,mem_start_mb:memStart,mem_end_mb:memEnd,duration_s:Number(((Date.now()-start)/1000).toFixed(2))};
fs.writeFileSync(out,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify(payload));
