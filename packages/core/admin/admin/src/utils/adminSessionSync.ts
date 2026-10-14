/**
 * Cross-tab notice that the shared admin session (localStorage token and/or
 * auth cookie) changed. Identity queries are not keyed by token, so other
 * tabs keep the previous user until they refetch.
 *
 * BroadcastChannel covers cookie-only switches, which do not change
 * `jwtToken` and therefore do not fire a useful `storage` event. The storage
 * key covers browsers without BroadcastChannel. Listeners must not write the
 * key or post again — that ping-pongs. The publishing tab ignores its own
 * broadcast; `storage` events do not fire in the document that wrote them.
 */

const ADMIN_SESSION_CHANNEL = 'strapi-admin-session';
const ADMIN_SESSION_STORAGE_KEY = 'strapi.admin.session-change';
const ADMIN_SESSION_MESSAGE_TYPE = 'session-change';

let ephemeralIdFallback = 0;
let ownTabId: string | undefined;

/**
 * Distinguish this document, and each storage ping, from other tabs.
 * The value is not a credential and must not include the access token.
 * `randomUUID` exists in browsers and in Node ≥ 19; admin tests run on Node ≥ 22.
 * `getRandomValues` covers hosts that have Web Crypto without `randomUUID`.
 * The counter is only for test shims that lack both, so importing this module
 * during SSR does not throw.
 */
const createEphemeralId = (): string => {
  const webCrypto = globalThis.crypto;

  if (typeof webCrypto?.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }

  if (typeof webCrypto?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    webCrypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20),
    ].join('-');
  }

  ephemeralIdFallback += 1;

  return `strapi-admin-${Date.now().toString(36)}-${ephemeralIdFallback.toString(36)}`;
};

const getOwnTabId = (): string => {
  if (!ownTabId) {
    ownTabId = createEphemeralId();
  }

  return ownTabId;
};

interface AdminSessionChangeMessage {
  type: typeof ADMIN_SESSION_MESSAGE_TYPE;
  tabId: string;
}

const canUseDom = (): boolean => typeof window !== 'undefined';

const notifyOtherTabsOfAdminSessionChange = (): void => {
  if (!canUseDom()) {
    return;
  }

  try {
    window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, createEphemeralId());
    window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  } catch {
    // Private mode and some tests disable storage. The in-tab refetch still runs.
  }

  if (typeof BroadcastChannel === 'undefined') {
    return;
  }

  try {
    const channel = new BroadcastChannel(ADMIN_SESSION_CHANNEL);
    const message: AdminSessionChangeMessage = {
      type: ADMIN_SESSION_MESSAGE_TYPE,
      tabId: getOwnTabId(),
    };
    channel.postMessage(message);
    channel.close();
  } catch {
    // Construction can fail in a detached document. The storage signal remains.
  }
};

const isForeignSessionChange = (data: unknown): boolean => {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const message = data as Partial<AdminSessionChangeMessage>;
  if (message.type !== ADMIN_SESSION_MESSAGE_TYPE) {
    return false;
  }

  // Missing tabId is treated as external. Our own publish always sets one.
  return message.tabId !== getOwnTabId();
};

/**
 * Run `onChange` after a session-change notice from another document.
 * A broadcast and a storage event are separate tasks, so this only collapses
 * notices that land in the same turn. Callers still skip a second reset for a
 * token they have already adopted.
 */
const subscribeToAdminSessionChanges = (onChange: () => void): (() => void) => {
  if (!canUseDom()) {
    return () => {};
  }

  let disposed = false;
  let pending = false;

  const scheduleRefresh = () => {
    if (disposed || pending) {
      return;
    }

    pending = true;
    queueMicrotask(() => {
      pending = false;
      if (!disposed) {
        onChange();
      }
    });
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== ADMIN_SESSION_STORAGE_KEY || event.newValue === null) {
      return;
    }

    scheduleRefresh();
  };

  window.addEventListener('storage', handleStorage);

  let channel: BroadcastChannel | undefined;

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(ADMIN_SESSION_CHANNEL);
      channel.addEventListener('message', (event: MessageEvent) => {
        if (isForeignSessionChange(event.data)) {
          scheduleRefresh();
        }
      });
    } catch {
      channel = undefined;
    }
  }

  return () => {
    disposed = true;
    window.removeEventListener('storage', handleStorage);
    channel?.close();
  };
};

export {
  ADMIN_SESSION_CHANNEL,
  ADMIN_SESSION_MESSAGE_TYPE,
  ADMIN_SESSION_STORAGE_KEY,
  notifyOtherTabsOfAdminSessionChange,
  subscribeToAdminSessionChanges,
};
