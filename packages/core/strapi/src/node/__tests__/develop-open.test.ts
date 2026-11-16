import cluster from 'node:cluster';
import type { DevelopOptions } from '../develop';

jest.mock('node:cluster', () => ({
  __esModule: true,
  default: { isPrimary: false, isWorker: true, on: jest.fn(), fork: jest.fn() },
}));

const mockCluster = cluster as unknown as {
  isPrimary: boolean;
  isWorker: boolean;
  on: jest.Mock;
  fork: jest.Mock;
};

jest.mock('../core/ensure-admin-dependencies', () => ({
  handleAdminDependencies: jest.fn().mockResolvedValue(true),
}));

const mockCompile = jest.fn().mockResolvedValue(undefined);

jest.mock('@strapi/typescript-utils', () => ({
  compile: (...args: unknown[]) => mockCompile(...args),
  generators: { generate: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('@strapi/utils', () => ({
  strings: { joinBy: (sep: string, ...parts: string[]) => parts.join(sep) },
}));

jest.mock('chokidar', () => {
  const watcher = { on: jest.fn(), close: jest.fn().mockResolvedValue(undefined) };
  watcher.on.mockReturnValue(watcher);
  return { watch: () => watcher };
});

const createStrapiInstance = () => {
  const instance = {
    load: jest.fn(),
    start: jest.fn(),
    destroy: jest.fn().mockResolvedValue(undefined),
    reload: Object.assign(jest.fn(), { isWatching: true, isReloading: false }),
    dirs: { static: { public: '/app/public' } },
    config: { get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue) },
    log: { info: jest.fn() },
  };
  instance.load.mockResolvedValue(instance);
  return instance;
};

const mockCreateStrapi = jest.fn(() => createStrapiInstance());

jest.mock('@strapi/core', () => ({
  createStrapi: (...args: unknown[]) => mockCreateStrapi(...(args as [])),
}));

// eslint-disable-next-line import/first
import { develop, getWorkerOpenOption } from '../develop';

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

const runDevelop = (open?: boolean, tsconfig?: DevelopOptions['tsconfig']) =>
  develop({
    cwd: '/app',
    logger: createLogger(),
    watchAdmin: false,
    buildAdmin: false,
    open,
    tsconfig,
  } as unknown as DevelopOptions);

const RESTART_ENV = 'STRAPI_DEVELOP_RESTART';

describe('getWorkerOpenOption', () => {
  it('keeps every value on the first start', () => {
    expect(getWorkerOpenOption(true, false)).toBe(true);
    expect(getWorkerOpenOption(false, false)).toBe(false);
    expect(getWorkerOpenOption(undefined, false)).toBeUndefined();
  });

  it('drops --open on a restart and keeps --no-open', () => {
    expect(getWorkerOpenOption(true, true)).toBeUndefined();
    expect(getWorkerOpenOption(false, true)).toBe(false);
    expect(getWorkerOpenOption(undefined, true)).toBeUndefined();
  });
});

describe('develop open option', () => {
  let messageListenersBefore: ReturnType<typeof process.listeners>;

  beforeEach(() => {
    mockCreateStrapi.mockClear();
    mockCompile.mockReset();
    mockCompile.mockResolvedValue(undefined);
    mockCluster.on.mockClear();
    mockCluster.fork.mockClear();
    messageListenersBefore = process.listeners('message');
    delete process.env[RESTART_ENV];
  });

  afterEach(() => {
    mockCluster.isPrimary = false;
    mockCluster.isWorker = true;
    delete process.env[RESTART_ENV];
    process
      .listeners('message')
      .filter((listener) => messageListenersBefore.includes(listener) === false)
      .forEach((listener) => process.removeListener('message', listener as () => void));
  });

  it('passes --open to createStrapi on the first start', async () => {
    await runDevelop(true);

    expect(mockCreateStrapi).toHaveBeenCalledWith(expect.objectContaining({ open: true }));
  });

  it('does not pass --open to createStrapi on a restarted worker', async () => {
    process.env[RESTART_ENV] = 'true';

    await runDevelop(true);

    expect(mockCreateStrapi).toHaveBeenCalledWith(expect.objectContaining({ open: undefined }));
  });

  it('passes --no-open to createStrapi on a restarted worker', async () => {
    process.env[RESTART_ENV] = 'true';

    await runDevelop(false);

    expect(mockCreateStrapi).toHaveBeenCalledWith(expect.objectContaining({ open: false }));
  });

  it('marks workers forked after a reload as restarts', async () => {
    mockCluster.isPrimary = true;
    mockCluster.isWorker = false;

    await runDevelop(true);

    expect(mockCluster.fork).toHaveBeenCalledTimes(1);
    expect(mockCluster.fork).toHaveBeenLastCalledWith();

    const [, onMessage] = mockCluster.on.mock.calls.find(([event]) => event === 'message')!;
    await onMessage({ send: jest.fn() }, 'started');
    await onMessage({ send: jest.fn() }, 'killed');

    expect(mockCluster.fork).toHaveBeenCalledTimes(2);
    expect(mockCluster.fork).toHaveBeenLastCalledWith({ [RESTART_ENV]: 'true' });
  });

  it('keeps --open for the worker that replaces one that failed before starting', async () => {
    mockCluster.isPrimary = true;
    mockCluster.isWorker = false;

    await runDevelop(true);

    const [, onMessage] = mockCluster.on.mock.calls.find(([event]) => event === 'message')!;
    await onMessage({ send: jest.fn() }, 'killed');

    expect(mockCluster.fork).toHaveBeenCalledTimes(2);
    expect(mockCluster.fork).toHaveBeenLastCalledWith();
  });

  it('sends started to the primary after start() resolves', async () => {
    let resolveStart: () => void = () => undefined;
    const instance = createStrapiInstance();
    instance.start.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveStart = resolve;
      })
    );
    mockCreateStrapi.mockImplementationOnce(() => instance);

    const send = jest.fn();
    const originalSend = process.send;
    process.send = send;

    try {
      await runDevelop(true);

      expect(instance.start).toHaveBeenCalledTimes(1);
      expect(send).not.toHaveBeenCalledWith('started');

      resolveStart();
      await new Promise(process.nextTick);

      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledWith('started');
    } finally {
      process.send = originalSend;
    }
  });

  it('does not send started when the worker fails before the server starts', async () => {
    mockCompile.mockRejectedValue(new Error('TypeScript compilation failed'));
    const send = jest.fn();
    const originalSend = process.send;
    process.send = send;

    try {
      await runDevelop(true, {
        config: { options: { outDir: '/app/does-not-exist/dist' } },
        path: '/app',
      } as unknown as DevelopOptions['tsconfig']);

      const instance = mockCreateStrapi.mock.results[0]?.value;
      expect(instance.start).not.toHaveBeenCalled();
      expect(send).not.toHaveBeenCalledWith('started');
    } finally {
      process.send = originalSend;
    }
  });
});
