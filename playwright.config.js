const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testMatch: 'test.spec.js',
  webServer: {
    command: 'python -m http.server 8765',
    url: 'http://127.0.0.1:8765',
    reuseExistingServer: true,
    timeout: 15000,
  },
  use: {
    baseURL: 'http://127.0.0.1:8765',
  },
});
