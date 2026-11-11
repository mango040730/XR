import { defineConfig } from 'vite';

export default defineConfig(({mode})=>({
  cacheDir:`node_modules/.vite-xr-${mode}`,
  base: process.env.VITE_BASE_PATH || './',
  optimizeDeps:{include:['react','react-dom/client','@react-three/drei/core/Gltf.js','n8ao']},
  server:{proxy:{'/socket.io':{target:process.env.SOCIAL_SERVER_URL||'http://127.0.0.1:3001',ws:true},'/api/social':{target:process.env.SOCIAL_SERVER_URL||'http://127.0.0.1:3001'}}},
  preview:{proxy:{'/socket.io':{target:process.env.SOCIAL_SERVER_URL||'http://127.0.0.1:3001',ws:true},'/api/social':{target:process.env.SOCIAL_SERVER_URL||'http://127.0.0.1:3001'}}},
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'three', test: /node_modules\/three\/build\// }],
        },
      },
    },
  },
}));
