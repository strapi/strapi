import { describe, expect, it } from 'vitest';

import { createModule } from '../index';

const strapi = {} as never;

describe('createModule', () => {
  it('gives each route-less module its own routes array', () => {
    const alpha = createModule('plugin::alpha', {}, strapi);
    const beta = createModule('plugin::beta', {}, strapi);

    expect(alpha.routes).toEqual([]);
    expect(beta.routes).toEqual([]);
    expect(alpha.routes).not.toBe(beta.routes);

    (alpha.routes as unknown as unknown[]).push({ method: 'GET', path: '/alpha' });

    expect(alpha.routes).toHaveLength(1);
    expect(beta.routes).toEqual([]);
  });

  it('keeps the routes a module declares', () => {
    const routes = { admin: { type: 'admin' as const, routes: [] } };
    const gamma = createModule('plugin::gamma', { routes }, strapi);

    expect(gamma.routes).toBe(routes);
  });
});
