import { describe, it, expect, vi } from 'vitest';
import open from 'open';

import type { Core } from '@strapi/types';

import { openBrowser } from '../open-browser';

vi.mock('open', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

describe('openBrowser', () => {
  it('opens the admin absolute URL', async () => {
    const config = {
      get: vi.fn().mockReturnValue('http://localhost:1337/admin'),
    } as unknown as Core.ConfigProvider;

    await openBrowser(config);

    expect(config.get).toHaveBeenCalledWith('admin.absoluteUrl');
    expect(open).toHaveBeenCalledWith('http://localhost:1337/admin');
  });
});
