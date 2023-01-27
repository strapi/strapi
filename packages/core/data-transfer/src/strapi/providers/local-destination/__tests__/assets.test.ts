import fse, { WriteStream } from 'fs-extra';
import { Writable, Readable } from 'stream';
import type { IAsset } from '../../../../../types';

import { getStrapiFactory } from '../../../../__tests__/test-utils';
import { createLocalStrapiDestinationProvider } from '../index';

const write = jest.fn((_chunk, _encoding, callback) => {
  callback();
});

const createWriteStreamMock = jest.fn(() => {
  return new WriteStream({
    objectMode: true,
    write,
  });
});

const createWriteStreamErrorMock = jest.fn().mockImplementation(() => {
  return new WriteStream({
    objectMode: true,
    write: jest.fn().mockImplementation((chunk, _encoding, callback) => {
      console.log('kladfsj;kasdfjasdj;fk');
      const error = new Error() as NodeJS.ErrnoException;
      error.code = 'ENOSPC';
      callback(error);
    }),
  });
});

jest.mock('fs-extra');

describe('Local Strapi Destination Provider - Get Assets Stream', () => {
  test('Throws an error if the Strapi instance is not provided', async () => {
    /* @ts-ignore: disable-next-line */
    const provider = createLocalStrapiDestinationProvider({
      strategy: 'restore',
    });

    await expect(() => provider.createAssetsWriteStream()).rejects.toThrowError(
      'Not able to stream Assets. Strapi instance not found'
    );
  });
  test('Returns a stream', async () => {
    const provider = createLocalStrapiDestinationProvider({
      getStrapi: getStrapiFactory({
        dirs: {
          static: {
            public: 'static/public/assets',
          },
        },
      }),
      strategy: 'restore',
    });
    await provider.bootstrap();

    const stream = await provider.createAssetsWriteStream();

    expect(stream instanceof Writable).toBeTruthy();
  });

  test('Writes on the strapi assets path', async () => {
    (fse.createWriteStream as jest.Mock).mockImplementationOnce(createWriteStreamMock);
    const assetsDirectory = 'static/public/assets';
    const file: IAsset = {
      filename: 'test-photo.jpg',
      filepath: 'strapi-import-folder/assets',
      stats: { size: 200 },
      stream: Readable.from(['test', 'test-2']),
    };
    const provider = createLocalStrapiDestinationProvider({
      getStrapi: getStrapiFactory({
        dirs: {
          static: {
            public: assetsDirectory,
          },
        },
      }),
      strategy: 'restore',
    });

    await provider.bootstrap();
    const stream = await provider.createAssetsWriteStream();

    const error = await new Promise<Error | null | undefined>((resolve) => {
      stream.write(file, resolve);
    });

    expect(write).toHaveBeenCalled();
    expect(createWriteStreamMock).toHaveBeenCalledWith(
      `${assetsDirectory}/uploads/${file.filename}`
    );
  });

  test.only('Throws a full disk error', async () => {
    const assetsDirectory = 'static/public/assets';
    const file: IAsset = {
      filename: 'test-photo.jpg',
      filepath: 'strapi-import-folder/assets',
      stats: { size: 200 },
      stream: Readable.from(['test', 'test-2']),
    };
    (fse.createWriteStream as jest.Mock).mockImplementation(createWriteStreamMock);

    const provider = createLocalStrapiDestinationProvider({
      getStrapi: getStrapiFactory({
        dirs: {
          static: {
            public: assetsDirectory,
          },
        },
      }),
      strategy: 'restore',
    });
    await provider.bootstrap();

    const assetStream = await provider.createAssetsWriteStream();

    const error = new Error() as NodeJS.ErrnoException;
    error.code = 'ENOSPC';

    assetStream.on('error', (e) => {
      console.log('assetstream on error', e);
    });

    try {
      await assetStream.write(file, 'utf-8', () => {
        console.log('CLOSED!');
      });
    } catch (e) {
      console.log('got error', e);
    }
    // try {
    //   await new Promise((resolve, reject) => {
    //     assetStream.write(file, 'utf-8', console.log);
    //     reject(new Error('11111'));
    //   });
    // } catch (e) {
    //   console.log('edeeasdfadfs', e);
    // }

    // await expect(
    //   async () =>
    //     new Promise((resolve, reject) => {
    //       try {
    //         assetStream.write(file, 'utf-8', reject);
    //       } catch (e) {
    //         console.error('error!', e);
    //       }
    //     })
    // ).rejects.toThrow(
    //   `There was an error during the transfer process. Your server doesn't have space to proceed with the import. The original files have been restored to ${assetsDirectory}`
    // );
  });
});
