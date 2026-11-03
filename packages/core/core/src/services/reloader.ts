import type { Core } from '@strapi/types';

export const createReloader = (strapi: Core.Strapi) => {
  const state = {
    shouldReload: 0,
    isWatching: true,
  };

  function reload() {
    if (state.shouldReload > 0) {
      // Reset the reloading state
      state.shouldReload -= 1;
      reload.isReloading = false;
      return;
    }

    if (strapi.config.get('autoReload')) {
      process.send?.('reload');
    }
  }

  Object.defineProperty(reload, 'isWatching', {
    configurable: true,
    enumerable: true,
    set(value) {
      // Special state when the reloader is disabled temporarly (see GraphQL plugin example).
      if (state.isWatching === false && value === true) {
        state.shouldReload += 1;
      }
      state.isWatching = value;
    },
    get() {
      return state.isWatching;
    },
  });

  // Turn watching back on without skipping the next reload.
  // Use it when the write that turned watching off was refused, so no restart is pending.
  reload.resumeWatching = () => {
    state.isWatching = true;
  };

  reload.isReloading = false;
  reload.isWatching = true;

  return reload;
};
