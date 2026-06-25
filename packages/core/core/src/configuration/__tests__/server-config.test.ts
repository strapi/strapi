import type { Core } from '@strapi/types';

import { getServerGlobalProxy, shouldOpenAdminOnDevelop } from '../server-config';

const createConfigProvider = (values: Record<string, unknown>): Core.ConfigProvider => ({
  get(path, defaultValue) {
    const key = Array.isArray(path) ? path.join('.') : path;
    return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : defaultValue;
  },
  set() {
    throw new Error('not implemented');
  },
  has(path) {
    const key = Array.isArray(path) ? path.join('.') : path;
    return Object.prototype.hasOwnProperty.call(values, key);
  },
});

describe('server-config helpers', () => {
  describe('getServerGlobalProxy', () => {
    it('prefers server.proxy.global over deprecated server.globalProxy', () => {
      const config = createConfigProvider({
        'server.proxy.global': 'http://proxy.example',
        'server.globalProxy': 'http://legacy.example',
      });

      expect(getServerGlobalProxy(config)).toBe('http://proxy.example');
    });

    it('falls back to deprecated server.globalProxy', () => {
      const config = createConfigProvider({
        'server.globalProxy': 'http://legacy.example',
      });

      expect(getServerGlobalProxy(config)).toBe('http://legacy.example');
    });
  });

  describe('shouldOpenAdminOnDevelop', () => {
    it('prefers admin.autoOpen over deprecated server.admin.autoOpen', () => {
      const config = createConfigProvider({
        'admin.autoOpen': true,
        'server.admin.autoOpen': false,
      });

      expect(shouldOpenAdminOnDevelop(config)).toBe(true);
    });

    it('uses deprecated server.admin.autoOpen when admin.autoOpen is unset', () => {
      const config = createConfigProvider({
        'server.admin.autoOpen': false,
      });

      expect(shouldOpenAdminOnDevelop(config)).toBe(false);
    });

    it('defaults to true when neither key is set', () => {
      expect(shouldOpenAdminOnDevelop(createConfigProvider({}))).toBe(true);
    });

    it('treats explicit false on admin.autoOpen as disabled', () => {
      const config = createConfigProvider({
        'admin.autoOpen': false,
      });

      expect(shouldOpenAdminOnDevelop(config)).toBe(false);
    });
  });
});
