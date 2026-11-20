import {startGame} from './game.js';
import {summarizeFrameTimes} from './src/bench-metrics.js';
import './style.css';

const startedAt=Number(new URLSearchParams(location.search).get('startedAt'))||Date.now();
const duration=Number(new URLSearchParams(location.search).get('duration'))||30;
let stop=null,firstFrame=null,measureStart=null,lastFrame=null,elapsedMs=0,frameTimes=[];
function done(){
 window.__benchResult={contract_version:'1.3',...summarizeFrameTimes(frameTimes,Math.max(1,elapsedMs)),load_ms:Math.round(window.__benchFirstFrame??Date.now()-startedAt),peak_mem_mb:null,vsync_off:true,renderer:window.__benchRenderer||'WebGLRenderer (Three.js)',os:window.__benchOS||'browser host'};
 stop?.();
}
stop=startGame(()=>{}, {night:1,seed:Number(new URLSearchParams(location.search).get('seed'))||42,benchmark:{onRenderer:info=>{window.__benchRenderer=`Three.js r${info.revision} / WebGL ${info.gl} / ${navigator.userAgent}`},onFrame:time=>{
 if(firstFrame===null){firstFrame=time;lastFrame=time;window.__benchFirstFrame=Date.now()-startedAt;return}
 const elapsed=time-firstFrame;if(elapsed<3000){lastFrame=time;return}
 if(measureStart===null){measureStart=time;lastFrame=time;return}
 const end=measureStart+duration*1000;if(time>end){const tail=end-lastFrame;if(tail>0){frameTimes.push(tail);elapsedMs+=tail}done();return}
 const dt=time-lastFrame;if(dt>0){frameTimes.push(dt);elapsedMs+=dt}lastFrame=time;
}}});
window.__benchReady=true;
