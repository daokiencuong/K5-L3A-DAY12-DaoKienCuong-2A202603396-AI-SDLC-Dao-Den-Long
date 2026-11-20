import assert from 'node:assert/strict';
import {Simulation,TUNING} from '../src/sim.js';

const fresh=(night=1,scenario={})=>new Simulation(19,scenario,night);
const event=(sim,name)=>sim.events.find(e=>e.name===name);
// Standardized map layouts and all three supported nights.
assert.equal(TUNING.carry_capacity,10);assert.equal(TUNING.lantern_cost,10);
assert.equal(fresh(1).lanterns.length,5);assert.equal(fresh(2).lanterns.length,6);assert.equal(fresh(3).lanterns.length,7);
assert.equal(fresh(1).motes.length,24);assert.equal(fresh(2).motes.length,24);assert.equal(fresh(3).motes.length,30);
// WASD axes follow the camera basis consistently at zero and quarter-turn yaw.
for(const [move,yaw,axis,sign] of [[[0,1],0,2,1],[[0,-1],0,2,-1],[[1,0],0,0,1],[[-1,0],0,0,-1],[[0,1],90,0,1]]){const q=fresh(1,{motes:[],shades:[],random_shades:false});q.step({move,cam_yaw_deg:yaw});assert.equal(Math.sign(q.player.pos[axis]),sign);}
// Phase 3 replaces Phase 2 deposit scoring: 5 per mote plus first-light 100.
let s=fresh(1,{player:{pos:[0,0,25],carried:10},motes:[],shades:[]});s.step({interact:true});assert.equal(s.score,150);assert.equal(s.player.carried,0);assert(event(s,'lantern_lit'));
// Pulse scores every hit, including a shade already stunned.
s=fresh(1,{player:{pos:[0,0,0],carried:2},motes:[],shades:[{id:'S1',pos:[2,0,0],state:'stunned',state_ticks_left:80}]});s.step({pulse:true});assert.equal(s.score,5);assert.equal(s.player.pulse_cd_ticks,240);
// Phase 3 removes the Phase 2 all-lanterns early-win rule; victory waits for dawn.
s=fresh(1,{time_left_s:12.5,player:{flames:2},lanterns:[{id:'L1',pos:[0,0,0],lit:true}],motes:[],shades:[]});s.step();assert.equal(s.state,'playing');assert.equal(s.score,0);
// Pause increments wall tick only; simulation timers and clocks remain frozen.
s=fresh(1,{player:{invuln_ticks:30},motes:[],shades:[]});s.step({pause:true});assert.equal(s.state,'paused');assert.equal(s.tick,1);assert.equal(s.sim_tick,0);assert.equal(s.player.invuln_ticks,30);s.step({pause:false});s.step({pause:true});assert.equal(s.state,'playing');assert.equal(s.sim_tick,1);
// Dash and charm pick-up/refresh behavior.
s=fresh(2,{player:{pos:[35,0,0]},motes:[],shades:[]});s.step({dash:true,move:[1,0]});assert(event(s,'dash'));assert.equal(s.player.dash_cd_ticks,180);
s=fresh(2,{player:{pos:[35,0,0]},motes:[],shades:[]});s.step();assert(event(s,'charm_picked'));assert.equal(s.player.charm_ticks,600);
// A consumed map mote respawns at its original point after the documented interval.
s=fresh(1,{player:{pos:[0,0,0]},motes:[{id:'M1',pos:[0,0,0],kind:'random'}],random_shades:false});s.step();assert.equal(s.motes.length,0);for(let i=0;i<599;i++)s.step();assert.equal(s.motes.length,1);assert.equal(s.motes[0].kind,'random');
// Drifter steal and pulse drop transitions.
s=fresh(2,{player:{pos:[0,0,0],carried:5},motes:[],shades:[],drifters:[{id:'D1',pos:[0,0,0],state:'chase'}]});s.step();assert(event(s,'drifter_steal'));assert.equal(s.player.carried,2);
s=fresh(2,{player:{pos:[0,0,0],carried:1},motes:[],shades:[],drifters:[{id:'D1',pos:[3,0,0],state:'flee',stolen:2,state_ticks_left:100}]});s.step({pulse:true});assert(event(s,'drifter_drop'));assert.equal(s.motes.length,2);
// Night 1's first scheduled wave is two shades at tick 300.
s=fresh(1,{player:{pos:[0,0,0]},motes:[],random_motes:false});for(let i=0;i<300;i++)s.step();assert.equal(s.shades.length,2);
// Headless scenario hooks can disable procedural schedules and wind.
s=fresh(3,{player:{pos:[0,0,0]},motes:[],shades:[],wind_enabled:false,random_drifters:false});s.sim_tick=1799;s.step();assert.equal(s.wind.active,false);assert.equal(s.drifters.length,0);
s=fresh(3,{player:{pos:[0,0,0]},motes:[],shades:[],random_shades:false,random_drifters:false});s.sim_tick=1679;s.step();assert(event(s,'wind_warning'));assert.equal(s.wind.active,false);for(let i=0;i<120;i++)s.step();assert(s.wind.active);assert(event(s,'wind_start'));
// Falling is hazardous and reports the lost amount explicitly.
s=fresh(1,{player:{pos:[39.9,0,0],carried:4},motes:[],shades:[]});s.step({move:[1,0]});s.step({move:[1,0]});assert(s.events.some(e=>e.name==='player_hit'&&e.data.fall&&e.data.lost===0));
console.log('Phase 2 contract checks passed (maps, scoring, pause, dash, charm, drifter, wind, fall).');
