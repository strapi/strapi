// Mocked sharp: responsive format generation must not run multiple toFile in parallel
// (github.com/strapi/strapi#26046).
import _ from 'lodash';

jest.mock('sharp', () => {
  const toFileState = { inFlight: 0, maxInFlight: 0 };
  // `__setNextMetadata` — per-test image dimensions
  const nextMetadata: {
    value: { width: number | null; height: number | null; format: string };
  } = { value: { width: 2000, height: 2000, format: 'jpeg' } };

  const toFile = jest.fn().mockImplementation(async function toFileWithTracking() {
    toFileState.inFlight += 1;
    toFileState.maxInFlight = Math.max(toFileState.maxInFlight, toFileState.inFlight);
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
    toFileState.inFlight -= 1;
    return { width: 100, height: 100, size: 1000 };
  });

  const makeChain = () => ({
    metadata: jest.fn().mockImplementation(() => Promise.resolve({ ...nextMetadata.value })),
    resize: jest.fn().mockReturnThis(),
    toFile,
    on: jest.fn().mockReturnThis(),
  });

  return {
    __esModule: true,
    default: Object.assign(
      jest.fn(() => makeChain()),
      {
        cache: jest.fn(),
        concurrency: jest.fn(),
        __getToFile: () => toFile,
        __getToFileState: () => toFileState,
        __setNextMetadata(m: { width: number | null; height: number | null; format: string }) {
          nextMetadata.value = m;
        },
      }
    ),
  };
});

/* eslint-disable import/first -- mock runs before `sharp` import */
import sharp from 'sharp';
import imageManipulation from '../../image-manipulation';
/* eslint-enable import/first */

const defaultConfig: Record<string, unknown> = {
  'plugin::upload': {
    breakpoints: { large: 1000, medium: 750, small: 500 },
  },
};

const uploadSettings = { responsiveDimensions: true };

const resetStrapi = () => {
  global.strapi = {
    config: {
      get: (key: string, defaultValue: unknown) => _.get(defaultConfig, key, defaultValue),
    },
    plugins: {
      upload: {
        services: {
          'image-manipulation': imageManipulation,
          upload: {
            getSettings: async () => ({
              responsiveDimensions: uploadSettings.responsiveDimensions,
            }),
          },
        },
      },
    },
  } as any;
};

const testFile: Parameters<typeof imageManipulation.generateResponsiveFormats>[0] = {
  name: 'huge.jpg',
  hash: 'a1b2',
  ext: '.jpg',
  mime: 'image/jpeg',
  filepath: '/var/tmp/strapi-huge-mock.jpg',
  path: null,
  getStream() {
    throw new Error('unused (filepath set)');
  },
};

beforeEach(() => {
  uploadSettings.responsiveDimensions = true;
  const s = sharp as any;
  s.__setNextMetadata({ width: 2000, height: 2000, format: 'jpeg' });
  resetStrapi();
  s.__getToFile().mockClear();
  s.__getToFileState().inFlight = 0;
  s.__getToFileState().maxInFlight = 0;
});

const getToFile = () => (sharp as any).__getToFile() as jest.Mock;
const getToFileState = () => (sharp as any).__getToFileState() as { maxInFlight: number };

describe('generateResponsiveFormats (sequential resizes)', () => {
  test('never runs more than one toFile at a time for all breakpoints', async () => {
    await imageManipulation.generateResponsiveFormats(testFile);

    expect(getToFile()).toHaveBeenCalledTimes(3);
    expect(getToFileState().maxInFlight).toBe(1);
  });
});

describe('generateResponsiveFormats (no toFile when nothing to resize)', () => {
  test('does nothing when responsive dimensions are off', async () => {
    uploadSettings.responsiveDimensions = false;

    await imageManipulation.generateResponsiveFormats(testFile);

    expect(getToFile()).not.toHaveBeenCalled();
    expect(getToFileState().maxInFlight).toBe(0);
  });

  test('skips breakpoints when image is smaller than all of them', async () => {
    (sharp as any).__setNextMetadata({ width: 200, height: 200, format: 'jpeg' });

    await imageManipulation.generateResponsiveFormats(testFile);

    expect(getToFile()).not.toHaveBeenCalled();
  });

  test('no sizes when width and height are null in metadata', async () => {
    (sharp as any).__setNextMetadata({ width: null, height: null, format: 'jpeg' });

    await imageManipulation.generateResponsiveFormats(testFile);

    expect(getToFile()).not.toHaveBeenCalled();
  });
});
