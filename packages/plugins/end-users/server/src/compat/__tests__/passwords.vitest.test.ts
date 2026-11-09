import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import type { CompatConfig } from '../config';
import { changePassword, resetPassword } from '../endpoints/passwords';

const setup = (emailPassword: boolean) => {
  const callNative = vi.fn();
  const strapi = {
    plugin: () => ({
      service: (name: string) =>
        name === 'settings'
          ? { get: async () => ({ methods: { emailPassword } }) }
          : { get: () => ({ callNative }) },
    }),
  } as unknown as Core.Strapi;

  return { strapi, callNative };
};

const cfg = {} as CompatConfig;
const headers = new Headers();

describe('the compat password endpoints', () => {
  it('refuse a reset while email and password sign-in is off, as /local does', async () => {
    const { strapi, callNative } = setup(false);
    const body = { code: 'c', password: 'pw-1', passwordConfirmation: 'pw-1' };

    const result = await resetPassword(strapi, cfg, {
      body,
      headers,
      userOfCode: async () => 'user',
    });

    expect(result).toMatchObject({ status: 400 });
    expect(JSON.stringify(result.body)).toContain('This provider is disabled.');
    expect(callNative).not.toHaveBeenCalled();
  });

  it('refuse a password change while email and password sign-in is off', async () => {
    const { strapi, callNative } = setup(false);
    const body = { currentPassword: 'a', password: 'pw-1', passwordConfirmation: 'pw-1' };

    const result = await changePassword(strapi, cfg, { body, headers });

    expect(result).toMatchObject({ status: 400 });
    expect(JSON.stringify(result.body)).toContain('This provider is disabled.');
    expect(callNative).not.toHaveBeenCalled();
  });

  it('go on to the engine while it is on', async () => {
    const { strapi, callNative } = setup(true);

    callNative.mockRejectedValue(new Error('reached the engine'));

    await expect(
      changePassword(strapi, cfg, {
        body: { currentPassword: 'a', password: 'pw-1', passwordConfirmation: 'pw-1' },
        headers,
      })
    ).rejects.toThrow('reached the engine');
  });
});
