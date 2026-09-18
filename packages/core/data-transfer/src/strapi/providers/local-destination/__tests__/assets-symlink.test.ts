import os from 'node:os';
import path from 'node:path';
import * as fse from 'fs-extra';

import { getStrapiFactory } from '../../../../__tests__/test-utils';
import { createLocalStrapiDestinationProvider } from '../index';
import * as restoreApi from '../strategies/restore';

jest.mock('../strategies/restore', () => ({
  __esModule: true,
  ...jest.requireActual('../strategies/restore'),
}));

const createTransaction = () =>
  jest.fn(async (cb) => {
    const trx = {};
    const rollback = jest.fn();
    // eslint-disable-next-line node/no-callback-literal
    await cb({ trx, rollback });
  });

const createProvider = (publicDirectory: string) => {
  const query = {
    stream: jest.fn().mockReturnValue([]),
    transacting: jest.fn().mockReturnThis(),
  };

  const strapi = getStrapiFactory({
    config: {
      get(service: string) {
        if (service === 'plugin::upload') {
          return { provider: 'local' };
        }
      },
    },
    dirs: {
      static: {
        public: publicDirectory,
      },
    },
    db: {
      transaction: createTransaction(),
      queryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue(query),
      }),
      lifecycles: {
        enable: jest.fn(),
        disable: jest.fn(),
      },
    },
  })();

  return createLocalStrapiDestinationProvider({
    getStrapi: () => strapi,
    strategy: 'restore',
    restore: {
      entities: {
        exclude: [],
      },
      assets: true,
    },
  });
};

describe('Local Strapi destination uploads backup', () => {
  let rootDirectory: string;

  beforeEach(async () => {
    rootDirectory = await fse.mkdtemp(path.join(os.tmpdir(), 'strapi-data-transfer-'));
    jest.spyOn(restoreApi, 'deleteRecords').mockResolvedValue();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fse.remove(rootDirectory);
  });

  test('preserves an uploads symlink while backing up its contents', async () => {
    const publicDirectory = path.join(rootDirectory, 'public');
    const persistentUploadsDirectory = path.join(rootDirectory, 'persistent-uploads');
    const uploadsDirectory = path.join(publicDirectory, 'uploads');

    await fse.ensureDir(publicDirectory);
    await fse.ensureDir(persistentUploadsDirectory);
    await fse.outputFile(path.join(persistentUploadsDirectory, 'existing.txt'), 'existing asset');
    await fse.symlink(persistentUploadsDirectory, uploadsDirectory, 'dir');

    const provider = createProvider(publicDirectory);
    await provider.bootstrap();
    await provider.beforeTransfer();

    const uploadsStats = await fse.lstat(uploadsDirectory);
    expect(uploadsStats.isSymbolicLink()).toBe(true);
    expect(await fse.realpath(uploadsDirectory)).toBe(await fse.realpath(persistentUploadsDirectory));

    const backupDirectory = path.join(publicDirectory, provider.uploadsBackupDirectoryName);
    await expect(fse.readFile(path.join(backupDirectory, 'existing.txt'), 'utf8')).resolves.toBe(
      'existing asset'
    );
    expect(await fse.pathExists(path.join(uploadsDirectory, 'existing.txt'))).toBe(false);
    expect(await fse.pathExists(path.join(uploadsDirectory, '.gitkeep'))).toBe(true);
  });

  test('keeps the existing backup behavior for a regular uploads directory', async () => {
    const publicDirectory = path.join(rootDirectory, 'public');
    const uploadsDirectory = path.join(publicDirectory, 'uploads');

    await fse.ensureDir(uploadsDirectory);
    await fse.outputFile(path.join(uploadsDirectory, 'existing.txt'), 'existing asset');

    const provider = createProvider(publicDirectory);
    await provider.bootstrap();
    await provider.beforeTransfer();

    const uploadsStats = await fse.lstat(uploadsDirectory);
    expect(uploadsStats.isDirectory()).toBe(true);
    expect(uploadsStats.isSymbolicLink()).toBe(false);

    const backupDirectory = path.join(publicDirectory, provider.uploadsBackupDirectoryName);
    await expect(fse.readFile(path.join(backupDirectory, 'existing.txt'), 'utf8')).resolves.toBe(
      'existing asset'
    );
    expect(await fse.pathExists(path.join(uploadsDirectory, 'existing.txt'))).toBe(false);
    expect(await fse.pathExists(path.join(uploadsDirectory, '.gitkeep'))).toBe(true);
  });
});
