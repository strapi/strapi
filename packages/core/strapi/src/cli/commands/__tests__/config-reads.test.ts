import REPL from 'repl';
import { get } from 'lodash';
import { createStrapi } from '@strapi/core';

import { action as reportAction } from '../report';
import { action as consoleAction } from '../console';

jest.mock('repl', () => ({ start: jest.fn() }));
jest.mock('@strapi/core', () => ({
  compileStrapi: jest.fn(async () => ({})),
  createStrapi: jest.fn(),
}));

/**
 * Mirrors the config provider: the startup copy as own keys, plus `get` over the live tree.
 * `liveValues` stands for what `set` wrote after startup; only `get` sees it.
 */
const createConfig = (startupValues: object, liveValues: object = startupValues) => ({
  ...startupValues,
  get: (path: string, defaultValue?: unknown) => get(liveValues, path, defaultValue),
});

const mockApp = (config: ReturnType<typeof createConfig>) => {
  const app = {
    config,
    EE: false,
    destroy: jest.fn(),
    start: jest.fn(async () => undefined),
  };
  const register = jest.fn(async () => app);
  const load = jest.fn(async () => app);
  jest.mocked(createStrapi).mockReturnValue({ register, load } as never);
  return app;
};

const VALUES = {
  launchedAt: 1_000,
  environment: 'staging',
  uuid: 'the-project-uuid',
  info: {
    name: 'my-app',
    strapi: '5.0.0',
    dependencies: { '@strapi/strapi': '5.0.0' },
    devDependencies: { typescript: '5.0.0' },
  },
  database: { connection: { client: 'sqlite' } },
};

describe('CLI commands reading the app config', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1_500);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('report', () => {
    test('prints the config values', async () => {
      mockApp(createConfig(VALUES));

      await reportAction({ uuid: false, dependencies: false, all: true });

      const output = logSpy.mock.calls[0][0] as string;
      expect(output).toContain('Launched In: 500 ms');
      expect(output).toContain('Environment: staging');
      expect(output).toContain('Strapi Version: 5.0.0');
      expect(output).toContain('Database: sqlite');
      expect(output).toContain('UUID: the-project-uuid');
      expect(output).toContain('"@strapi/strapi": "5.0.0"');
      expect(output).toContain('"typescript": "5.0.0"');
    });

    test('prints "unknown" when no database client is configured', async () => {
      mockApp(createConfig({ ...VALUES, database: {} }));

      await reportAction({ uuid: false, dependencies: false, all: false });

      expect(logSpy.mock.calls[0][0]).toContain('Database: unknown');
    });

    test('prints values written with set after startup', async () => {
      mockApp(createConfig(VALUES, { ...VALUES, environment: 'production' }));

      await reportAction({ uuid: false, dependencies: false, all: false });

      expect(logSpy.mock.calls[0][0]).toContain('Environment: production');
    });
  });

  describe('console', () => {
    test('prompts with the app name', async () => {
      mockApp(createConfig(VALUES));
      jest.mocked(REPL.start).mockReturnValue({ on: jest.fn() } as never);

      await consoleAction();
      await new Promise(process.nextTick);

      expect(REPL.start).toHaveBeenCalledWith('my-app > ');
    });
  });
});
