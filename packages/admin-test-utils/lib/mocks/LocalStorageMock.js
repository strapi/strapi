'use strict';

class LocalStorageMock {
  constructor() {
    this.store = new Map();
  }

  clear() {
    this.store.clear();
  }

  getItem(key) {
    /**
     * We return null to avoid returning `undefined`
     * because `undefined` is not a valid JSON value.
     */
    return this.store.get(key) ?? null;
  }

  setItem(key, value) {
    this.store.set(key, String(value));
  }

  removeItem(key) {
    this.store.delete(key);
  }

  get length() {
    return this.store.size;
  }
}

// eslint-disable-next-line no-undef
Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: new LocalStorageMock(),
});
