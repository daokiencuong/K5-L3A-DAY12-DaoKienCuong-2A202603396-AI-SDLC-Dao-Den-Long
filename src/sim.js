export const TICK_RATE=60;
// Shared deterministic tuning for browser and headless runs. Values not supplied
// by the Phase 2 ticket are explicitly chosen here and documented in the spec.
export const TUNING={player_speed:6,carry_capacity:10,lantern_cost:10,pickup_radius:1.5,interact_radius:3,pulse_cost:1,pulse_radius:8,night1_duration_s:300,night2_duration_s:360,night3_duration_s:360,flames:3,invuln_s:1.5,hit_drop_ratio:.5,pulse_stun_s:2.5,pulse_push_m:3,pulse_cooldown_s:4,safe_radius:4,shade_speed:2.4,shade_hit_radius:1,dash_speed:14,dash_duration_s:.2,dash_cooldown_s:3,jump_speed:8.5,gravity:20,dropped_mote_ttl_s:10,mote_respawn_s:10,charm_duration_s:10,charm_respawn_s:45,score:{per_mote:10,per_lantern:100,per_stun:5,per_second_left:2,per_flame_left:50}};
const rad=d=>d*Math.PI/180, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), dist=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
const polar=(cx,cz,r,d,y=0)=>[cx+Math.cos(rad(d))*r,y,cz+Math.sin(rad(d))*r];
function makeMap(n){
 const lanterns=[],motes=[],shades=[];
 const L=(points)=>points.forEach((p,i)=>lanterns.push({id:`L${i+1}`,pos:p,lit:false,safe:false}));
 const M=(points)=>points.forEach((p,i)=>motes.push({id:`M${i+1}`,pos:p,kind:'random',ttl_ticks:null}));
 if(n===1){L([[0,0,25],[23.8,0,7.7],[14.7,0,-20.2],[-14.7,0,-20.2],[-23.8,0,7.7]]);M([...Array.from({length:8},(_,i)=>polar(0,0,12,i*45)),...Array.from({length:16},(_,i)=>polar(0,0,33,i*22.5))]);for(let i=0;i<12;i++)shades.push(polar(0,0,37,15+i*30));}
 if(n===2){L([[0,0,20],[17,0,-10],[-17,0,-10],[70,0,20],[87,0,-10],[53,0,-10]]);for(const cx of [0,70])M([...Array.from({length:4},(_,i)=>polar(cx,0,10,i*90)),...Array.from({length:8},(_,i)=>polar(cx,0,22,i*45))]);for(const cx of [0,70])for(let i=0;i<8;i++)shades.push(polar(cx,0,26,22.5+i*45));}
 if(n===3){L([[0,6,6],[18,3,10],[-18,3,10],[35,0,-10],[-35,0,-10],[20,0,-35],[-20,0,-35]]);M([...Array.from({length:18},(_,i)=>polar(0,0,34,i*20)),...Array.from({length:8},(_,i)=>polar(0,0,18,20+i*20,3)),...[45,135,225,315].map(a=>polar(0,0,5,a,6))]);for(let i=0;i<16;i++)shades.push(polar(0,0,43,i*22.5));}
 return {lanterns,motes,shades};
}
function surface(n,x,z,oldY=0){
 const r=Math.hypot(x,z); if(n===1)return r<=40?0:null;
 if(n===2)return Math.hypot(x, z)<=28||Math.hypot(x-70,z)<=28||(x>=26&&x<=44&&Math.abs(z)<=2)?0:null;
 if(Math.hypot(x,z)>45)return null;
 if(r<=8&&oldY>=5.5)return 6;
 if(z>0&&r>=12&&r<=24&&oldY>=2.5)return 3;
 // Straight ramps, width 3, from radius 30 to 24 at angles 30 and 150.
 const a=(Math.atan2(z,x)*180/Math.PI+360)%360;
 for(const center of [30,150])if(Math.abs(((a-center+540)%360)-180)<=Math.atan2(1.5,Math.max(1,r))*180/Math.PI&&r>=24&&r<=30)return 3*(30-r)/6;
 return 0;
}
export class Simulation{
 constructor(seed=1,scenario=null,night=1){
  if(scenario?.night)night=Number(scenario.night); if(![1,2,3].includes(Number(night)))throw Error('night must be 1, 2, or 3');
  this.night=Number(night);this.seed=(Number(seed)>>>0)||1;this.rng=()=>{this.seed=(1664525*this.seed+1013904223)>>>0;return this.seed/4294967296};
  this.tick=0;this.sim_tick=0;this.duration=TUNING[`night${night}_duration_s`];this.timeLeft=this.duration;this.state='playing';this.score=0;this.events=[];this.last={};this.prevPause=false;this.safeIds=new Set();this.wind={active:false,dir_deg:0};this.pauseEdge=false;
  const base=makeMap(this.night),sc=scenario||{};this.timeLeft=Number(sc.time_left_s??this.duration);this.score=Number(sc.score||0);
  this.lanterns=sc.lanterns?sc.lanterns.map((l,i)=>{const fallback=base.lanterns.find(x=>x.id===l.id)||base.lanterns[i]||{pos:[0,0,0],lit:false};return {...fallback,...l,pos:[...(l.pos||fallback.pos)],lit:l.lit??(Number(l.deposited||0)>=TUNING.lantern_cost)};}):base.lanterns;
  this.motes=(sc.motes||base.motes).map((m,i)=>Array.isArray(m)?{id:`M${i+1}`,pos:[...m],kind:'random',ttl_ticks:null}:{...m,pos:[...m.pos],kind:m.kind||'random'});this.motePoints=base.motes.map(m=>[...m.pos]);this.moteRespawns=[];this.randomMotes=sc.random_motes!==false;this.shades=sc.shades||[];this.spawnPoints=base.shades;this.randomShades=sc.random_shades!==false;this.player={pos:[0,0,0],vel:[0,0,0],grounded:true,flames:TUNING.flames,carried:0,invuln_ticks:0,dash_cd_ticks:0,pulse_cd_ticks:0,charm_ticks:0,dash_ticks:0,...sc.player};this.player.pos=[...(this.player.pos||[0,0,0])];this.player.vel=[...(this.player.vel||[0,0,0])];
  this.drifters=sc.drifters||[];this.charms=sc.charms||this.defaultCharms();this.windEnabled=sc.wind_enabled!==false;this.randomDrifters=sc.random_drifters!==false;this.moveSpeed=TUNING.player_speed;
  this.counts={shade:Math.max(0,...this.shades.map(x=>Number((x.id||'').replace(/\D/g,''))||0)),drifter:0,mote:this.motes.length,charm:this.charms.length};
  for(const shade of this.shades){shade.state=shade.state||'wander';shade.state_ticks_left=shade.state_ticks_left||0;shade.pos=[...shade.pos];shade.pulse_hits=shade.pulse_hits||0;}
  for(const d of this.drifters){d.pos=[...d.pos];d.state=d.state||'idle';d.stolen=d.stolen||0;d.state_ticks_left=d.state_ticks_left||0;d.stole_once=d.stole_once||false;}
  for(const c of this.charms){c.available=c.available!==false;c.respawn_ticks=c.respawn_ticks||0;c.pos=[...c.pos];}
  this.event('night_start',{night:this.night});
 }
 defaultCharms(){return this.night===2?[{id:'C1',pos:[35,0,0],available:true,respawn_ticks:0}]:this.night===3?[{id:'C1',pos:[30,0,25],available:true,respawn_ticks:0},{id:'C2',pos:[-30,0,25],available:true,respawn_ticks:0}]:[];}
 event(name,data={}){this.events.push({type:'event',name,tick:this.tick,sim_tick:this.sim_tick,data});}
 step(input={}){
  this.tick++; const pausePressed=!!input.pause&&!this.prevPause;this.prevPause=!!input.pause;this.last={...input};
  if(pausePressed){this.state=this.state==='paused'?'playing':this.state==='playing'?'paused':this.state;if(this.state==='paused'){this.event('paused');return this.snapshot()}this.event('resumed');}
  if(this.state==='paused'||this.state!=='playing')return this.snapshot();
  this.sim_tick++;
  // 2. All simulation timers tick down before movement.
  this.timeLeft=Math.max(0,this.timeLeft-1/60);for(const key of ['invuln_ticks','dash_cd_ticks','pulse_cd_ticks','charm_ticks','dash_ticks'])this.player[key]=Math.max(0,(this.player[key]||0)-1);
  if(this.timeLeft<=10&&this.timeLeft+1/60>10)this.event('countdown',{seconds:10});
  this.motes=this.motes.filter(m=>{if(m.kind!=='dropped')return true;m.ttl_ticks--;return m.ttl_ticks>0;});
  for(const c of this.charms)if(!c.available&&c.respawn_ticks>0&&--c.respawn_ticks===0)c.available=true;
  for(const s of this.shades)if(s.state==='spawning'&&s.state_ticks_left>0&&--s.state_ticks_left===0)s.state='wander';
  for(const s of this.shades)if(s.state==='stunned'&&s.state_ticks_left>0&&--s.state_ticks_left===0)s.state='chase';
  for(const s of this.shades)if(s.state==='recoil'&&s.state_ticks_left>0&&--s.state_ticks_left===0)s.state='chase';
  if(this.windEnabled&&this.night===3){const period=this.sim_tick%1800;this.wind.active=this.sim_tick>=1800&&period<300;if(this.sim_tick>0&&period===0)this.event('wind_start',{dir_deg:this.wind.dir_deg});}
  // 3. Move, jump, dash, pads, wind, then resolve falling.
  this.move(input);
  // 4. Pickups.
  for(const mote of [...this.motes])if(dist(mote.pos,this.player.pos)<=TUNING.pickup_radius&&this.player.carried<TUNING.carry_capacity){this.player.carried++;this.motes.splice(this.motes.indexOf(mote),1);if(mote.kind==='random'&&this.randomMotes)this.moteRespawns.push({pos:[...mote.pos],ticks:600});this.event('mote_picked',{mote_id:mote.id,carried:this.player.carried});}
  for(const c of this.charms)if(c.available&&dist(c.pos,this.player.pos)<=TUNING.pickup_radius){c.available=false;c.respawn_ticks=2700;this.player.charm_ticks=600;this.event('charm_picked',{charm_id:c.id,charm_ticks:600});}
  // 5. Interact with lanterns. A single press edge is required.
  const interact=!!input.interact&&!this.lastInteract;this.lastInteract=!!input.interact;
  if(interact&&this.player.carried>=TUNING.lantern_cost){const l=this.lanterns.filter(x=>!x.lit&&dist(x.pos,this.player.pos)<=TUNING.interact_radius).sort((a,b)=>dist(a.pos,this.player.pos)-dist(b.pos,this.player.pos))[0];if(l){l.lit=true;this.player.carried-=TUNING.lantern_cost;this.score+=100+TUNING.lantern_cost*TUNING.score.per_mote;this.event('lantern_lit',{lantern_id:l.id,carried:this.player.carried,motes_deposited:TUNING.lantern_cost,score:this.score});}}
  // 6. Safe zones update.
  this.safeIds=new Set(this.lanterns.filter(l=>l.lit&&dist(l.pos,this.player.pos)<=TUNING.safe_radius).map(l=>l.id));
  // 7. Pulse.
  const pulse=!!input.pulse&&!this.lastPulse;this.lastPulse=!!input.pulse;if(pulse)this.pulse();
  // 8. Move enemies and wind drifters.
  this.moveEnemies();this.moveDrifters();
  // 9. Contacts: drifters before shades, ascending id.
  for(const d of [...this.drifters].sort((a,b)=>a.id.localeCompare(b.id)))if(d.state==='chase'&&!d.stole_once&&dist(d.pos,this.player.pos)<=1.2){const amount=Math.min(3,this.player.carried);this.player.carried-=amount;d.stolen=amount;d.stole_once=true;d.state='flee';d.state_ticks_left=240;this.event('drifter_steal',{drifter_id:d.id,amount,carried:this.player.carried});}
  for(const s of [...this.shades].sort((a,b)=>a.id.localeCompare(b.id)))if(!this.safeIds.size&&s.state!=='stunned'&&s.state!=='spawning'&&dist(s.pos,this.player.pos)<=TUNING.shade_hit_radius&&this.player.invuln_ticks===0){const lost=Math.ceil(this.player.carried*TUNING.hit_drop_ratio);this.player.carried-=lost;this.player.flames--;this.player.invuln_ticks=90;this.event('player_hit',{shade_id:s.id,lost,flames:this.player.flames,carried:this.player.carried});s.state='recoil';s.state_ticks_left=30;if(this.player.flames<=0)this.state='lost';break;}
  // 10. Timed spawns. They cannot interact until next tick.
  this.spawnEntities();
  // 11. Win/loss.
  if(this.state==='playing'&&this.lanterns.every(l=>l.lit)){const bonus=Math.floor(this.timeLeft)*2+50*this.player.flames;this.score+=bonus;this.state='won';this.event('game_over',{state:'won',bonus,score:this.score});}
  else if(this.state==='playing'&&this.timeLeft<=0){this.state='lost';this.event('game_over',{state:'lost',score:this.score});}
  return this.snapshot();
 }
 move(input){const p=this.player,move=input.move||[0,0],len=Math.hypot(move[0],move[1])||1;let mx=move[0]/len,mz=move[1]/len;const yaw=(input.cam_yaw_deg||0)*Math.PI/180;[mx,mz]=[mx*Math.cos(yaw)+mz*Math.sin(yaw),-mx*Math.sin(yaw)+mz*Math.cos(yaw)];
  if(input.dash&&!this.lastDash&&p.dash_ticks===0&&(p.charm_ticks>0||p.dash_cd_ticks===0)){const dl=Math.hypot(mx,mz)||1;p.dash_dir=[mx/dl,mz/dl];p.dash_ticks=12;if(!p.charm_ticks)p.dash_cd_ticks=180;this.event('dash');}this.lastDash=!!input.dash;
  if(input.jump&&!this.lastJump&&p.grounded){p.vel[1]=TUNING.jump_speed;p.grounded=false;this.event('jump');}this.lastJump=!!input.jump;
  if(p.grounded&&this.night===2){for(const pad of [[20,0,18,24],[50,0,-18,-24]])if(Math.hypot(p.pos[0]-pad[0],p.pos[2]-pad[2])<=1){p.vel[0]=pad[3];p.vel[1]=14;p.vel[2]=0;p.grounded=false;}}
  if(p.grounded&&this.night===3&&Math.hypot(p.pos[0],p.pos[2]-13)<=1&&p.pos[1]>=2.5){p.vel[0]=0;p.vel[1]=12;p.vel[2]=-8;p.grounded=false;}
  const speed=p.charm_ticks>0?7.2:TUNING.player_speed;if(p.dash_ticks>0){p.vel[0]=p.dash_dir[0]*TUNING.dash_speed;p.vel[2]=p.dash_dir[1]*TUNING.dash_speed;}else if(p.grounded){p.vel[0]=mx*speed;p.vel[2]=mz*speed;}
  if(this.wind.active){p.vel[0]+=Math.cos(rad(this.wind.dir_deg))*2/60;p.vel[2]+=Math.sin(rad(this.wind.dir_deg))*2/60;}
  const oldX=p.pos[0],oldZ=p.pos[2];p.pos[0]+=p.vel[0]/60;p.pos[2]+=p.vel[2]/60;if(this.night===3&&p.pos[1]>=5.5&&Math.hypot(p.pos[0],p.pos[2])<2.8){p.pos[0]=oldX;p.pos[2]=oldZ;}
  if(!p.grounded){p.vel[1]-=TUNING.gravity/60;p.pos[1]+=p.vel[1]/60;}
  const floor=surface(this.night,p.pos[0],p.pos[2],p.pos[1]);if(p.grounded&&floor!==null&&floor<p.pos[1])p.grounded=false;if(floor!==null&&p.pos[1]<=floor){p.pos[1]=floor;p.vel[1]=0;p.grounded=true;}
  if(p.dash_ticks>0){p.dash_ticks--;if(p.dash_ticks===0&&p.charm_ticks===0&&p.dash_cd_ticks===0)p.dash_cd_ticks=180;}
  const boundary=this.night===1?40:this.night===2?Infinity:45;
  if((this.night===2&&p.pos[0]<26||this.night===2&&p.pos[0]>44)&&Math.abs(p.pos[2])>2&&p.pos[1]<-2||p.pos[1]<-8||Math.hypot(p.pos[0],p.pos[2])>boundary&&this.night!==2){p.flames--;p.pos=this.night===2&&p.pos[0]>35?[70,0,0]:[0,0,0];p.vel=[0,0,0];p.grounded=true;p.invuln_ticks=90;this.event('player_hit',{lost:0,fall:true,flames:p.flames});if(p.flames<=0)this.state='lost';}
 }
 pulse(){const p=this.player;if(p.carried<TUNING.pulse_cost||p.pulse_cd_ticks>0)return;p.carried--;p.pulse_cd_ticks=240;const hits=[];for(const s of [...this.shades].sort((a,b)=>a.id.localeCompare(b.id)))if(dist(s.pos,p.pos)<=TUNING.pulse_radius){this.score+=5;s.pulse_hits++;hits.push(s.id);s.state='stunned';s.state_ticks_left=150;const dx=s.pos[0]-p.pos[0],dz=s.pos[2]-p.pos[2],l=Math.hypot(dx,dz)||1;s.pos[0]+=dx/l*3;s.pos[2]+=dz/l*3;}for(const d of this.drifters)if(dist(d.pos,p.pos)<=TUNING.pulse_radius){if(d.state==='chase'){d.state='flee';d.state_ticks_left=240;}else if(d.state==='flee'&&d.stolen>0){for(let i=0;i<d.stolen;i++)this.motes.push({id:`M${++this.counts.mote}`,pos:[...d.pos],kind:'dropped',ttl_ticks:600});this.event('drifter_drop',{drifter_id:d.id,amount:d.stolen});d.stolen=0;d.state_ticks_left=120;}}this.event('pulse',{stunned_ids:hits,carried:p.carried});}
 moveEnemies(){for(const s of this.shades){if(s.state==='stunned'||s.state==='spawning'||s.state==='recoil')continue;const d=dist(s.pos,this.player.pos);if(d<15)s.state='chase';else s.state='wander';if(d>0){const step=(s.state==='chase'?TUNING.shade_speed:1.1)/60;s.pos[0]+=(this.player.pos[0]-s.pos[0])/d*step;s.pos[2]+=(this.player.pos[2]-s.pos[2])/d*step;}}}
 moveDrifters(){for(const d of this.drifters){const distance=dist(d.pos,this.player.pos);if(d.state==='idle'){if(this.player.carried>=5&&distance<=15)d.state='chase';else{d.pos[0]+=(this.rng()-.5)*2/60;d.pos[2]+=(this.rng()-.5)*2/60;}}if(d.state==='chase'){if(this.player.carried<5||distance>15)d.state='idle';else if(distance>0){d.pos[0]+=(this.player.pos[0]-d.pos[0])/distance*7/60;d.pos[2]+=(this.player.pos[2]-d.pos[2])/distance*7/60;}}else if(d.state==='flee'){const dx=d.pos[0]-this.player.pos[0],dz=d.pos[2]-this.player.pos[2],l=Math.hypot(dx,dz)||1;d.pos[0]+=dx/l*7/60;d.pos[2]+=dz/l*7/60;if(--d.state_ticks_left<=0)this.drifters.splice(this.drifters.indexOf(d),1);}}}
 spawnEntities(){for(const r of this.moteRespawns)r.ticks--;for(const r of [...this.moteRespawns])if(r.ticks<=0){this.moteRespawns.splice(this.moteRespawns.indexOf(r),1);const m={id:`M${++this.counts.mote}`,pos:[...r.pos],kind:'random',ttl_ticks:null};this.motes.push(m);this.event('mote_spawned',{mote_id:m.id});}if(this.randomShades){if(this.night===1){if(this.sim_tick===300){this.spawnShade();if(this.shades.length<6)this.spawnShade();}else if(this.sim_tick>300&&(this.sim_tick-300)%480===0&&this.shades.length<6)this.spawnShade();}else{const interval=this.night===2?420:360,max=this.night===2?8:10;if(this.sim_tick%interval===0&&this.shades.length<max)this.spawnShade();}}if(this.night>=2){if(this.randomDrifters&&this.sim_tick%1200===0&&this.drifters.length<2){const pos=this.night===2?[this.rng()<.5?0:70,0,(this.rng()-.5)*50]:polar(0,0,35,this.rng()*360);this.drifters.push({id:`D${++this.counts.drifter}`,pos,state:'idle',stolen:0,state_ticks_left:0,stole_once:false});}if(this.night===3&&this.windEnabled&&this.sim_tick%1800===1680){this.wind.dir_deg=Math.floor(this.rng()*360);this.event('wind_warning',{dir_deg:this.wind.dir_deg});}}}
 spawnShade(){let pos=this.spawnPoints[(this.counts.shade)%this.spawnPoints.length];for(let tries=0;dist(pos,this.player.pos)<15&&tries<12;tries++)pos=this.spawnPoints[Math.floor(this.rng()*this.spawnPoints.length)];const shade={id:`S${++this.counts.shade}`,pos:[...pos],state:'spawning',state_ticks_left:30,pulse_hits:0};this.shades.push(shade);this.event('shade_spawned',{id:shade.id});}
 snapshot(){return {type:'snapshot',version:'1.1',tick:this.tick,sim_tick:this.sim_tick,night:this.night,state:this.state,score:this.score,time_left_s:this.timeLeft,wind:{active:this.wind.active,dir_deg:this.wind.dir_deg},player:{pos:[...this.player.pos],vel:[...this.player.vel],grounded:this.player.grounded,flames:this.player.flames,carried:this.player.carried,invuln:this.player.invuln_ticks/60,dash_cd_s:this.player.dash_cd_ticks/60,pulse_cd_s:this.player.pulse_cd_ticks/60,charm_s:this.player.charm_ticks/60},lanterns:this.lanterns.map(l=>({...l,pos:[...l.pos]})),shades:this.shades.map(s=>({id:s.id,pos:[...s.pos],state:s.state,state_ticks_left:s.state_ticks_left})),motes:this.motes.map(m=>({id:m.id,pos:[...m.pos],kind:m.kind,ttl_s:m.kind==='dropped'?m.ttl_ticks/60:null})),drifters:this.drifters.map(d=>({id:d.id,pos:[...d.pos],state:d.state,stolen:d.stolen})),charms:this.charms.map(c=>({id:c.id,pos:[...c.pos],available:c.available,respawn_s:c.respawn_ticks/60})),events:[...this.events]};}
}
