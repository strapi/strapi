import type { DevelopOptions } from '../develop';

const mockCompile = jest.fn();
const mockWatch = jest.fn();

jest.mock('node:cluster', () => ({
  __esModule: true,
  default: { isPrimary: false, isWorker: true, on: jest.fn(), fork: jest.fn() },
}));

jest.mock('../core/ensure-admin-dependencies', () => ({
  handleAdminDependencies: jest.fn(),
}));

jest.mock('@strapi/typescript-utils', () => ({
  compile: (...args: unknown[]) => mockCompile(...args),
  generators: { generate: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('@strapi/utils', () => ({
  strings: { joinBy: (sep: string, ...parts: string[]) => parts.join(sep) },
}));

jest.mock('chokidar', () => ({
  watch: (...args: unknown[]) => mockWatch(...args),
}));

const createStrapiInstance = () => {
  const reload = Object.assign(jest.fn(), { isWatching: true, isReloading: false });
  const instance = {
    load: jest.fn(),
    start: jest.fn(),
    destroy: jest.fn().mockResolvedValue(undefined),
    reload,
    dirs: { static: { public: '/app/public' } },
    config: { get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue) },
    log: { info: jest.fn() },
  };
  instance.load.mockResolvedValue(instance);
  return instance;
};

let strapiInstance = createStrapiInstance();

jest.mock('@strapi/core', () => ({
  createStrapi: () => strapiInstance,
}));

// eslint-disable-next-line import/first
import { develop } from '../develop';

const createLogger = () => {
  const spinner = {
    isSpinning: false,
    text: '',
    start() {
      return spinner;
    },
    succeed: jest.fn(),
    fail: jest.fn(),
  };
  return {
    warnings: 0,
    errors: 0,
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    spinner: () => spinner,
  };
};

const runDevelop = async () => {
  const logger = createLogger();

  await develop({
    cwd: '/app',
    logger,
    tsconfig: { config: { options: { outDir: '/app/does-not-exist/dist' } }, path: '/app' },
    watchAdmin: false,
    buildAdmin: false,
  } as unknown as DevelopOptions);

  return logger;
};

describe('develop worker', () => {
  let messageListenersBefore: ReturnType<typeof process.listeners>;

  beforeEach(() => {
    strapiInstance = createStrapiInstance();
    mockCompile.mockReset();
    mockWatch.mockReset();
    const watcher = { on: jest.fn(), close: jest.fn().mockResolvedValue(undefined) };
    watcher.on.mockReturnValue(watcher);
    mockWatch.mockReturnValue(watcher);
    messageListenersBefore = process.listeners('message');
  });

  afterEach(() => {
    // Only remove the listeners develop added, the test runner owns the others.
    process
      .listeners('message')
      .filter((listener) => messageListenersBefore.includes(listener) === false)
      .forEach((listener) => process.removeListener('message', listener as () => void));
  });

  test('stops the loaded app and keeps watching when the TypeScript compile fails', async () => {
    mockCompile.mockRejectedValue(new Error('TypeScript compilation failed'));

    const logger = await runDevelop();

    expect(strapiInstance.load).toHaveBeenCalledTimes(1);
    expect(strapiInstance.destroy).toHaveBeenCalledTimes(1);
    expect(strapiInstance.start).not.toHaveBeenCalled();
    expect(mockWatch).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'Error during development: TypeScript compilation failed'
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Strapi is stopped'));
  });

  test('does not destroy the app twice when it restarts after a failed compile', async () => {
    mockCompile.mockRejectedValue(new Error('TypeScript compilation failed'));
    const send = jest.fn();
    const originalSend = process.send;
    process.send = send;

    try {
      await runDevelop();
      process.emit('message', 'kill', undefined);
      await new Promise(process.nextTick);
      await new Promise(process.nextTick);
    } finally {
      process.send = originalSend;
    }

    expect(strapiInstance.destroy).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('killed');
  });

  test('keeps the app running when the TypeScript compile succeeds', async () => {
    mockCompile.mockResolvedValue(undefined);

    const logger = await runDevelop();

    expect(strapiInstance.destroy).not.toHaveBeenCalled();
    expect(strapiInstance.start).toHaveBeenCalledTimes(1);
    expect(mockWatch).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
