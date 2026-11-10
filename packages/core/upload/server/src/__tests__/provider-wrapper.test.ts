import { join } from 'path';
import { errors } from '@strapi/utils';

jest.mock('sharp', () => {
  return {
    __esModule: true,
    default: Object.assign(jest.fn(), {
      cache: jest.fn(),
      concurrency: jest.fn(),
    }),
  };
});

// The provider instance the stub module's `init` returns, set by each test.
let mockProviderInstance: Record<string, unknown> = {};

jest.mock(
  'provider-wrapper-stub',
  () => ({
    init: () => mockProviderInstance,
  }),
  { virtual: true }
);

/* eslint-disable import/first -- mocks run before the imports */
import { register } from '../register';
/* eslint-enable import/first */

/** The wrapped provider, read by name as the tests call members the type does not list. */
type LooseProvider = Record<string, (...args: unknown[]) => unknown>;

const registerStubProvider = async (
  instance: Record<string, unknown>,
  actionOptions: Record<string, unknown> = {}
) => {
  mockProviderInstance = instance;

  const upload: { provider?: LooseProvider } = {};
  const stub = {
    dirs: { app: { root: process.cwd() }, static: { public: join(process.cwd(), 'public') } },
    plugins: { upload },
    db: { migrations: { providers: { internal: { register: jest.fn() } } } },
    server: { app: { on: jest.fn() }, routes: jest.fn() },
    admin: { services: { permission: { actionProvider: { registerMany: jest.fn() } } } },
    config: {
      get: jest.fn().mockReturnValueOnce({ provider: 'provider-wrapper-stub', actionOptions }),
      set: jest.fn(),
    },
    get: jest.fn().mockReturnValue({ add: jest.fn() }),
  };
  // The unit setup's `strapi` setter adds `plugin(name)` to the stub.
  Object.assign(globalThis, { strapi: stub });

  await register({ strapi });

  const { provider } = upload;
  if (provider === undefined) {
    throw new Error('register did not set the upload provider');
  }

  return provider;
};

const file = { name: 'cover.png', size: 2, originalFilename: 'cover.png' };

describe('Upload provider wrapper', () => {
  beforeEach(() => {
    jest.spyOn(process, 'emitWarning').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('wraps every provider method in an async function forwarding (file, options)', async () => {
    const upload = jest.fn().mockReturnValue('upload result');
    const uploadStream = jest.fn().mockResolvedValue({ streamed: true });
    const remove = jest.fn().mockReturnValue(undefined);
    const custom = jest.fn().mockReturnValue(42);

    const provider = await registerStubProvider(
      { upload, uploadStream, delete: remove, custom },
      { upload: { ACL: 'private' } }
    );

    for (const name of ['upload', 'uploadStream', 'delete', 'custom']) {
      expect(Object.prototype.hasOwnProperty.call(provider, name)).toBe(true);
      expect(provider[name].constructor.name).toBe('AsyncFunction');
    }

    // Results resolve to whatever the provider returns, sync or async.
    const uploadResult = provider.upload(file);
    expect(uploadResult).toBeInstanceOf(Promise);
    await expect(uploadResult).resolves.toBe('upload result');
    await expect(provider.uploadStream(file)).resolves.toEqual({ streamed: true });
    await expect(provider.delete(file)).resolves.toBeUndefined();
    await expect(provider.custom(file)).resolves.toBe(42);

    // `options` defaults to `actionOptions[method]`, undefined without one.
    expect(upload).toHaveBeenCalledWith(file, { ACL: 'private' });
    expect(uploadStream).toHaveBeenCalledWith(file, undefined);
    expect(remove).toHaveBeenCalledWith(file, undefined);

    // Explicit options win over the action options.
    await provider.upload(file, { ACL: 'public-read' });
    expect(upload).toHaveBeenLastCalledWith(file, { ACL: 'public-read' });
  });

  test('without isPrivate, getSignedUrl and checkFileSize, the base versions apply', async () => {
    const provider = await registerStubProvider({ upload: jest.fn(), delete: jest.fn() });

    expect(Object.prototype.hasOwnProperty.call(provider, 'isPrivate')).toBe(false);
    expect(typeof provider.extend).toBe('function');

    // isPrivate returns false synchronously.
    expect(provider.isPrivate()).toBe(false);

    // getSignedUrl returns the file it receives, synchronously.
    const fileRow = { name: 'cover.png', url: '/uploads/cover.png' };
    expect(provider.getSignedUrl(fileRow)).toBe(fileRow);

    // checkFileSize returns undefined within the limit (size in KB, limit in bytes) or without one.
    expect(provider.checkFileSize(file, { sizeLimit: 4000 })).toBeUndefined();
    expect(provider.checkFileSize(file, { sizeLimit: undefined })).toBeUndefined();

    // checkFileSize throws above the limit.
    expect(() => provider.checkFileSize(file, { sizeLimit: 1000 })).toThrow(
      errors.PayloadTooLargeError
    );
  });

  test('with isPrivate, getSignedUrl and checkFileSize, the wrapped versions return promises', async () => {
    const checkFileSize = jest.fn();
    const provider = await registerStubProvider(
      {
        upload: jest.fn(),
        delete: jest.fn(),
        isPrivate: jest.fn().mockReturnValue(true),
        getSignedUrl: jest.fn().mockReturnValue({ url: 'https://signed.example/cover.png' }),
        checkFileSize,
      },
      { checkFileSize: { strict: true } }
    );

    const isPrivate = provider.isPrivate();
    expect(isPrivate).toBeInstanceOf(Promise);
    await expect(isPrivate).resolves.toBe(true);

    const signed = provider.getSignedUrl(file);
    expect(signed).toBeInstanceOf(Promise);
    await expect(signed).resolves.toEqual({ url: 'https://signed.example/cover.png' });

    const checked = provider.checkFileSize(file, { sizeLimit: 1000 });
    expect(checked).toBeInstanceOf(Promise);
    await expect(checked).resolves.toBeUndefined();
    expect(checkFileSize).toHaveBeenCalledWith(file, { sizeLimit: 1000 });
  });

  test('requires delete', async () => {
    await expect(registerStubProvider({ upload: jest.fn() })).rejects.toThrow(
      `The upload provider "provider-wrapper-stub" doesn't implement the delete method.`
    );
  });

  test('requires upload or uploadStream', async () => {
    await expect(registerStubProvider({ delete: jest.fn() })).rejects.toThrow(
      `The upload provider "provider-wrapper-stub" doesn't implement the uploadStream nor the upload method.`
    );

    await expect(
      registerStubProvider({ uploadStream: jest.fn(), delete: jest.fn() })
    ).resolves.toBeDefined();
  });
});
