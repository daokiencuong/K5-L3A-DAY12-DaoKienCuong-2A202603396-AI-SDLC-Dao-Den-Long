import {spawn} from 'node:child_process';
const children=[spawn(process.execPath,['server.js','--api-only'],{stdio:'inherit',windowsHide:true}),spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','0.0.0.0'],{stdio:'inherit',windowsHide:false})];
let closing=false;function stop(code=0){if(closing)return;closing=true;for(const child of children)if(child.exitCode===null)child.kill();process.exitCode=code}
for(const child of children){child.on('error',error=>{console.error(error);stop(1)});child.on('exit',code=>{if(!closing)stop(code||0)})}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>stop(0));
