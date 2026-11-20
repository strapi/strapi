import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { createStartupLogger } from '../startup-logger';
import { createConfigProvider } from '../../services/config';

const captureLogStats = (config: Core.ConfigProvider) => {
  const lines: string[] = [];
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    lines.push(args.join(' '));
  });

  createStartupLogger({ config, EE: false } as unknown as Core.Strapi).logStats();

  return lines.join('\n');
};

describe('startup logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints the environment, version and launch time from the config', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_500);
    const output = captureLogStats(
      createConfigProvider({
        launchedAt: 1_000,
        environment: 'staging',
        info: { strapi: '5.0.0' },
      })
    );

    expect(output).toContain('500 ms');
    expect(output).toContain('staging');
    expect(output).toContain(`5.0.0 (node ${process.version})`);
  });

  it('prints values written with set after the config was created', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_500);
    const config = createConfigProvider({
      launchedAt: 0,
      environment: 'development',
      info: { strapi: '0.0.0' },
    });
    config.set('launchedAt', 1_000);
    config.set('environment', 'staging');
    // Replace the whole `info` object: a nested `set('info.strapi', …)` would also reach the copy
    config.set('info', { strapi: '5.0.0' });

    const output = captureLogStats(config);

    expect(output).toContain('500 ms');
    expect(output).toContain('staging');
    expect(output).toContain(`5.0.0 (node ${process.version})`);
  });
});
