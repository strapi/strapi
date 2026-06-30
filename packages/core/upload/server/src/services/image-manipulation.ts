import fs from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import crypto from 'crypto';
import { strings, file as fileUtils } from '@strapi/utils';

import { getService } from '../utils';

import type { UploadableFile } from '../types';

type Dimensions = {
  width: number | null;
  height: number | null;
};

// TODO: remove after upgrading sharp to >=0.34.2 (pageHeight added to OutputInfo types)
declare module 'sharp' {
  interface OutputInfo {
    pageHeight?: number;
  }
}

const { bytesToKbytes } = fileUtils;

const FORMATS_TO_RESIZE = ['jpeg', 'png', 'webp', 'tiff', 'gif'];
const FORMATS_TO_PROCESS = ['jpeg', 'png', 'webp', 'tiff', 'svg', 'gif', 'avif'];
const FORMATS_TO_OPTIMIZE = ['jpeg', 'png', 'webp', 'tiff', 'avif'];

const isOptimizableFormat = (
  format: string | undefined
): format is 'jpeg' | 'png' | 'webp' | 'tiff' | 'avif' =>
  format !== undefined && FORMATS_TO_OPTIMIZE.includes(format);

const writeStreamToFile = (stream: NodeJS.ReadWriteStream, path: string) =>
  new Promise<void>((resolve, reject) => {
    const writeStream = fs.createWriteStream(path);
    // Reject promise if there is an error with the provided stream
    stream.on('error', reject);
    stream.pipe(writeStream);
    writeStream.on('close', () => resolve());
    writeStream.on('error', reject);
  });

const getMetadata = (file: UploadableFile): Promise<sharp.Metadata> => {
  if (!file.filepath) {
    return new Promise((resolve, reject) => {
      const pipeline = sharp();
      pipeline.metadata().then(resolve).catch(reject);
      file.getStream().pipe(pipeline);
    });
  }

  return sharp(file.filepath).metadata();
};

const getDimensions = async (file: UploadableFile): Promise<Dimensions> => {
  try {
    const { width = null, height = null } = await getMetadata(file);
    return { width, height };
  } catch {
    return {
      width: file.width ?? null,
      height: file.height ?? null,
    };
  }
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
    const transform = sharp({ animated: true })
      .resize(options)
      .on('info', (info) => {
        newInfo = info;
      });

    await writeStreamToFile(file.getStream().pipe(transform), filePath);
  } else {
    newInfo = await sharp(file.filepath, { animated: true }).resize(options).toFile(filePath);
  }

  const { width, height, size, pageHeight } = newInfo ?? {};

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
    height: pageHeight ?? height,
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
  try {
    const { sizeOptimization = false, autoOrientation = false } =
      (await getService('upload').getSettings()) ?? {};

    const { format, size } = await getMetadata(file);

    if ((sizeOptimization || autoOrientation) && isOptimizableFormat(format)) {
      let transformer;
      if (!file.filepath) {
        transformer = sharp({ animated: true });
      } else {
        transformer = sharp(file.filepath, { animated: true });
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
        transformer.on('info', (info) => {
          newInfo = info;
        });

        await writeStreamToFile(file.getStream().pipe(transformer), filePath);
      } else {
        newInfo = await transformer.toFile(filePath);
      }

      const {
        width: newWidth,
        height: newHeight,
        size: newSize,
        pageHeight: newPageHeight,
      } = newInfo ?? {};

      const newFile = { ...file };

      newFile.getStream = () => fs.createReadStream(filePath);
      newFile.filepath = filePath;

      if (newSize && size && newSize > size) {
        // Ignore optimization if output is bigger than original
        return file;
      }

      return Object.assign(newFile, {
        width: newWidth,
        height: newPageHeight ?? newHeight,
        size: newSize ? bytesToKbytes(newSize) : 0,
        sizeInBytes: newSize,
      });
    }

    return file;
  } catch {
    // Preserve original bytes when EXIF/metadata reads or transforms fail (e.g. corrupt orientation tags).
    return file;
  }
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

  try {
    const originalDimensions = await getDimensions(file);

    const breakpoints = getBreakpoints();
    const results = [];

    for (const key of Object.keys(breakpoints)) {
      const breakpoint = breakpoints[key];

      if (breakpointSmallerThan(breakpoint, originalDimensions)) {
        results.push(await generateBreakpoint(key, { file, breakpoint }));
      }
    }

    return results;
  } catch {
    return [];
  }
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
      pipeline
        .stats()
        .then(() => resolve(false))
        .catch(() => resolve(true));
      file.getStream().pipe(pipeline);
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
