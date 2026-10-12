import {
  ADMIN_SESSION_CHANNEL,
  ADMIN_SESSION_MESSAGE_TYPE,
  ADMIN_SESSION_STORAGE_KEY,
  notifyOtherTabsOfAdminSessionChange,
  subscribeToAdminSessionChanges,
} from '../adminSessionSync';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const flush = () =>
  new Promise<void>((resolve) => {
    setImmediate(resolve);
  });

describe('adminSessionSync', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('writes a cryptographic id that does not include the access token', () => {
    const token = 'secret-admin-token';
    window.localStorage.setItem('jwtToken', JSON.stringify(token));

    notifyOtherTabsOfAdminSessionChange();
    const first = window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    expect(first).toMatch(UUID_PATTERN);
    expect(first).not.toContain(token);

    notifyOtherTabsOfAdminSessionChange();
    const second = window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    expect(second).toMatch(UUID_PATTERN);
    expect(second).not.toBe(first);
    expect(second).not.toContain(token);
  });

  it('prefers globalThis.crypto.randomUUID when the host provides it', () => {
    const generated = '12345678-1234-4234-8234-123456789abc';
    const randomUUID = jest.fn(() => generated);
    const previous = Object.getOwnPropertyDescriptor(globalThis.crypto, 'randomUUID');

    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      configurable: true,
      writable: true,
      value: randomUUID,
    });

    try {
      notifyOtherTabsOfAdminSessionChange();

      expect(randomUUID).toHaveBeenCalled();
      expect(window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY)).toBe(generated);
      expect(generated).not.toContain('secret-admin-token');
    } finally {
      if (previous) {
        Object.defineProperty(globalThis.crypto, 'randomUUID', previous);
      } else {
        Reflect.deleteProperty(globalThis.crypto, 'randomUUID');
      }
    }
  });

  it('ignores this document and refreshes on a foreign session notice', async () => {
    const onChange = jest.fn();
    const unsubscribe = subscribeToAdminSessionChanges(onChange);

    notifyOtherTabsOfAdminSessionChange();
    await flush();
    expect(onChange).not.toHaveBeenCalled();

    const channel = new BroadcastChannel(ADMIN_SESSION_CHANNEL);
    channel.postMessage({
      type: ADMIN_SESSION_MESSAGE_TYPE,
      tabId: 'another-document',
    });
    channel.close();

    await flush();
    expect(onChange).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('uses getRandomValues when randomUUID is unavailable', () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis.crypto, 'randomUUID');

    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      configurable: true,
      value: undefined,
    });

    try {
      jest.isolateModules(() => {
        const isolated = jest.requireActual(
          '../adminSessionSync'
        ) as typeof import('../adminSessionSync');

        isolated.notifyOtherTabsOfAdminSessionChange();

        expect(window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY)).toMatch(UUID_PATTERN);
      });
    } finally {
      if (previous) {
        Object.defineProperty(globalThis.crypto, 'randomUUID', previous);
      } else {
        Reflect.deleteProperty(globalThis.crypto, 'randomUUID');
      }
    }
  });
});
