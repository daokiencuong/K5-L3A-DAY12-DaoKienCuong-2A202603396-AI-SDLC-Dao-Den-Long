export const TUNING = {
  player_speed: 6, carry_capacity: 5, lantern_cost: 3, lantern_count_night1: 5,
  pickup_radius: 1.5, interact_radius: 3, pulse_cost: 1, pulse_radius: 8,
  night1_duration_s: 300, flames: 3, invuln_s: 1.5, hit_drop_ratio: 0.5,
  pulse_stun_s: 2.5, pulse_push_m: 3, pulse_cooldown_s: 4, safe_radius: 4,
  shade_speed: 2.4, shade_hit_radius: 1, fall_enabled: false,
  score: { per_mote: 10, per_lantern: 100, per_stun: 15, per_second_left: 1, per_flame_left: 25 }
};
export const START_LANTERNS = [[0,0,22],[20.9,0,6.8],[12.9,0,-17.8],[-12.9,0,-17.8],[-20.9,0,6.8]];
const distance2=(a,b)=>(a[0]-b[0])**2+(a[2]-b[2])**2;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const bool=(x,name)=>{if(typeof x!=='boolean')throw new Error(`${name} must be boolean`);return x};
const vector=(v,name)=>{if(!Array.isArray(v)||v.length!==3||!v.every(finite))throw new Error(`${name} must be [x,y,z] finite numbers`);return [...v]};
function round(v){if(typeof v==='number')return Number(v.toFixed(3));if(Array.isArray(v))return v.map(round);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,round(x)]));return v}

export class Simulation {
  constructor(seed=1,scenario=null){
    this.seed=(Number(seed)>>>0)||1;this.tick=0;this.score=0;this.state='playing';this.timeLeft=TUNING.night1_duration_s;
    this.player={pos:[0,0,0],carried:0,flames:TUNING.flames};this.motes=[];this.shades=[];
    this.lanterns=START_LANTERNS.map((pos,i)=>({id:`L${i+1}`,pos:[...pos],lit:false,deposited:0}));
    this.events=[];this.invulnerable=0;this.cooldown=0;this.jump=0;this.prev={interact:false,pulse:false,jump:false};
    this.randomMotes=true;this.randomShades=true;this.nextMote=1;this.nextShade=1;
    for(let i=0;i<24;i++)this.spawnMote();for(let i=0;i<3;i++)this.spawnShade();if(scenario)this.applyScenario(scenario);
  }
  random(){let x=this.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;return this.seed/4294967296}
  spawnMote(pos=null,id=null){if(!pos){const a=this.random()*Math.PI*2,r=5+Math.sqrt(this.random())*22;pos=[Math.cos(a)*r,0,Math.sin(a)*r]}this.motes.push({id:id||`M${this.nextMote++}`,pos:[...pos]})}
  spawnShade(pos=null,id=null){if(!pos){const a=this.random()*Math.PI*2;pos=[Math.cos(a)*27,0,Math.sin(a)*27]}this.shades.push({id:id||`S${this.nextShade++}`,pos:[...pos],state:'chase',stun:0})}
  applyScenario(s){
    if(!s||typeof s!=='object'||Array.isArray(s))throw new Error('scenario must be a JSON object');
    if(s.player!==undefined){if(!s.player||typeof s.player!=='object'||Array.isArray(s.player))throw new Error('scenario.player must be an object');const p=s.player;if(p.pos!==undefined)this.player.pos=vector(p.pos,'player.pos');for(const [k,max]of[['carried',TUNING.carry_capacity],['flames',TUNING.flames]])if(p[k]!==undefined){if(!Number.isInteger(p[k])||p[k]<0||p[k]>max)throw new Error(`player.${k} out of range`);this.player[k]=p[k]}}
    if(s.random_motes!==undefined)this.randomMotes=bool(s.random_motes,'random_motes');if(s.random_shades!==undefined)this.randomShades=bool(s.random_shades,'random_shades');
    if(s.random_motes===false&&s.motes===undefined)this.motes=[];if(s.random_shades===false&&s.shades===undefined)this.shades=[];
    if(s.motes!==undefined){if(!Array.isArray(s.motes))throw new Error('motes must be an array');this.motes=[];for(const p of s.motes)this.spawnMote(vector(p,'mote'))}
    if(s.shades!==undefined){if(!Array.isArray(s.shades))throw new Error('shades must be an array');this.shades=[];for(const sh of s.shades){if(!sh||typeof sh!=='object'||sh.pos===undefined)throw new Error('each shade needs pos');this.spawnShade(vector(sh.pos,'shade.pos'),sh.id)}}
    if(s.lanterns!==undefined){if(!Array.isArray(s.lanterns))throw new Error('lanterns must be an array');for(const u of s.lanterns){const l=this.lanterns.find(x=>x.id===u?.id);if(!l)throw new Error('lantern update needs a known id L1-L5');if(u.pos!==undefined)l.pos=vector(u.pos,'lantern.pos');if(u.deposited!==undefined){if(!Number.isInteger(u.deposited)||u.deposited<0)throw new Error('deposited must be nonnegative integer');l.deposited=Math.min(u.deposited,TUNING.lantern_cost)}if(u.lit!==undefined)l.lit=bool(u.lit,'lantern.lit')}}
    if(s.time_left_s!==undefined){if(!finite(s.time_left_s)||s.time_left_s<0)throw new Error('time_left_s must be nonnegative');this.timeLeft=s.time_left_s}
  }
  emit(name,data){this.events.push({type:'event',tick:this.tick,name,data})}
  snapshot(){return round({type:'snapshot',tick:this.tick,sim_tick:this.tick,state:this.state,time_left_s:this.timeLeft,score:this.score,player:{...this.player},lanterns:this.lanterns.map(({id,pos,lit,deposited})=>({id,pos,lit,deposited})),shades:this.shades.map(({id,pos,state})=>({id,pos,state})),motes_active:this.motes.length,motes:this.motes.map(({id,pos})=>({id,pos}))})}
  finish(result,reason){if(this.state!=='playing')return;this.state=result;this.emit('game_over',{result,reason});if(result==='won')this.score+=Math.floor(this.timeLeft)*TUNING.score.per_second_left+this.player.flames*TUNING.score.per_flame_left}
  step(input={}){
    if(this.state!=='playing')return;this.tick++;const dt=1/60;this.timeLeft=Math.max(0,this.timeLeft-dt);this.invulnerable=Math.max(0,this.invulnerable-dt);this.cooldown=Math.max(0,this.cooldown-dt);this.jump=Math.max(0,this.jump-dt);
    let [x,z]=input.move||[0,0];const yaw=(input.cam_yaw_deg||0)*Math.PI/180;const mag=Math.hypot(x,z);if(mag>1){x/=mag;z/=mag}const wx=x*Math.cos(yaw)+z*Math.sin(yaw),wz=-x*Math.sin(yaw)+z*Math.cos(yaw),p=this.player.pos;p[0]+=wx*TUNING.player_speed*dt;p[2]+=wz*TUNING.player_speed*dt;const r=Math.hypot(p[0],p[2]);if(r>29.5){p[0]*=29.5/r;p[2]*=29.5/r}
    for(const a of ['interact','pulse','jump']){const down=Boolean(input[a]),pressed=down&&!this.prev[a];this.prev[a]=down;if(!pressed)continue;if(a==='interact')this.interact();if(a==='pulse')this.pulse();if(a==='jump')this.jump=.55}
    for(const m of [...this.motes])if(distance2(p,m.pos)<=TUNING.pickup_radius**2&&this.player.carried<TUNING.carry_capacity){this.motes.splice(this.motes.indexOf(m),1);this.player.carried++;this.score+=TUNING.score.per_mote;this.emit('mote_picked',{carried:this.player.carried})}
    for(const sh of this.shades){if(sh.stun>0){sh.stun=Math.max(0,sh.stun-dt);sh.state=sh.stun>0?'stunned':'chase';continue}const nearest=this.lanterns.filter(l=>l.lit).sort((a,b)=>distance2(sh.pos,a.pos)-distance2(sh.pos,b.pos))[0];let target=p;if(nearest&&distance2(sh.pos,nearest.pos)<TUNING.safe_radius**2){const dx=sh.pos[0]-nearest.pos[0],dz=sh.pos[2]-nearest.pos[2];if(Math.hypot(dx,dz)<TUNING.safe_radius)target=[nearest.pos[0]+dx,0,nearest.pos[2]+dz]}const dx=target[0]-sh.pos[0],dz=target[2]-sh.pos[2],d=Math.hypot(dx,dz);if(d>1e-9){sh.pos[0]+=dx/d*TUNING.shade_speed*dt;sh.pos[2]+=dz/d*TUNING.shade_speed*dt}if(this.invulnerable<=0&&distance2(p,sh.pos)<=TUNING.shade_hit_radius**2){this.hit('shade');break}}
    if(this.randomMotes&&this.tick%900===0&&this.motes.length<24)this.spawnMote();if(this.randomShades&&this.tick%1800===0&&this.shades.length<5){this.spawnShade();this.emit('shade_spawned',{id:this.shades.at(-1).id})}
    if(this.player.flames<=0)this.finish('lost','no_flames');else if(this.lanterns.every(l=>l.lit))this.finish('won','all_lit');else if(this.timeLeft<=0)this.finish('lost','dawn');
  }
  interact(){if(this.player.carried<=0)return;const l=this.lanterns.filter(x=>!x.lit&&distance2(this.player.pos,x.pos)<=TUNING.interact_radius**2).sort((a,b)=>distance2(this.player.pos,a.pos)-distance2(this.player.pos,b.pos))[0];if(!l)return;const amount=Math.min(this.player.carried,TUNING.lantern_cost-l.deposited);if(amount<=0)return;l.deposited+=amount;this.player.carried-=amount;this.emit('deposit',{lantern_id:l.id,amount,deposited:l.deposited});if(l.deposited>=TUNING.lantern_cost){l.lit=true;this.score+=TUNING.score.per_lantern;this.emit('lantern_lit',{lantern_id:l.id})}}
  pulse(){if(this.cooldown>0||this.player.carried<TUNING.pulse_cost)return;this.player.carried-=TUNING.pulse_cost;this.cooldown=TUNING.pulse_cooldown_s;const hit=[];for(const sh of this.shades)if(distance2(this.player.pos,sh.pos)<=TUNING.pulse_radius**2){sh.stun=TUNING.pulse_stun_s;sh.state='stunned';let dx=sh.pos[0]-this.player.pos[0],dz=sh.pos[2]-this.player.pos[2],n=Math.hypot(dx,dz)||1;sh.pos[0]+=dx/n*TUNING.pulse_push_m;sh.pos[2]+=dz/n*TUNING.pulse_push_m;hit.push(sh.id);this.score+=TUNING.score.per_stun}this.emit('pulse',{stunned_ids:hit})}
  hit(by){this.player.flames--;const dropped=Math.min(this.player.carried,Math.floor(this.player.carried*TUNING.hit_drop_ratio));this.player.carried-=dropped;for(let i=0;i<dropped;i++)this.spawnMote([...this.player.pos]);this.invulnerable=TUNING.invuln_s;this.emit('player_hit',{by,flames:this.player.flames,dropped})}
}
