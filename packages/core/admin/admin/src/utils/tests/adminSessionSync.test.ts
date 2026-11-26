import {
  ADMIN_SESSION_CHANNEL,
  ADMIN_SESSION_MESSAGE_TYPE,
  ADMIN_SESSION_STORAGE_KEY,
  notifyOtherTabsOfAdminSessionChange,
  subscribeToAdminSessionChanges,
} from '../adminSessionSync';

const flush = () =>
  new Promise<void>((resolve) => {
    setImmediate(resolve);
  });

describe('adminSessionSync', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    window.localStorage.clear();
  });

  it('does not retain the session-change signal', () => {
    window.localStorage.setItem('jwtToken', '"secret-admin-token"');

    notifyOtherTabsOfAdminSessionChange();
    expect(window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem('jwtToken')).toBe('"secret-admin-token"');
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
      expect(window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY)).toBeNull();
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
    const getRandomValues = jest.spyOn(globalThis.crypto, 'getRandomValues');

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

        expect(getRandomValues).toHaveBeenCalled();
        expect(window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY)).toBeNull();
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
