import createRoute from '../createRoute';

describe('ADMIN | CONTAINER | SettingsPage | utils | createRoute', () => {
  it('should return a <Route /> with the correctProps', () => {
    const compo = () => 'test';

    const {
      props: { path },
      key,
    } = createRoute(compo, '/test');

    expect(key).toEqual('/test');
    expect(path).toEqual('/test');
  });
});
