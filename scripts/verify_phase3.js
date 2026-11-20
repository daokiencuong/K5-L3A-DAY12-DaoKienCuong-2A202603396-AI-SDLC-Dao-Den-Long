import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Simulation,TUNING} from '../src/sim.js';

const fresh=(night=1,scenario={})=>new Simulation(31,scenario,night);
const event=(s,name)=>s.events.find(e=>e.name===name);
const lamp=(id,pos,lit=false,fuel=0,extra={})=>({id,pos,lit,fuel,ever_lit:lit,...extra});
const contract=JSON.parse(fs.readFileSync(new URL('../game.contract.json',import.meta.url),'utf8'));
assert.equal(contract.contract_version,'1.3');for(const[k,v]of Object.entries(TUNING))assert.deepEqual(contract.tuning[k],v,`tuning ${k}`);
assert.deepEqual([TUNING.night1_duration_s,TUNING.night2_duration_s,TUNING.night3_duration_s],[240,270,300]);
for(const [n,count,required]of [[1,5,3],[2,6,4],[3,7,5]]){const s=fresh(n);assert.equal(s.lanterns.length,count);assert.equal(Math.ceil(TUNING.win_ratio*count),required)}

// Scenario normalization, per-tick integer fuel, and paused-tick freeze.
let s=fresh(1,{lanterns:[{id:'L1',pos:[0,0,0],lit:true}],motes:[],shades:[]});assert.equal(s.snapshot().lanterns[0].fuel,100);assert.equal(s.snapshot().lanterns[0].ever_lit,true);for(let i=0;i<60;i++)s.step();assert.equal(s.snapshot().lanterns[0].fuel,99);
s=fresh(1,{lanterns:[lamp('L1',[0,0,0],true,50)],motes:[],shades:[]});s.step({pause:true});assert.equal(s.lanterns[0].fuel_units,3000);s.step({pause:false});assert.equal(s.lanterns[0].fuel_units,3000);

// First light, topping up, relight, id tie-break and capacity growth.
s=fresh(1,{player:{pos:[0,0,25],carried:10},lanterns:[lamp('L2',[1,0,25]),lamp('L1',[-1,0,25])],motes:[],shades:[]});s.step({interact:true});assert(event(s,'lantern_lit'));assert.equal(event(s,'lantern_lit').data.lantern_id,'L1');assert.equal(event(s,'lantern_lit').data.relight,false);assert.equal(s.score,150);assert.equal(s.player.successful_lights,1);assert.equal(s.capacity,12);
s=fresh(1,{player:{pos:[0,0,25],carried:1},lanterns:[lamp('L1',[0,0,25],true,99)],motes:[],shades:[]});s.step({interact:true});assert(event(s,'refuel'));assert.equal(event(s,'refuel').data.amount,1);assert.equal(s.player.carried,0);assert.equal(s.score,5);
s=fresh(1,{player:{pos:[0,0,25],carried:5},lanterns:[lamp('L1',[0,0,25],true,100)],motes:[],shades:[]});s.interactLantern();assert.equal(event(s,'refuel'),undefined);assert.equal(s.score,0);assert.equal(s.player.carried,5,'a full lantern is not eligible for interaction');
s=fresh(1,{player:{pos:[0,0,25],carried:5},lanterns:[lamp('L1',[0,0,25],false,0,{ever_lit:true,relit_count:2})],motes:[],shades:[]});s.step({interact:true});assert.equal(event(s,'lantern_lit').data.relight,true);assert.equal(s.lanterns[0].relit_count,3);assert.equal(s.score,65);assert.equal(s.capacity,12);
s=fresh(1,{player:{pos:[0,0,25],carried:50},lanterns:Array.from({length:5},(_,i)=>lamp(`L${i+1}`,[0,0,25])),motes:[],shades:[]});for(let i=0;i<5;i++)s.interactLantern();assert.equal(s.player.successful_lights,5);assert.equal(s.capacity,20);
s=fresh(1,{lanterns:[lamp('L1',[0,0,0],true,100)],motes:[],shades:[],player:{successful_lights:0}});assert.equal(s.capacity,10);

// Burnout, safe-zone boundary, fuel-drain aggregation, and 60-tick audit event.
s=fresh(1,{lanterns:[lamp('L1',[0,0,0],true,1/60)],motes:[],shades:[]});s.step();assert(event(s,'lantern_out'));assert.equal(s.snapshot().lanterns[0].fuel,0);assert.equal(s.lanterns[0].deposited,0);assert.equal(s.lanterns[0].ever_lit,true);
s=fresh(1,{lanterns:[lamp('L1',[0,0,0],true,20)],motes:[],shades:[{id:'S1',pos:[1,0,0],state:'drain',target_lantern_id:'L1'},{id:'S2',pos:[-1,0,0],state:'drain',target_lantern_id:'L1'}],player:{pos:[0,0,25]}});for(let i=0;i<60;i++)s.step();assert.equal(s.snapshot().lanterns[0].fuel,9);assert.equal(s.events.filter(e=>e.name==='fuel_drain').length,2);
s=fresh(1,{lanterns:[lamp('L1',[0,0,0],true,30.02)],motes:[],shades:[{id:'S1',pos:[0.5,0,0],state:'chase'}],player:{pos:[1,0,0]}});s.step();assert.equal(s.player.flames,3,'30.0 fuel remains inside the safe-zone threshold after decay');
s=fresh(1,{lanterns:[lamp('L1',[0,0,0],true,29.9)],motes:[],shades:[{id:'S1',pos:[0.5,0,0],state:'chase'}],player:{pos:[1,0,0]}});s.step();assert.equal(s.player.flames,2,'a lantern below 30 fuel does not protect the player');

// Shade targeting and drain-state transitions; pulse distinguishes draining shades.
s=fresh(1,{player:{pos:[30,0,0],carried:1},lanterns:[lamp('L1',[0,0,4],true,20),lamp('L2',[0,0,-4])],motes:[],shades:[{id:'S1',pos:[0,0,0],state:'wander'}]});s.step();assert.equal(s.shades[0].target_lantern_id,'L1');
s=fresh(1,{player:{pos:[0,0,25],carried:1},lanterns:[lamp('L1',[0,0,25],true,20)],motes:[],shades:[{id:'S1',pos:[1,0,25],state:'drain',target_lantern_id:'L1'}]});s.step({pulse:true});assert.equal(s.score,15);assert.equal(s.shades[0].state,'stunned');
s=fresh(1,{player:{pos:[5,0,0]},lanterns:[lamp('L1',[0,0,0],true,20)],motes:[],shades:[{id:'S1',pos:[1,0,0],state:'drain',target_lantern_id:'L1'}]});s.step();assert.equal(s.shades[0].state,'chase');
s=fresh(1,{player:{pos:[1,0,0],carried:8},lanterns:[lamp('L1',[0,0,0],true,29)],motes:[],shades:[{id:'S1',pos:[2,0,0],state:'drain',target_lantern_id:'L1'}]});s.step({interact:true});assert.equal(s.shades[0].state,'recoil');assert(s.shades[0].state_ticks_left<=30);assert.equal(s.player.flames,3);

// Dawn threshold and exact bonus; no early win, and no-flames wins precedence.
s=fresh(1,{time_left_s:1/60,player:{flames:2},lanterns:[lamp('L1',[0,0,0],true,80),lamp('L2',[5,0,0],true,40),lamp('L3',[-5,0,0],true,10),lamp('L4',[0,0,5]),lamp('L5',[0,0,-5])],motes:[],shades:[]});s.step();assert.equal(s.state,'won');assert.equal(event(s,'game_over').data.reason,'dawn_survived');assert.equal(s.score,377);
s=fresh(1,{time_left_s:1/60,lanterns:[lamp('L1',[0,0,0],true,80),lamp('L2',[5,0,0],true,40),lamp('L3',[-5,0,0]),lamp('L4',[0,0,5]),lamp('L5',[0,0,-5])],motes:[],shades:[]});s.step();assert.equal(s.state,'lost');assert.equal(event(s,'game_over').data.reason,'dawn');
s=fresh(1,{time_left_s:1/60,player:{pos:[20,0,20],flames:1},lanterns:[lamp('L1',[0,0,0],true,80),lamp('L2',[5,0,0],true,40),lamp('L3',[-5,0,0],true,10)],motes:[],shades:[{id:'S1',pos:[20.5,0,20],state:'chase'}]});s.step();assert.equal(s.state,'lost');assert.equal(event(s,'game_over').data.reason,'no_flames');

console.log('Phase 3 contract checks passed (integer fuel, relight/refuel, drain states, safe zones, scaling capacity, score, dawn endings).');
