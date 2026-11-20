export function summarizeFrameTimes(frameTimes,durationMs){
 const sorted=[...frameTimes].sort((a,b)=>a-b),frames=frameTimes.length,k=Math.max(1,Math.ceil(.01*frames));
 const averageDt=frameTimes.reduce((sum,dt)=>sum+dt,0)/Math.max(1,frames),slowDt=sorted.slice(-k).reduce((sum,dt)=>sum+dt,0)/k;
 return {frames,avg_fps:Number((1000*frames/durationMs).toFixed(2)),p1_low_fps:Number((1000/slowDt).toFixed(2)),frame_ms_p95:Number((sorted[Math.max(0,Math.ceil(.95*frames)-1)]||0).toFixed(2))};
}
