import { defineConfig } from '@playwright/test';
import base from './playwright.config';
// Use Chromium's native GPU backend for optical rendering QA; the default suite retains SwiftShader.
export default defineConfig({...base,use:{...base.use,launchOptions:{args:[]}}});
