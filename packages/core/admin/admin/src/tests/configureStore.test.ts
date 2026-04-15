import { configureStore } from '../core/store/configure';

jest.mock('../core/utils/basename', () => ({
  getBasename: jest.fn(() => '/custom-admin'),
}));

describe('configureStore unauthorized redirect', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        origin: 'https://example.com',
        href: 'https://example.com/custom-admin',
      } as Location,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });

    jest.clearAllMocks();
  });

  it('redirects to the configured admin login path on 401 responses', () => {
    const store = configureStore();

    store.dispatch({
      type: 'test/rejected',
      payload: { status: 401 },
      meta: { requestStatus: 'rejected', requestId: '1' },
      error: { message: 'Rejected' },
    } as any);

    expect(window.location.href).toBe('https://example.com/custom-admin/auth/login');
  });
});
