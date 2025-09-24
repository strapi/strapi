import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'strapi.dev.tipsoption.com',
      '.tipsoption.com', // Wildcard para subdominios
      process.env.ALLOWED_HOST || 'strapi.dev.tipsoption.com'
    ],
    host: '0.0.0.0',
    port: 1337
  }
});