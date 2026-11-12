import path from 'path';
import fs from 'fs';
import _ from 'lodash';
import createUploadService from '../../upload';
import type { File, InputFile } from '../../../types';

const PROVIDER = 'local';

const defaultConfig = {
  'plugin::upload': {
    provider: PROVIDER,
    concurrentUploadSize: 1,
  },
};

const providerError = new Error('Provider unavailable');
const cleanupError = new Error('cleanup broke');

const providerMethods = {
  upload: jest.fn(),
  replace: jest.fn(),
  delete: jest.fn(),
  checkFileSize: jest.fn(),
};

// Default behaviour is set in `beforeEach`. Image tests override the pieces they need.
const imageManipulationMock = {
  isImage: jest.fn(),
  isFaultyImage: jest.fn(),
  isOptimizableImage: jest.fn(),
  optimize: jest.fn(),
  generateFileName: jest.fn(),
  getDimensions: jest.fn(),
  isResizableImage: jest.fn(),
  generateThumbnail: jest.fn(),
  generateResponsiveFormats: jest.fn(),
};

const fileServiceMock = {
  signFileUrls: jest.fn((file: File) => file),
  getFolderPath: jest.fn(async () => '/'),
};

type DbRow = {
  id: number;
  name: string;
  provider?: string;
  formats?: Record<string, Partial<File>>;
  related?: Array<{ id: number; __type: string; __pivot: { field: string } }>;
};

// Records every file row the upload creates, so the test can see what was persisted.
let createdRows: DbRow[] = [];

const dbCreate = jest.fn(async ({ data }: { data: Omit<DbRow, 'id'> }) => {
  const row: DbRow = { id: createdRows.length + 1, ...data };
  createdRows.push(row);
  return row;
});
const dbFindOne = jest.fn(async ({ where }: { where: { id: number } }) =>
  createdRows.find((r) => r.id === where.id)
);
const dbDelete = jest.fn(async ({ where }: { where: { id: number } }) => where);

const logError = jest.fn();

const services: Record<string, unknown> = {
  provider: providerMethods,
  'image-manipulation': imageManipulationMock,
  file: fileServiceMock,
};

// The Strapi instance is only partly modelled, so this one object keeps its cast.
global.strapi = {
  config: {
    get: (configPath: string, defaultValue: unknown) =>
      _.get(defaultConfig, configPath, defaultValue),
  },
  get: () => ({ transform: () => ({}) }),
  getModel: () => ({ attributes: {} }),
  log: { error: logError },
  db: {
    query: () => ({
      create: dbCreate,
      findOne: dbFindOne,
      delete: dbDelete,
    }),
  },
  eventHub: { emit: jest.fn() },
  plugins: {
    upload: {
      services,
      provider: providerMethods,
      service: (name: string) => services[name],
    },
  },
  plugin: (name: string) => global.strapi.plugins[name],
} as any;

const uploadService = createUploadService({ strapi: global.strapi } as any);

const firstFilePath = path.join(__dirname, './rollback-first.txt');
const secondFilePath = path.join(__dirname, './rollback-second.txt');
const thirdFilePath = path.join(__dirname, './rollback-third.txt');
const bulkFilePaths = [1, 2, 3, 4, 5].map((n) => path.join(__dirname, `./rollback-bulk-${n}.txt`));

const inputFile = (filepath: string, originalFilename: string, mimetype = 'text/plain') =>
  ({
    filepath,
    originalFilename,
    mimetype,
    size: fs.statSync(filepath).size,
  }) as unknown as InputFile;

const runUpload = (files: InputFile[], data: Record<string, unknown> = {}) =>
  uploadService.upload({ data, files });

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

describe('Upload service - multi-file rollback', () => {
  beforeAll(() => {
    fs.writeFileSync(firstFilePath, 'first');
    fs.writeFileSync(secondFilePath, 'second');
    fs.writeFileSync(thirdFilePath, 'third');
    bulkFilePaths.forEach((filePath) => fs.writeFileSync(filePath, 'bulk'));
  });

  afterAll(() => {
    fs.rmSync(firstFilePath, { force: true });
    fs.rmSync(secondFilePath, { force: true });
    fs.rmSync(thirdFilePath, { force: true });
    bulkFilePaths.forEach((filePath) => fs.rmSync(filePath, { force: true }));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    createdRows = [];
    defaultConfig['plugin::upload'].concurrentUploadSize = 1;

    // By default every provider call succeeds, and so does every cleanup delete.
    providerMethods.upload.mockImplementation(async () => undefined);
    providerMethods.delete.mockImplementation(async () => undefined);

    // Text files are not images. Image files are detected by their MIME type.
    imageManipulationMock.isImage.mockImplementation(async (file: { mime: string }) =>
      file.mime.startsWith('image/')
    );
    imageManipulationMock.isFaultyImage.mockResolvedValue(false);
    imageManipulationMock.isOptimizableImage.mockResolvedValue(false);
    imageManipulationMock.generateFileName.mockImplementation((name: string) => name);
    imageManipulationMock.getDimensions.mockResolvedValue({ width: 640, height: 480 });
    imageManipulationMock.isResizableImage.mockResolvedValue(false);
    imageManipulationMock.generateThumbnail.mockResolvedValue(null);
    imageManipulationMock.generateResponsiveFormats.mockResolvedValue([]);
  });

  test('a failed second file rejects with the original provider error and cleans up the first file', async () => {
    providerMethods.upload.mockImplementation(async (file: File) => {
      if (file.name === 'second.txt') {
        throw providerError;
      }
    });

    const files = [inputFile(firstFilePath, 'first.txt'), inputFile(secondFilePath, 'second.txt')];

    await expect(runUpload(files)).rejects.toBe(providerError);

    // The first file reached the provider and the database before the second file failed.
    expect(providerMethods.upload).toHaveBeenCalledTimes(2);
    expect(createdRows).toHaveLength(1);
    const [firstRow] = createdRows;
    expect(firstRow.name).toBe('first.txt');

    // Rollback: the first file must be removed from the provider and from the database.
    expect(providerMethods.delete).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'first.txt' })
    );
    expect(dbDelete).toHaveBeenCalledWith({ where: { id: firstRow.id } });
  });

  test('across batches: a failure in the third batch rolls back the first two files', async () => {
    defaultConfig['plugin::upload'].concurrentUploadSize = 1;
    providerMethods.upload.mockImplementation(async (file: File) => {
      if (file.name === 'third.txt') {
        throw providerError;
      }
    });

    const files = [
      inputFile(firstFilePath, 'first.txt'),
      inputFile(secondFilePath, 'second.txt'),
      inputFile(thirdFilePath, 'third.txt'),
    ];

    await expect(runUpload(files)).rejects.toBe(providerError);

    const [firstRow, secondRow] = createdRows;
    expect(createdRows.map((row) => row.name)).toEqual(['first.txt', 'second.txt']);

    expect(providerMethods.delete).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'first.txt' })
    );
    expect(providerMethods.delete).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'second.txt' })
    );
    expect(dbDelete).toHaveBeenCalledWith({ where: { id: firstRow.id } });
    expect(dbDelete).toHaveBeenCalledWith({ where: { id: secondRow.id } });

    // The third file never reached the database, so there is nothing to remove for it.
    expect(providerMethods.delete).not.toHaveBeenCalledWith(
      expect.objectContaining({ name: 'third.txt' })
    );
  });

  test('same batch: cleanup waits for the slow sibling to settle before it removes the saved file', async () => {
    defaultConfig['plugin::upload'].concurrentUploadSize = 2;

    const events: string[] = [];

    providerMethods.upload.mockImplementation(async (file: File) => {
      if (file.name === 'first.txt') {
        // The slow sibling finishes after the fast one has already failed.
        await wait(20);
        events.push('uploaded:first');
        return undefined;
      }
      events.push('failed:second');
      throw providerError;
    });
    providerMethods.delete.mockImplementation(async (file: File) => {
      events.push(`deleted:${file.name}`);
    });

    const files = [inputFile(firstFilePath, 'first.txt'), inputFile(secondFilePath, 'second.txt')];

    await expect(runUpload(files)).rejects.toBe(providerError);

    // The rollback starts only after the sibling has finished uploading.
    expect(events).toEqual(['failed:second', 'uploaded:first', 'deleted:first.txt']);
    expect(dbDelete).toHaveBeenCalledWith({ where: { id: createdRows[0].id } });
  });

  test('image case: a failed second image removes the first image, its thumbnail and its responsive format', async () => {
    imageManipulationMock.isResizableImage.mockResolvedValue(true);
    imageManipulationMock.generateThumbnail.mockImplementation(async (file: File) => ({
      name: `thumbnail_${file.name}`,
      hash: `thumbnail_${file.hash}`,
      ext: file.ext,
      mime: file.mime,
      size: 1,
    }));
    imageManipulationMock.generateResponsiveFormats.mockImplementation(async (file: File) => [
      {
        key: 'small',
        file: {
          name: `small_${file.name}`,
          hash: `small_${file.hash}`,
          ext: file.ext,
          mime: file.mime,
          size: 1,
        },
      },
    ]);
    providerMethods.upload.mockImplementation(async (file: File) => {
      if (file.name === 'second.png') {
        throw providerError;
      }
    });

    const files = [
      inputFile(firstFilePath, 'first.png', 'image/png'),
      inputFile(secondFilePath, 'second.png', 'image/png'),
    ];

    await expect(runUpload(files)).rejects.toBe(providerError);

    // The formats are stored on the row, because they are set before add() runs.
    const [firstRow] = createdRows;
    expect(firstRow.formats).toEqual({
      thumbnail: expect.objectContaining({ name: 'thumbnail_first.png' }),
      small: expect.objectContaining({ name: 'small_first.png' }),
    });

    // remove() deletes the original and each format from the provider.
    expect(providerMethods.delete).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'first.png' })
    );
    expect(providerMethods.delete).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'thumbnail_first.png' })
    );
    expect(providerMethods.delete).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'small_first.png' })
    );
    expect(dbDelete).toHaveBeenCalledWith({ where: { id: firstRow.id } });
  });

  test('relation case: a file saved with refId/ref/field is removed through remove(), so the DB layer runs deleteRelations', async () => {
    providerMethods.upload.mockImplementation(async (file: File) => {
      if (file.name === 'second.txt') {
        throw providerError;
      }
    });

    const relation = { refId: 7, ref: 'api::article.article', field: 'cover' };
    const files = [inputFile(firstFilePath, 'first.txt'), inputFile(secondFilePath, 'second.txt')];

    await expect(runUpload(files, relation)).rejects.toBe(providerError);

    // The relation reaches create(), which is where the DB layer writes the join rows.
    const [firstRow] = createdRows;
    expect(firstRow.related).toEqual([
      { id: 7, __type: 'api::article.article', __pivot: { field: 'cover' } },
    ]);

    // Rollback goes through remove(), which calls db.delete. That call runs deleteRelations.
    // A unit test cannot see the join table, so the join rows are checked end-to-end instead.
    expect(dbDelete).toHaveBeenCalledWith({ where: { id: firstRow.id } });
  });

  test('bounded cleanup: removals run in chunks of concurrentUploadSize', async () => {
    defaultConfig['plugin::upload'].concurrentUploadSize = 2;
    providerMethods.upload.mockImplementation(async (file: File) => {
      if (file.name === 'bulk-5.txt') {
        throw providerError;
      }
    });

    const events: string[] = [];
    let inFlight = 0;
    let maxInFlight = 0;
    providerMethods.delete.mockImplementation(async (file: File) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      events.push(`start:${file.name}`);
      await wait(10);
      events.push(`end:${file.name}`);
      inFlight -= 1;
    });

    const files = bulkFilePaths.map((filePath, idx) => inputFile(filePath, `bulk-${idx + 1}.txt`));

    await expect(runUpload(files)).rejects.toBe(providerError);

    // Four files were saved before the fifth failed, and each one was removed.
    expect(createdRows.map((row) => row.name)).toEqual([
      'bulk-1.txt',
      'bulk-2.txt',
      'bulk-3.txt',
      'bulk-4.txt',
    ]);
    expect(providerMethods.delete).toHaveBeenCalledTimes(4);

    // Never more than two removals run at once.
    expect(maxInFlight).toBe(2);

    // The second chunk starts only after the first chunk has finished.
    expect(events.indexOf('start:bulk-3.txt')).toBeGreaterThan(events.indexOf('end:bulk-1.txt'));
    expect(events.indexOf('start:bulk-3.txt')).toBeGreaterThan(events.indexOf('end:bulk-2.txt'));
  });

  test('cleanup failure: the original upload error is rethrown and the logged entry keeps the error object', async () => {
    providerMethods.upload.mockImplementation(async (file: File) => {
      if (file.name === 'second.txt') {
        throw providerError;
      }
    });
    providerMethods.delete.mockImplementation(async () => {
      throw cleanupError;
    });

    const files = [inputFile(firstFilePath, 'first.txt'), inputFile(secondFilePath, 'second.txt')];

    await expect(runUpload(files)).rejects.toBe(providerError);

    const [firstRow] = createdRows;
    expect(logError).toHaveBeenCalledTimes(1);
    const [message, meta] = logError.mock.calls[0];
    expect(message).toBe(`Failed to roll back uploaded file ${firstRow.id}`);
    expect(meta.error).toBe(cleanupError);
  });

  test('happy path: when every file succeeds, nothing is rolled back and the result is unchanged', async () => {
    const files = [inputFile(firstFilePath, 'first.txt'), inputFile(secondFilePath, 'second.txt')];

    const result = await runUpload(files);

    // remove() is never reached: neither the provider nor the database deletes anything.
    expect(providerMethods.delete).not.toHaveBeenCalled();
    expect(dbDelete).not.toHaveBeenCalled();
    expect(logError).not.toHaveBeenCalled();

    // The return value is exactly the rows that were persisted, in input order.
    expect(result).toHaveLength(2);
    expect(result.map((row) => row.name)).toEqual(['first.txt', 'second.txt']);
    expect(result[0]).toBe(createdRows[0]);
    expect(result[1]).toBe(createdRows[1]);
  });
});
