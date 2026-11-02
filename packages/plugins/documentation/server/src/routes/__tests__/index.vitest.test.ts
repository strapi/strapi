import { describe, expect, it } from 'vitest';
import Router from '@koa/router';

import routes from '../index';

const router = new Router({ prefix: '/documentation' });
routes.forEach(({ method, path }) => {
  router.register(path, [method], () => undefined, { name: path });
});

const matchedRoutes = (url: string) =>
  router.match(url, 'GET').pathAndMethod.map((layer) => layer.name);

describe('Documentation routes', () => {
  it('serves a versioned documentation', () => {
    expect(matchedRoutes('/documentation/v1.2.3')).toEqual(['/v:major.:minor.:patch']);
  });

  it('does not serve a versioned documentation with extra segments', () => {
    expect(matchedRoutes('/documentation/v1.2.3/extra')).toEqual([]);
  });

  // The controller rejects the non-numeric patch with a 404.
  it('passes a non-numeric version to the controller', () => {
    expect(matchedRoutes('/documentation/v1.2.3foo')).toEqual(['/v:major.:minor.:patch']);
  });
});
