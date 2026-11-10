import { defineConfig,devices } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/e2e',testMatch:'social.spec.ts',outputDir:'test-results/social-playwright',workers:1,fullyParallel:false,retries:0,timeout:100000,
  expect:{timeout:12000},reporter:[['list'],['json',{outputFile:'test-results/social-e2e-results.json'}]],
  use:{...devices['Desktop Chrome'],channel:'chromium',baseURL:'http://127.0.0.1:4175',viewport:{width:1280,height:800},permissions:['microphone'],trace:'retain-on-failure',screenshot:'only-on-failure',launchOptions:{args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']}},
  webServer:[
    {command:'PORT=4375 HOST=127.0.0.1 ALLOWED_ORIGINS=http://127.0.0.1:4175 npm run server',url:'http://127.0.0.1:4375/health',reuseExistingServer:false},
    {command:'SOCIAL_SERVER_URL=http://127.0.0.1:4375 npm run dev -- --port 4175 --strictPort --mode e2e',url:'http://127.0.0.1:4175',reuseExistingServer:false},
  ],
});
