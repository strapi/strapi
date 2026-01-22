import fs from 'fs';
import { join } from 'path';
import { Readable } from 'stream';
import sharp from 'sharp';
import crypto from 'crypto';
import { strings, file as fileUtils } from '@strapi/utils';

import { getService } from '../utils';

import type { UploadableFile } from '../types';

type Dimensions = {
  width: number | null;
  height: number | null;
};

const { bytesToKbytes } = fileUtils;

const FORMATS_TO_RESIZE = ['jpeg', 'png', 'webp', 'tiff', 'gif'];
const FORMATS_TO_PROCESS = ['jpeg', 'png', 'webp', 'tiff', 'svg', 'gif', 'avif'];
const FORMATS_TO_OPTIMIZE = ['jpeg', 'png', 'webp', 'tiff', 'avif'];

/**
 * Helper to cleanup Sharp pipeline and associated stream
 * Removes event listeners and destroys streams to prevent memory leaks
 *
 * @param pipeline - Sharp pipeline instance
 * @param readStream - Node readable stream
 * @param infoListener - Optional info listener to remove (for transform operations)
 */
const cleanupSharpPipeline = (
  pipeline: sharp.Sharp,
  readStream: NodeJS.ReadableStream,
  infoListener?: (info: sharp.OutputInfo) => void
) => {
  if (infoListener) {
    pipeline.removeListener('info', infoListener);
  }

  const streamWithDestroy = readStream as unknown as Readable;
  if (!streamWithDestroy.destroyed) {
    readStream.unpipe(pipeline);
    streamWithDestroy.destroy();
  }

  if (!pipeline.destroyed) {
    pipeline.destroy();
  }
};

const isOptimizableFormat = (
  format: string | undefined
): format is 'jpeg' | 'png' | 'webp' | 'tiff' | 'avif' =>
  format !== undefined && FORMATS_TO_OPTIMIZE.includes(format);

const writeStreamToFile = (stream: NodeJS.ReadWriteStream, path: string) =>
  new Promise<void>((resolve, reject) => {
    const writeStream = fs.createWriteStream(path);

    // Cleanup function to remove all listeners and destroy streams
    const cleanup = () => {
      stream.removeListener('error', onStreamError);
      writeStream.removeListener('close', onClose);
      writeStream.removeListener('error', onWriteError);

      // Break pipe connection
      const streamWithDestroyed = stream as unknown as Readable;
      if (!streamWithDestroyed.destroyed) {
        stream.unpipe(writeStream);
      }
    };

    const onStreamError = (err: Error) => {
      cleanup();
      // Destroy write stream on read error
      if (!writeStream.destroyed) {
        writeStream.destroy();
      }
      reject(err);
    };

    const onWriteError = (err: Error) => {
      cleanup();
      // Destroy read stream on write error
      const streamWithDestroy = stream as unknown as Readable;
      if (!streamWithDestroy.destroyed) {
        streamWithDestroy.destroy();
      }
      reject(err);
    };

    const onClose = () => {
      cleanup();
      resolve();
    };

    // Reject promise if there is an error with the provided stream
    stream.on('error', onStreamError);
    writeStream.on('error', onWriteError);
    writeStream.on('close', onClose);

    stream.pipe(writeStream);
  });

const getMetadata = (file: UploadableFile): Promise<sharp.Metadata> => {
  if (!file.filepath) {
    return new Promise((resolve, reject) => {
      const pipeline = sharp();
      const readStream = file.getStream();

      pipeline
        .metadata()
        .then((metadata) => {
          cleanupSharpPipeline(pipeline, readStream);
          resolve(metadata);
        })
        .catch((err) => {
          cleanupSharpPipeline(pipeline, readStream);
          reject(err);
        });

      // Handle stream errors
      readStream.on('error', (err) => {
        cleanupSharpPipeline(pipeline, readStream);
        reject(err);
      });

      readStream.pipe(pipeline);
    });
  }

  return sharp(file.filepath).metadata();
};

const getDimensions = async (file: UploadableFile): Promise<Dimensions> => {
  const { width = null, height = null } = await getMetadata(file);

  return { width, height };
};

const THUMBNAIL_RESIZE_OPTIONS = {
  width: 245,
  height: 156,
  fit: 'inside',
} satisfies sharp.ResizeOptions;

const resizeFileTo = async (
  file: UploadableFile,
  options: sharp.ResizeOptions,
  {
    name,
    hash,
  }: {
    name: string;
    hash: string;
  }
) => {
  const filePath = file.tmpWorkingDirectory ? join(file.tmpWorkingDirectory, hash) : hash;

  let newInfo;
  if (!file.filepath) {
    const transform = sharp().resize(options);
    const readStream = file.getStream();

    // Named function for info listener to enable cleanup
    const onInfo = (info: sharp.OutputInfo) => {
      newInfo = info;
    };

    transform.on('info', onInfo);

    try {
      await writeStreamToFile(readStream.pipe(transform), filePath);
    } finally {
      cleanupSharpPipeline(transform, readStream, onInfo);
    }
  } else {
    newInfo = await sharp(file.filepath).resize(options).toFile(filePath);
  }

  const { width, height, size } = newInfo ?? {};

  const newFile: UploadableFile = {
    name,
    hash,
    ext: file.ext,
    mime: file.mime,
    filepath: filePath,
    path: file.path || null,
    getStream: () => fs.createReadStream(filePath),
  };

  Object.assign(newFile, {
    width,
    height,
    size: size ? bytesToKbytes(size) : 0,
    sizeInBytes: size,
  });
  return newFile;
};

const generateThumbnail = async (file: UploadableFile) => {
  if (
    file.width &&
    file.height &&
    (file.width > THUMBNAIL_RESIZE_OPTIONS.width || file.height > THUMBNAIL_RESIZE_OPTIONS.height)
  ) {
    return resizeFileTo(file, THUMBNAIL_RESIZE_OPTIONS, {
      name: `thumbnail_${file.name}`,
      hash: `thumbnail_${file.hash}`,
    });
  }

  return null;
};

/**
 * Optimize image by:
 *    - auto orienting image based on EXIF data
 *    - reduce image quality
 *
 */
const optimize = async (file: UploadableFile) => {
  const { sizeOptimization = false, autoOrientation = false } =
    (await getService('upload').getSettings()) ?? {};

  const { format, size } = await getMetadata(file);

  if ((sizeOptimization || autoOrientation) && isOptimizableFormat(format)) {
    let transformer;
    if (!file.filepath) {
      transformer = sharp();
    } else {
      transformer = sharp(file.filepath);
    }
    // reduce image quality
    transformer[format]({ quality: sizeOptimization ? 80 : 100 });
    // rotate image based on EXIF data
    if (autoOrientation) {
      transformer.rotate();
    }
    const filePath = file.tmpWorkingDirectory
      ? join(file.tmpWorkingDirectory, `optimized-${file.hash}`)
      : `optimized-${file.hash}`;

    let newInfo;
    if (!file.filepath) {
      const readStream = file.getStream();

      // Named function for info listener to enable cleanup
      const onInfo = (info: sharp.OutputInfo) => {
        newInfo = info;
      };

      transformer.on('info', onInfo);

      try {
        await writeStreamToFile(readStream.pipe(transformer), filePath);
      } finally {
        cleanupSharpPipeline(transformer, readStream, onInfo);
      }
    } else {
      newInfo = await transformer.toFile(filePath);
    }

    const { width: newWidth, height: newHeight, size: newSize } = newInfo ?? {};

    const newFile = { ...file };

    newFile.getStream = () => fs.createReadStream(filePath);
    newFile.filepath = filePath;

    if (newSize && size && newSize > size) {
      // Ignore optimization if output is bigger than original
      return file;
    }

    return Object.assign(newFile, {
      width: newWidth,
      height: newHeight,
      size: newSize ? bytesToKbytes(newSize) : 0,
      sizeInBytes: newSize,
    });
  }

  return file;
};

const DEFAULT_BREAKPOINTS = {
  large: 1000,
  medium: 750,
  small: 500,
};

const getBreakpoints = () =>
  strapi.config.get<Record<string, number>>('plugin::upload.breakpoints', DEFAULT_BREAKPOINTS);

const generateResponsiveFormats = async (file: UploadableFile) => {
  const { responsiveDimensions = false } = (await getService('upload').getSettings()) ?? {};

  if (!responsiveDimensions) return [];

  const originalDimensions = await getDimensions(file);

  const breakpoints = getBreakpoints();
  return Promise.all(
    Object.keys(breakpoints).map((key) => {
      const breakpoint = breakpoints[key];

      if (breakpointSmallerThan(breakpoint, originalDimensions)) {
        return generateBreakpoint(key, { file, breakpoint });
      }

      return undefined;
    })
  );
};

const generateBreakpoint = async (
  key: string,
  { file, breakpoint }: { file: UploadableFile; breakpoint: number }
) => {
  const newFile = await resizeFileTo(
    file,
    {
      width: breakpoint,
      height: breakpoint,
      fit: 'inside',
    },
    {
      name: `${key}_${file.name}`,
      hash: `${key}_${file.hash}`,
    }
  );
  return {
    key,
    file: newFile,
  };
};

const breakpointSmallerThan = (breakpoint: number, { width, height }: Dimensions) => {
  return breakpoint < (width ?? 0) || breakpoint < (height ?? 0);
};

/**
 *  Applies a simple image transformation to see if the image is faulty/corrupted.
 */
const isFaultyImage = async (file: UploadableFile) => {
  if (!file.filepath) {
    return new Promise<boolean>((resolve) => {
      const pipeline = sharp();
      const readStream = file.getStream();

      pipeline
        .stats()
        .then(() => {
          cleanupSharpPipeline(pipeline, readStream);
          resolve(false); // Not faulty
        })
        .catch(() => {
          cleanupSharpPipeline(pipeline, readStream);
          resolve(true); // Is faulty
        });

      // Handle stream errors
      readStream.on('error', () => {
        cleanupSharpPipeline(pipeline, readStream);
        resolve(true); // Is faulty
      });

      readStream.pipe(pipeline);
    });
  }

  try {
    await sharp(file.filepath).stats();
    return false;
  } catch (e) {
    return true;
  }
};

const isOptimizableImage = async (file: UploadableFile) => {
  let format;
  try {
    const metadata = await getMetadata(file);
    format = metadata.format;
  } catch (e) {
    // throw when the file is not a supported image
    return false;
  }
  return format && FORMATS_TO_OPTIMIZE.includes(format);
};

const isResizableImage = async (file: UploadableFile) => {
  let format;
  try {
    const metadata = await getMetadata(file);
    format = metadata.format;
  } catch (e) {
    // throw when the file is not a supported image
    return false;
  }
  return format && FORMATS_TO_RESIZE.includes(format);
};

const isImage = async (file: UploadableFile) => {
  let format;
  try {
    const metadata = await getMetadata(file);
    format = metadata.format;
  } catch (e) {
    // throw when the file is not a supported image
    return false;
  }
  return format && FORMATS_TO_PROCESS.includes(format);
};

const generateFileName = (name: string) => {
  const randomSuffix = () => crypto.randomBytes(5).toString('hex');
  const baseName = strings.nameToSlug(name, { separator: '_', lowercase: false });

  return `${baseName}_${randomSuffix()}`;
};

export default {
  isFaultyImage,
  isOptimizableImage,
  isResizableImage,
  isImage,
  getDimensions,
  generateResponsiveFormats,
  generateThumbnail,
  optimize,
  generateFileName,
};
