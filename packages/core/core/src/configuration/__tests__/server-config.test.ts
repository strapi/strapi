import type { Core } from '@strapi/types';

import { warnDeprecatedServerConfig } from '../server-config';

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

describe('warnDeprecatedServerConfig', () => {
  it('warns when server.globalProxy is set', () => {
    const warnings: string[] = [];

    warnDeprecatedServerConfig(
      createConfigProvider({ 'server.globalProxy': 'http://legacy.example' }),
      { warn: (message) => warnings.push(message) }
    );

    expect(warnings).toEqual([
      'server.globalProxy is deprecated and ignored. Use server.proxy.global in config/server instead.',
    ]);
  });

  it('warns when server.admin.autoOpen is set', () => {
    const warnings: string[] = [];

    warnDeprecatedServerConfig(createConfigProvider({ 'server.admin.autoOpen': false }), {
      warn: (message) => warnings.push(message),
    });

    expect(warnings).toEqual([
      'server.admin.autoOpen is deprecated and ignored. Use admin.autoOpen in config/admin instead.',
    ]);
  });

  it('emits both warnings when both deprecated keys are set', () => {
    const warnings: string[] = [];

    warnDeprecatedServerConfig(
      createConfigProvider({
        'server.globalProxy': 'http://legacy.example',
        'server.admin.autoOpen': true,
      }),
      { warn: (message) => warnings.push(message) }
    );

    expect(warnings).toHaveLength(2);
  });

  it('does not warn when deprecated keys are absent', () => {
    const warnings: string[] = [];

    warnDeprecatedServerConfig(createConfigProvider({}), {
      warn: (message) => warnings.push(message),
    });

    expect(warnings).toEqual([]);
  });
});
