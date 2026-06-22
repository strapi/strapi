import { routeVerbs, resolveRoutes } from '../routes';

const noop = () => {};

describe('route DSL', () => {
  it('exposes get/post/put/patch/del verbs (no `delete`)', () => {
    expect(Object.keys(routeVerbs).sort()).toEqual(['del', 'get', 'patch', 'post', 'put']);
  });

  it('maps verbs to HTTP methods', () => {
    expect(routeVerbs.get('/a', noop).method).toBe('GET');
    expect(routeVerbs.post('/a', noop).method).toBe('POST');
    expect(routeVerbs.put('/a', noop).method).toBe('PUT');
    expect(routeVerbs.patch('/a', noop).method).toBe('PATCH');
    expect(routeVerbs.del('/a', noop).method).toBe('DELETE');
  });

  it('produces a RouteInput with handler and optional config', () => {
    const handler = () => ({ ok: true });
    const route = routeVerbs.post('/echo', handler, { auth: false });

    expect(route).toEqual({
      method: 'POST',
      path: '/echo',
      handler,
      config: { auth: false },
    });
  });

  it('omits config when not provided', () => {
    const route = routeVerbs.get('/a', noop);
    expect('config' in route).toBe(false);
  });

  it('throws on invalid path or handler', () => {
    expect(() => routeVerbs.get('', noop)).toThrow(TypeError);
    // @ts-expect-error testing runtime guard
    expect(() => routeVerbs.get('/a', 'nope')).toThrow(TypeError);
  });

  describe('resolveRoutes', () => {
    it('runs a builder function with the verbs', () => {
      const routes = resolveRoutes(({ get, post }) => [get('/a', noop), post('/b', noop)]);
      expect(routes.map((r) => `${r.method} ${r.path}`)).toEqual(['GET /a', 'POST /b']);
    });

    it('passes through an explicit array', () => {
      const explicit = [{ method: 'GET' as const, path: '/a', handler: noop }];
      expect(resolveRoutes(explicit)).toBe(explicit);
    });

    it('throws when a builder does not return an array', () => {
      // @ts-expect-error testing runtime guard
      expect(() => resolveRoutes(() => 'nope')).toThrow(TypeError);
    });
  });
});
