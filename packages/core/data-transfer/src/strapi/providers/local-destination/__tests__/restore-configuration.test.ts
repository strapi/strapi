import { Writable } from 'stream';
import type { Core } from '@strapi/types';

import { createConfigurationWriteStream } from '../strategies/restore/configuration';
import type { IConfiguration, Transaction } from '../../../../../types';

const create = jest.fn();

jest.mock('../../../utils/project-settings-logos', () => ({
  restoreProjectSettingsRow: jest.fn(async (_strapi: unknown, row: unknown) => row),
}));

const createStrapi = () =>
  ({
    db: {
      query: jest.fn(() => ({ create })),
    },
  }) as unknown as Core.Strapi;

const createTransaction = () =>
  ({
    attach: jest.fn(async (fn: () => Promise<void>) => fn()),
  }) as unknown as Transaction;

const writeConfig = (stream: Writable, config: IConfiguration) =>
  new Promise<Error | null | undefined>((resolve) => {
    // a callback error is also emitted on the stream; swallow it so the rejection
    // under test does not surface as an unhandled 'error' event
    stream.on('error', () => {});
    stream.write(config, undefined, (error) => resolve(error));
  });

const coreStoreConfig = {
  type: 'core-store',
  value: { id: 82, key: 'plugin_upload_settings', value: { sizeOptimization: true } },
} as unknown as IConfiguration;

afterEach(() => {
  jest.clearAllMocks();
});

describe('Restore configuration', () => {
  test('resolves without an error when the row is created', async () => {
    create.mockResolvedValue({ id: 1 });

    const stream = await createConfigurationWriteStream(createStrapi(), createTransaction());
    const error = await writeConfig(stream, coreStoreConfig);

    expect(error).toBeFalsy();
    expect(create).toHaveBeenCalledTimes(1);
  });

  test('includes the underlying error message when the row cannot be created', async () => {
    create.mockRejectedValue(new Error('duplicate key value violates unique constraint'));

    const stream = await createConfigurationWriteStream(createStrapi(), createTransaction());
    const error = await writeConfig(stream, coreStoreConfig);

    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toContain('duplicate key value violates unique constraint');
  });

  test('identifies the configuration that failed', async () => {
    create.mockRejectedValue(new Error('boom'));

    const stream = await createConfigurationWriteStream(createStrapi(), createTransaction());
    const error = await writeConfig(stream, coreStoreConfig);

    expect(error?.message).toContain('core-store');
    expect(error?.message).toContain('82');
  });

  test('balances the parentheses around the configuration id', async () => {
    create.mockRejectedValue(new Error('boom'));

    const stream = await createConfigurationWriteStream(createStrapi(), createTransaction());
    const error = await writeConfig(stream, coreStoreConfig);

    const message = error?.message ?? '';
    const open = (message.match(/\(/g) ?? []).length;
    const close = (message.match(/\)/g) ?? []).length;

    expect(close).toBe(open);
  });

  test('reports non-Error rejections', async () => {
    create.mockRejectedValue('plain string failure');

    const stream = await createConfigurationWriteStream(createStrapi(), createTransaction());
    const error = await writeConfig(stream, coreStoreConfig);

    expect(error?.message).toContain('plain string failure');
  });
});
