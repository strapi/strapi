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

const OWN_TAB_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

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
    window.localStorage.setItem(
      ADMIN_SESSION_STORAGE_KEY,
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    );
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
      tabId: OWN_TAB_ID,
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
  return message.tabId !== OWN_TAB_ID;
};

/**
 * Run `onChange` after a session-change notice from another document.
 * Coalesces a broadcast and a storage event delivered in the same turn so the
 * refresh reads storage once, after both signals have been observed.
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
