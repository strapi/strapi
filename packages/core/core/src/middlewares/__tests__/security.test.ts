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

describe('Security middleware', () => {
  describe('Content security policy', () => {
    // GIVEN
    const app = new Koa();
    const securityMiddleware = security(
      {
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            'script-src': ["'self'", 'https://cdn.custom.com'],
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
    it.each(['/', '/admin', '/api'])(
      'includes user custom CSP directives in GET %s response',
      async (path) => {
        await agent.get(path).expect((req) => {
          const csp = parseCspHeader(req.header['content-security-policy']);
          expect(csp['script-src']).toContain('https://cdn.custom.com');
        });
      }
    );

    it('includes required default CSP directives in GET /admin response', async () => {
      await agent.get('/admin').expect((req) => {
        const csp = parseCspHeader(req.header['content-security-policy']);
        expect(csp['script-src']).toContain("'unsafe-inline'");
        expect(csp['connect-src']).toContain('ws:');
      });
    });

    it('includes required default CSP directives in GET /documentation response', async () => {
      await agent.get('/documentation').expect((req) => {
        const csp = parseCspHeader(req.header['content-security-policy']);
        expect(csp['script-src']).toContain("'unsafe-inline'");
        expect(csp['script-src']).toContain('cdn.jsdelivr.net');
        expect(csp['img-src']).toContain('strapi.io');
        expect(csp['img-src']).toContain('cdn.jsdelivr.net');
      });
    });
  });
});
