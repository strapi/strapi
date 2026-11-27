import { setToken } from '../../../reducer';
import { setOnSessionExpired } from '../../../utils/getFetchClient';
import { configureStore } from '../configure';

/**
 * jsdom refuses real navigations, so swap `window.location` for a plain object
 * we can assert on. The middleware only ever writes `href`.
 */
const stubLocation = (pathname = '/', search = '') => {
  const location = { href: '', pathname, search };

  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: location,
  });

  return location;
};

// A rejected thunk action shaped like the ones RTK Query emits, but not owned
// by the api slice, so it can flow through the store without cache metadata.
const rejectedWith = (status: number) => ({
  type: 'test/probe/rejected',
  payload: { status },
  meta: { requestId: 'test', rejectedWithValue: true, requestStatus: 'rejected' as const },
  error: { message: 'Rejected' },
});

describe('configureStore / unauthorized middleware', () => {
  const originalLocation = window.location;

  afterEach(() => {
    setOnSessionExpired(null);
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it('hands a 401 to the session-expired handler instead of reloading the app', () => {
    const location = stubLocation();
    const onSessionExpired = jest.fn();
    setOnSessionExpired(onSessionExpired);

    const store = configureStore();
    store.dispatch(setToken('a-token'));

    store.dispatch(rejectedWith(401));

    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    // AuthProvider owns the logout (it may prompt about unsaved changes first).
    expect(location.href).toBe('');
    expect(store.getState().admin_app.token).toBe('a-token');
  });

  it('does not invoke the session-expired handler twice for two 401 rejections', () => {
    stubLocation();
    const onSessionExpired = jest.fn();
    setOnSessionExpired(onSessionExpired);

    const store = configureStore();
    store.dispatch(setToken('a-token'));

    store.dispatch(rejectedWith(401));
    store.dispatch(rejectedWith(401));

    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('falls back to logging out and redirecting when nothing handles the expiry', () => {
    const location = stubLocation();
    setOnSessionExpired(null);

    const store = configureStore();
    store.dispatch(setToken('a-token'));

    store.dispatch(rejectedWith(401));

    expect(store.getState().admin_app.token).toBeNull();
    expect(location.href).toContain('/auth/login');
  });

  it('keeps the current page as redirectTo when falling back to the login page', () => {
    const originalAdminPath = process.env.ADMIN_PATH;
    process.env.ADMIN_PATH = '/admin';
    const location = stubLocation('/admin/content-manager/collection-types/api::a.a/1', '?page=2');
    setOnSessionExpired(null);

    const store = configureStore();
    store.dispatch(setToken('a-token'));

    store.dispatch(rejectedWith(401));
    process.env.ADMIN_PATH = originalAdminPath;

    expect(location.href).toBe(
      '/admin/auth/login?redirectTo=%2Fcontent-manager%2Fcollection-types%2Fapi%3A%3Aa.a%2F1%3Fpage%3D2'
    );
  });

  it('does not add a redirectTo when the browser is outside the admin basename', () => {
    const originalAdminPath = process.env.ADMIN_PATH;
    process.env.ADMIN_PATH = '/admin';
    const location = stubLocation('/elsewhere', '?x=1');
    setOnSessionExpired(null);

    const store = configureStore();
    store.dispatch(setToken('a-token'));

    store.dispatch(rejectedWith(401));
    process.env.ADMIN_PATH = originalAdminPath;

    expect(location.href).toBe('/admin/auth/login');
  });

  it('leaves non-401 rejections alone', () => {
    const location = stubLocation();
    const onSessionExpired = jest.fn();
    setOnSessionExpired(onSessionExpired);

    const store = configureStore();
    store.dispatch(setToken('a-token'));

    store.dispatch(rejectedWith(403));

    expect(onSessionExpired).not.toHaveBeenCalled();
    expect(location.href).toBe('');
    expect(store.getState().admin_app.token).toBe('a-token');
  });
});
