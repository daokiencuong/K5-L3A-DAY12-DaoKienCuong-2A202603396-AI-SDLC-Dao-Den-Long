import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';

export default defineConfig({
  plugins:[react()],
  server:{proxy:{'/api':'http://127.0.0.1:3001'}},
  build:{rollupOptions:{input:{main:resolve(process.cwd(),'index.html'),bench:resolve(process.cwd(),'bench.html')},output:{manualChunks(id){if(id.includes('/node_modules/three/'))return'three-engine';if(id.includes('/node_modules/react')||id.includes('/node_modules/scheduler/'))return'react-runtime'}}}}
});
