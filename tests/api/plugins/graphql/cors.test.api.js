'use strict';

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const request = require('supertest');
const { createStrapi } = require('../../../../packages/core/strapi/dist/index.js');

// Helper to create Strapi instance with custom GraphQL plugin config
// We need to set config before load() so it's available during plugin bootstrap
const createStrapiInstanceWithCorsConfig = async (corsConfig) => {
  dotenv.config({ path: process.env.ENV_PATH });
  const baseDir = path.dirname(process.env.ENV_PATH);

  const configDir = path.join(baseDir, 'config');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Configure global CORS middleware to allow all so GraphQL plugin's CORS takes precedence
  const middlewaresPath = path.join(configDir, 'middlewares.js');
  const originalMiddlewares = fs.existsSync(middlewaresPath)
    ? fs.readFileSync(middlewaresPath, 'utf8')
    : null;

  const middlewaresContent = `module.exports = [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      origin: '*',
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];`;

  fs.writeFileSync(middlewaresPath, middlewaresContent);

  // Create a temporary plugins config file if corsConfig is defined
  let tempConfigPath = null;
  if (corsConfig !== undefined) {
    tempConfigPath = path.join(configDir, 'plugins.js');

    let corsValue;
    if (corsConfig === false) {
      corsValue = 'false';
    } else if (corsConfig === true) {
      corsValue = 'true';
    } else {
      corsValue = JSON.stringify(corsConfig);
    }

    const configContent = `module.exports = {
  graphql: {
    enabled: true,
    config: {
      apolloServer: {
        cors: ${corsValue},
      },
    },
  },
};`;

    fs.writeFileSync(tempConfigPath, configContent);
  }

  // Store paths for cleanup
  const cleanupFiles = [{ path: middlewaresPath, original: originalMiddlewares }];
  if (tempConfigPath) {
    cleanupFiles.push({ path: tempConfigPath, original: null });
  }

  const instance = createStrapi({
    appDir: baseDir,
    distDir: baseDir,
  });

  // Bypass auth for testing
  instance.get('auth').register('content-api', {
    name: 'test-auth',
    authenticate() {
      return { authenticated: true };
    },
    verify() {},
  });

  await instance.load();
  instance.log.level = 'warn';
  await instance.server.listen();

  // Store cleanup info on instance for afterAll
  instance._corsTestCleanup = cleanupFiles;

  return instance;
};

describe('Test GraphQL Plugin CORS Configuration', () => {
  describe('CORS enabled by default (undefined config)', () => {
    let strapi;

    beforeAll(async () => {
      strapi = await createStrapiInstanceWithCorsConfig(undefined);
    });

    afterAll(async () => {
      if (strapi) {
        await strapi.destroy();
        // Clean up temp config files
        if (strapi._corsTestCleanup) {
          for (const file of strapi._corsTestCleanup) {
            if (file.original !== null) {
              // Restore original file
              fs.writeFileSync(file.path, file.original);
            } else if (fs.existsSync(file.path)) {
              // Delete temp file
              fs.unlinkSync(file.path);
            }
          }
        }
      }
    });

    test('CORS headers are present with default config (undefined)', async () => {
      const supertestAgent = request.agent(strapi.server.httpServer);
      const res = await supertestAgent
        .options('/graphql')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'POST');

      expect(res.statusCode).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBeDefined();
    });

    test('CORS allows all origins by default', async () => {
      const supertestAgent = request.agent(strapi.server.httpServer);
      const res = await supertestAgent
        .options('/graphql')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'POST');

      expect(res.statusCode).toBe(204);
      // @koa/cors with default config returns the origin value when an Origin header is present
      expect(res.headers['access-control-allow-origin']).toBe('https://example.com');
    });
  });

  describe('CORS disabled (cors: false)', () => {
    let strapi;

    beforeAll(async () => {
      strapi = await createStrapiInstanceWithCorsConfig(false);
    });

    afterAll(async () => {
      if (strapi) {
        await strapi.destroy();
        // Clean up temp config files
        if (strapi._corsTestCleanup) {
          for (const file of strapi._corsTestCleanup) {
            if (file.original !== null) {
              // Restore original file
              fs.writeFileSync(file.path, file.original);
            } else if (fs.existsSync(file.path)) {
              // Delete temp file
              fs.unlinkSync(file.path);
            }
          }
        }
      }
    });

    test('CORS headers are still present from global middleware when GraphQL CORS is disabled', async () => {
      const supertestAgent = request.agent(strapi.server.httpServer);
      const res = await supertestAgent
        .options('/graphql')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'POST');

      expect(res.statusCode).toBe(204);
      // GraphQL plugin doesn't add CORS middleware when cors: false, but global CORS still applies
      expect(res.headers['access-control-allow-origin']).toBeDefined();
      // Global CORS allows all origins
      expect(res.headers['access-control-allow-origin']).toBe('https://example.com');
    });
  });

  describe('CORS enabled with boolean true', () => {
    let strapi;

    beforeAll(async () => {
      strapi = await createStrapiInstanceWithCorsConfig(true);
    });

    afterAll(async () => {
      if (strapi) {
        await strapi.destroy();
        // Clean up temp config files
        if (strapi._corsTestCleanup) {
          for (const file of strapi._corsTestCleanup) {
            if (file.original !== null) {
              // Restore original file
              fs.writeFileSync(file.path, file.original);
            } else if (fs.existsSync(file.path)) {
              // Delete temp file
              fs.unlinkSync(file.path);
            }
          }
        }
      }
    });

    test('CORS headers are present when enabled with boolean true', async () => {
      const supertestAgent = request.agent(strapi.server.httpServer);
      const res = await supertestAgent
        .options('/graphql')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'POST');

      expect(res.statusCode).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('CORS with custom origin configuration', () => {
    let strapi;

    beforeAll(async () => {
      strapi = await createStrapiInstanceWithCorsConfig({
        origin: 'https://allowed-origin.com',
        credentials: true,
      });
    });

    afterAll(async () => {
      if (strapi) {
        await strapi.destroy();
        // Clean up temp config files
        if (strapi._corsTestCleanup) {
          for (const file of strapi._corsTestCleanup) {
            if (file.original !== null) {
              // Restore original file
              fs.writeFileSync(file.path, file.original);
            } else if (fs.existsSync(file.path)) {
              // Delete temp file
              fs.unlinkSync(file.path);
            }
          }
        }
      }
    });

    test('CORS allows configured origin with credentials', async () => {
      const supertestAgent = request.agent(strapi.server.httpServer);
      const res = await supertestAgent
        .options('/graphql')
        .set('Origin', 'https://allowed-origin.com')
        .set('Access-Control-Request-Method', 'POST');

      expect(res.statusCode).toBe(204);
      // GraphQL plugin's CORS configuration allows the configured origin
      expect(res.headers['access-control-allow-origin']).toBe('https://allowed-origin.com');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('CORS with multiple allowed origins', () => {
    let strapi;

    beforeAll(async () => {
      strapi = await createStrapiInstanceWithCorsConfig({
        origin: ['https://origin1.com', 'https://origin2.com'],
      });
    });

    afterAll(async () => {
      if (strapi) {
        await strapi.destroy();
        // Clean up temp config files
        if (strapi._corsTestCleanup) {
          for (const file of strapi._corsTestCleanup) {
            if (file.original !== null) {
              // Restore original file
              fs.writeFileSync(file.path, file.original);
            } else if (fs.existsSync(file.path)) {
              // Delete temp file
              fs.unlinkSync(file.path);
            }
          }
        }
      }
    });

    test('CORS allows both configured origins', async () => {
      const supertestAgent = request.agent(strapi.server.httpServer);

      // Test first origin
      const res1 = await supertestAgent
        .options('/graphql')
        .set('Origin', 'https://origin1.com')
        .set('Access-Control-Request-Method', 'POST');
      expect(res1.statusCode).toBe(204);
      expect(res1.headers['access-control-allow-origin']).toBe('https://origin1.com');

      // Test second origin
      const res2 = await supertestAgent
        .options('/graphql')
        .set('Origin', 'https://origin2.com')
        .set('Access-Control-Request-Method', 'POST');
      expect(res2.statusCode).toBe(204);
      expect(res2.headers['access-control-allow-origin']).toBe('https://origin2.com');
    });
  });
});
