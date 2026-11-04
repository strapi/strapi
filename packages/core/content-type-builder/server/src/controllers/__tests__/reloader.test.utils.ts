import { vi } from 'vitest';

/**
 * Reproduces `createReloader` from `@strapi/core` (`packages/core/core/src/services/reloader.ts`),
 * including the skip that the `isWatching` setter queues when it goes from `false` to `true`.
 * `send` stands for `process.send('reload')`, which restarts the server.
 */
export const createReloader = () => {
  const send = vi.fn();
  const state = { shouldReload: 0, isWatching: true };

  const reload = Object.assign(
    vi.fn(() => {
      if (state.shouldReload > 0) {
        state.shouldReload -= 1;
        return;
      }

      send('reload');
    }),
    {
      isReloading: false,
      isWatching: true,
      resumeWatching: vi.fn(() => {
        state.isWatching = true;
      }),
    }
  );

  Object.defineProperty(reload, 'isWatching', {
    set(value: boolean) {
      if (state.isWatching === false && value === true) {
        state.shouldReload += 1;
      }
      state.isWatching = value;
    },
    get() {
      return state.isWatching;
    },
  });

  return { reload, send };
};

// Controllers schedule the reload in a `setImmediate` after a successful write
export const flushReload = () =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });
