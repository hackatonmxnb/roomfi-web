import { defineConfig } from "cypress";
import { setupNodeEvents } from './src/setupNodeEvents';

export default defineConfig({
  e2e: {
    retries: { runMode: 1, openMode: 0 },
    baseUrl: 'https://roomfi.netlify.app',
    setupNodeEvents
  },
});
