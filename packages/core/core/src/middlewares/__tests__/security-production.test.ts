/**
 * AdityaOP007 solve issue #26250
 */
import Koa from 'koa';
import request from 'supertest';
import { security } from '../security';

const parseCspHeader = (csp: string) =>
  Object.fromEntries(
    csp
      .split(';')
      .map((directive) => directive.split(' '))
      .map(([k, ...v]) => [k, v])
  );

describe('Security middleware (Production)', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeAll(() => {
    process.env.NODE_ENV = 'production';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('Content security policy in Production', () => {
    // GIVEN
    const app = new Koa();
    const securityMiddleware = security(
      {
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            'img-src': ["'self'", 'https://my-cdn.com'],
            upgradeInsecureRequests: null,
          },
        },
      },
      {
        strapi: {
          plugin: () => null,
          config: {
            get(key: string) {
              if (key === 'admin.path') {
                return '/admin';
              }
            },
          },
        } as any,
      }
    )!;

    // WHEN
    app.use(securityMiddleware);
    const agent = request.agent(app.callback());

    // THEN
    it('includes user custom CSP directives in GET /admin response in production', async () => {
      await agent.get('/admin').expect((req) => {
        const csp = parseCspHeader(req.header['content-security-policy']);
        expect(csp['img-src']).toContain('https://my-cdn.com');
      });
    });

    it('includes required admin CSP directives in GET /admin response even in production', async () => {
      // AdityaOP007 solve issue #26250: This test ensures admin path gets required directives in production
      await agent.get('/admin').expect((req) => {
        const csp = parseCspHeader(req.header['content-security-policy']);
        expect(csp['script-src']).toContain("'unsafe-inline'");
        expect(csp['connect-src']).toContain('ws:');
      });
    });
  });
});
