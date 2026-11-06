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

const mockBundleWatcher = { close: jest.fn() };

jest.mock('../create-build-context', () => ({
  createBuildContext: jest.fn().mockResolvedValue({ bundler: 'vite' }),
}));

jest.mock('../staticFiles', () => ({
  writeStaticClientFiles: jest.fn(),
}));

jest.mock('../vite/watch', () => ({
  watch: () => Promise.resolve(mockBundleWatcher),
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

const runDevelop = async ({ watchAdmin = false }: { watchAdmin?: boolean } = {}) => {
  const logger = createLogger();

  await develop({
    cwd: '/app',
    logger,
    tsconfig: { config: { options: { outDir: '/app/does-not-exist/dist' } }, path: '/app' },
    watchAdmin,
    buildAdmin: false,
  } as unknown as DevelopOptions);

  return logger;
};

describe('develop worker', () => {
  let messageListenersBefore: ReturnType<typeof process.listeners>;
  let disconnectListenersBefore: ReturnType<typeof process.listeners>;

  beforeEach(() => {
    strapiInstance = createStrapiInstance();
    mockCompile.mockReset();
    mockWatch.mockReset();
    const watcher = { on: jest.fn(), close: jest.fn().mockResolvedValue(undefined) };
    watcher.on.mockReturnValue(watcher);
    mockWatch.mockReturnValue(watcher);
    mockBundleWatcher.close.mockReset();
    mockBundleWatcher.close.mockResolvedValue(undefined);
    messageListenersBefore = process.listeners('message');
    disconnectListenersBefore = process.listeners('disconnect');
  });

  afterEach(() => {
    // Only remove the listeners develop added, the test runner owns the others.
    // The disconnect listener calls process.exit(0): it must not outlive the test.
    process
      .listeners('message')
      .filter((listener) => messageListenersBefore.includes(listener) === false)
      .forEach((listener) => process.removeListener('message', listener as () => void));
    process
      .listeners('disconnect')
      .filter((listener) => disconnectListenersBefore.includes(listener) === false)
      .forEach((listener) => process.removeListener('disconnect', listener as () => void));
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

  test('exits when the primary disconnects after the app was stopped', async () => {
    mockCompile.mockRejectedValue(new Error('TypeScript compilation failed'));
    // Strapi.destroy() calls process.removeAllListeners(), which also drops the listener the
    // cluster module adds so a worker exits when its primary goes away. Removing every listener
    // would also break the test runner, so only the disconnect listeners are dropped here.
    strapiInstance.destroy.mockImplementation(async () => {
      process.removeAllListeners('disconnect');
    });
    const exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    try {
      await runDevelop();
      process.emit('disconnect');

      expect(strapiInstance.destroy).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenCalledWith(0);
    } finally {
      exit.mockRestore();
      process.removeAllListeners('disconnect');
      disconnectListenersBefore.forEach((listener) =>
        process.on('disconnect', listener as () => void)
      );
    }
  });

  test('exits the worker when destroying the app fails after a failed compile', async () => {
    mockCompile.mockRejectedValue(new Error('TypeScript compilation failed'));
    // A destroy hook that throws stops destroy() before the providers (cron), the server and
    // the database are closed: the app is still half running.
    strapiInstance.destroy.mockRejectedValue(new Error('destroy hook failed'));
    const exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const send = jest.fn();
    const originalSend = process.send;
    process.send = send;

    try {
      const logger = await runDevelop();
      process.emit('message', 'kill', undefined);
      await new Promise(process.nextTick);
      await new Promise(process.nextTick);

      expect(logger.error).toHaveBeenCalledWith('Error while stopping Strapi: destroy hook failed');
      expect(send).toHaveBeenCalledWith('stop');
      expect(exit).toHaveBeenCalledWith(1);
      expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('Strapi is stopped'));
      // The primary must not fork a new worker while this one still runs cron.
      expect(send).not.toHaveBeenCalledWith('killed');
      expect(mockWatch).not.toHaveBeenCalled();
    } finally {
      exit.mockRestore();
      process.send = originalSend;
    }
  });

  test('does not report the worker as killed when destroying the app fails', async () => {
    mockCompile.mockResolvedValue(undefined);
    const destroyError = new Error('destroy hook failed');
    strapiInstance.destroy.mockRejectedValueOnce(destroyError);
    const send = jest.fn();
    const originalSend = process.send;
    process.send = send;

    try {
      await runDevelop();
      const onMessage = process
        .listeners('message')
        .find((listener) => messageListenersBefore.includes(listener) === false);

      await expect((onMessage as (message: string) => Promise<void>)('kill')).rejects.toBe(
        destroyError
      );
      expect(send).not.toHaveBeenCalledWith('killed');

      // The app was not stopped: the next kill destroys it again.
      await (onMessage as (message: string) => Promise<void>)('kill');
    } finally {
      process.send = originalSend;
    }

    expect(strapiInstance.destroy).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith('killed');
  });

  test('exits on the next file change when the primary is gone', async () => {
    mockCompile.mockRejectedValue(new Error('TypeScript compilation failed'));
    const exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const connected = Object.getOwnPropertyDescriptor(process, 'connected');

    try {
      await runDevelop();
      Object.defineProperty(process, 'connected', { value: false, configurable: true });
      const watcher = mockWatch.mock.results[0].value;
      const [, onChange] = watcher.on.mock.calls.find(([event]: [string]) => event === 'change');
      await onChange('/app/src/index.ts');

      expect(exit).toHaveBeenCalledWith(0);
      expect(strapiInstance.reload).not.toHaveBeenCalled();
    } finally {
      exit.mockRestore();
      if (connected === undefined) {
        delete (process as { connected?: boolean }).connected;
      } else {
        Object.defineProperty(process, 'connected', connected);
      }
    }
  });

  test('closes the admin bundler once when the app is stopped and then restarts', async () => {
    mockCompile.mockRejectedValue(new Error('TypeScript compilation failed'));
    const send = jest.fn();
    const originalSend = process.send;
    process.send = send;

    try {
      await runDevelop({ watchAdmin: true });
      expect(mockBundleWatcher.close).toHaveBeenCalledTimes(1);

      process.emit('message', 'kill', undefined);
      await new Promise(process.nextTick);
      await new Promise(process.nextTick);
    } finally {
      process.send = originalSend;
    }

    expect(mockBundleWatcher.close).toHaveBeenCalledTimes(1);
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
