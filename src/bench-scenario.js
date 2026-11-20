const positions=[[0,0,25],[23.8,0,7.7],[14.7,0,-20.2],[-14.7,0,-20.2],[-23.8,0,7.7]];

export function makeBenchmarkScenario(seed=42){
 let state=(Number(seed)>>>0)||1;const random=()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296};
 const point=()=>{const radius=Math.sqrt(random())*39,angle=random()*Math.PI*2;return [Math.cos(angle)*radius,0,Math.sin(angle)*radius]};
 return {
  player:{pos:[0,0,0],flames:3,carried:0},
  lanterns:positions.map((pos,index)=>({id:`L${index+1}`,pos,lit:index<3,fuel:index<3?100:0,ever_lit:index<3})),
  motes:Array.from({length:100},(_,index)=>({id:`BM${String(index+1).padStart(3,'0')}`,pos:point(),kind:'random'})),
  shades:Array.from({length:200},(_,index)=>({id:`BS${String(index+1).padStart(3,'0')}`,pos:point(),state:'wander',target_lantern_id:null})),
  drifters:[],charms:[],random_motes:false,random_shades:false,random_drifters:false,wind_enabled:false
 };
}
