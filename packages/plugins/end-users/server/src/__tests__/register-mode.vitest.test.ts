import type { Core } from '@strapi/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import plugin from '../index';

const { fullRegister, registerCheckMode, isCheckMode } = vi.hoisted(() => ({
  fullRegister: vi.fn(async () => {}),
  registerCheckMode: vi.fn(),
  isCheckMode: vi.fn(),
}));

vi.mock('../register', () => ({ default: fullRegister }));
vi.mock('../migration/check-mode', () => ({
  registerCheckMode,
  bootstrapCheckMode: vi.fn(),
}));
vi.mock('../migration/config', () => ({ isCheckMode }));

describe('which register runs', () => {
  const strapi = {} as Core.Strapi;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs the full register, which opts in to the GraphQL changes, outside check mode', async () => {
    isCheckMode.mockReturnValue(false);

    await plugin.register({ strapi });

    expect(fullRegister).toHaveBeenCalledWith({ strapi });
    expect(registerCheckMode).not.toHaveBeenCalled();
  });

  it('keeps the plugin dormant in check mode: the full register, and its GraphQL opt-in, do not run', async () => {
    isCheckMode.mockReturnValue(true);

    await plugin.register({ strapi });

    expect(registerCheckMode).toHaveBeenCalledWith(strapi);
    expect(fullRegister).not.toHaveBeenCalled();
  });
});
