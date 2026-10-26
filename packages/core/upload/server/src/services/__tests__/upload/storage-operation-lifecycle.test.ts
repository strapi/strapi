import path from 'path';

import createUploadService from '../../upload';

const providerService = {
  upload: jest.fn(),
  replace: jest.fn(),
  checkFileSize: jest.fn(),
};

const providerInstance = {
  delete: jest.fn(),
};

const imageManipulation = {
  generateFileName: jest.fn((name: string) => name),
  getDimensions: jest.fn(),
  isImage: jest.fn(),
  isFaultyImage: jest.fn(),
  isOptimizableImage: jest.fn(),
  isResizableImage: jest.fn(),
  optimize: jest.fn(),
  generateThumbnail: jest.fn(),
  generateResponsiveFormats: jest.fn(),
};

const fileService = {
  getFolderPath: jest.fn(async () => '/'),
  signFileUrls: jest.fn((file) => file),
};

const metricsService = {
  trackUsage: jest.fn(),
};

const dbCreate = jest.fn();
const dbFindOne = jest.fn();
const dbDelete = jest.fn();

const services: Record<string, unknown> = {
  provider: providerService,
  file: fileService,
  metrics: metricsService,
  'image-manipulation': imageManipulation,
};

global.strapi = {
  config: {
    get: jest.fn((key: string, fallback?: unknown) => {
      if (key === 'plugin::upload') {
        return { provider: 'local', concurrentUploadSize: 1 };
      }

      return fallback;
    }),
  },
  db: {
    query: jest.fn(() => ({
      create: dbCreate,
      findOne: dbFindOne,
      delete: dbDelete,
    })),
  },
  eventHub: {
    emit: jest.fn(),
  },
  getModel: jest.fn(() => ({ attributes: {} })),
  log: {
    error: jest.fn(),
    warn: jest.fn(),
  },
  plugins: {
    upload: {
      provider: providerInstance,
      services,
      service: (name: string) => services[name],
    },
  },
  plugin: (name: string) => global.strapi.plugins[name],
} as any;

const uploadService = createUploadService({ strapi: global.strapi } as any);

const original = {
  alternativeText: 'image.png',
  caption: 'image.png',
  ext: '.png',
  folder: undefined,
  folderPath: '/',
  getStream: jest.fn(),
  hash: 'original',
  height: 1000,
  mime: 'image/png',
  name: 'image.png',
  size: 4,
  width: 1500,
};

const thumbnail = {
  ...original,
  hash: 'thumbnail_original',
  name: 'thumbnail_image.png',
};

const waitForProviderCalls = async (count: number) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (providerService.upload.mock.calls.length === count) {
      return;
    }

    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
  }

  throw new Error(`Expected ${count} provider calls`);
};

describe('storage operation lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    providerService.checkFileSize.mockResolvedValue(undefined);
    providerService.upload.mockResolvedValue(undefined);
    providerInstance.delete.mockResolvedValue(undefined);
    imageManipulation.getDimensions.mockResolvedValue({ width: 1500, height: 1000 });
    imageManipulation.isImage.mockResolvedValue(true);
    imageManipulation.isFaultyImage.mockResolvedValue(false);
    imageManipulation.isOptimizableImage.mockResolvedValue(false);
    imageManipulation.isResizableImage.mockResolvedValue(true);
    imageManipulation.generateThumbnail.mockResolvedValue({ ...thumbnail });
    imageManipulation.generateResponsiveFormats.mockResolvedValue([]);
    dbCreate.mockResolvedValue({ id: 1 });
    dbFindOne.mockResolvedValue(null);
    dbDelete.mockResolvedValue(null);
  });

  test('prepares every image variant before starting provider writes', async () => {
    const events: string[] = [];
    imageManipulation.generateThumbnail.mockImplementation(async () => {
      events.push('prepare:thumbnail');
      expect(providerService.upload).not.toHaveBeenCalled();
      return { ...thumbnail };
    });
    imageManipulation.generateResponsiveFormats.mockImplementation(async () => {
      events.push('prepare:responsive');
      expect(providerService.upload).not.toHaveBeenCalled();
      return [];
    });
    providerService.upload.mockImplementation(async (file) => {
      events.push(`upload:${file.hash}`);
    });

    await uploadService._uploadImage({ ...original } as any);

    expect(events).toEqual([
      'prepare:thumbnail',
      'prepare:responsive',
      'upload:original',
      'upload:thumbnail_original',
    ]);
  });

  test('waits for every started provider write to settle before rejecting', async () => {
    const providerError = new Error('original upload failed');
    let rejectOriginal!: (error: Error) => void;
    let resolveThumbnail!: () => void;
    const originalUpload = new Promise<void>((_resolve, reject) => {
      rejectOriginal = reject;
    });
    const thumbnailUpload = new Promise<void>((resolve) => {
      resolveThumbnail = resolve;
    });

    providerService.upload.mockImplementation((file) =>
      file.hash === 'original' ? originalUpload : thumbnailUpload
    );

    let didSettle = false;
    const outcome = uploadService._uploadImage({ ...original } as any).then(
      () => null,
      (error) => error
    );
    outcome.finally(() => {
      didSettle = true;
    });

    await waitForProviderCalls(2);
    rejectOriginal(providerError);
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    expect(didSettle).toBe(false);

    resolveThumbnail();
    await expect(outcome).resolves.toBe(providerError);
  });

  // TODO(upload-atomicity): Replace this delete-call compensation assertion with a final
  // storage-state invariant once providers support atomic multi-object writes.
  test('best-effort deletes planned objects when an image upload partially fails', async () => {
    const providerError = new Error('thumbnail upload failed');
    providerService.upload.mockImplementation(async (file) => {
      if (file.hash === 'thumbnail_original') {
        throw providerError;
      }
    });

    await expect(uploadService._uploadImage({ ...original } as any)).rejects.toBe(providerError);

    expect(providerInstance.delete).toHaveBeenCalledTimes(2);
    expect(providerInstance.delete.mock.calls.map(([file]) => file.hash).sort()).toEqual([
      'original',
      'thumbnail_original',
    ]);
  });

  // TODO(upload-atomicity): A persistent operation journal or reconciler may eventually replace
  // this direct, in-request compensation after a cross-system commit failure.
  test('deletes a newly uploaded object when creating its database record fails', async () => {
    const databaseError = new Error('database unavailable');
    imageManipulation.isImage.mockResolvedValue(false);
    dbCreate.mockRejectedValueOnce(databaseError);

    await expect(
      uploadService.upload({
        data: { fileInfo: {} },
        files: [
          {
            filepath: path.join(__dirname, 'image.png'),
            originalFilename: 'document.txt',
            mimetype: 'text/plain',
            size: 10,
          } as any,
        ],
      })
    ).rejects.toBe(databaseError);

    expect(providerInstance.delete).toHaveBeenCalledTimes(1);
    expect(providerInstance.delete).toHaveBeenCalledWith(
      expect.objectContaining({ hash: 'document', ext: '.txt' })
    );
  });

  test('does not delete stored objects when the create event fails after the database commit', async () => {
    const eventError = new Error('create listener failed');
    imageManipulation.isImage.mockResolvedValue(false);
    (global.strapi.eventHub.emit as jest.Mock).mockImplementationOnce(() => {
      throw eventError;
    });

    await expect(
      uploadService.upload({
        data: { fileInfo: {} },
        files: [
          {
            filepath: path.join(__dirname, 'image.png'),
            originalFilename: 'document.txt',
            mimetype: 'text/plain',
            size: 10,
          } as any,
        ],
      })
    ).rejects.toBe(eventError);

    expect(dbCreate).toHaveBeenCalledTimes(1);
    expect(providerInstance.delete).not.toHaveBeenCalled();
  });

  // TODO(upload-atomicity): This captures the current partial-delete contract. Replace it with a
  // rollback or reconciliation invariant when atomic deletion is implemented.
  test('waits for every format deletion and logs partial success before retaining the database record', async () => {
    const providerError = new Error('thumbnail delete failed');
    let resolveSmall!: () => void;
    const smallDeletion = new Promise<void>((resolve) => {
      resolveSmall = resolve;
    });
    providerInstance.delete.mockImplementation((file) => {
      if (file.hash === 'thumbnail_original') {
        return Promise.reject(providerError);
      }
      if (file.hash === 'small_original') {
        return smallDeletion;
      }

      return Promise.resolve();
    });

    let didSettle = false;
    const outcome = uploadService
      .remove({
        id: 42,
        provider: 'local',
        hash: 'original',
        ext: '.png',
        formats: {
          thumbnail: { hash: 'thumbnail_original', ext: '.png' },
          small: { hash: 'small_original', ext: '.png' },
        },
      } as any)
      .then(
        () => null,
        (error) => error
      );
    outcome.finally(() => {
      didSettle = true;
    });

    while (providerInstance.delete.mock.calls.length < 3) {
      await new Promise<void>((resolve) => {
        setImmediate(resolve);
      });
    }
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    expect(didSettle).toBe(false);

    resolveSmall();
    await expect(outcome).resolves.toBe(providerError);
    expect(dbDelete).not.toHaveBeenCalled();
    expect(global.strapi.log.error).toHaveBeenCalledWith(
      expect.stringContaining('partially completed'),
      expect.objectContaining({
        phase: 'delete-formats',
        assetId: 42,
        databaseDeleted: false,
        operations: expect.arrayContaining([
          expect.objectContaining({ name: 'delete:format:thumbnail', status: 'rejected' }),
          expect.objectContaining({ name: 'delete:format:small', status: 'fulfilled' }),
        ]),
      })
    );
  });
});
