import fs from 'fs';
import { join } from 'path';
import sharp, { type Metadata, type ResizeOptions } from 'sharp';
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

const getMetadata = (file: UploadableFile): Promise<Metadata> => {
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
  const { width = null, height = null } = await getMetadata(file);

  return { width, height };
};

const THUMBNAIL_RESIZE_OPTIONS = {
  width: 245,
  height: 156,
  fit: 'inside',
} satisfies ResizeOptions;

const resizeFileTo = async (
  file: UploadableFile,
  options: ResizeOptions,
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
};

const DEFAULT_BREAKPOINTS = {
  large: 1000,
  medium: 750,
  small: 500,
};

/**
 * Breakpoint config entry: a number keeps the historical square `inside` box, or a sharp
 * `ResizeOptions` object for width/height/fit control (#24221).
 */
type BreakpointValue = number | ResizeOptions;

const isBreakpointObject = (value: unknown): value is ResizeOptions =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const resolveBreakpointResizeOptions = (breakpoint: BreakpointValue): ResizeOptions => {
  if (typeof breakpoint === 'number') {
    return {
      width: breakpoint,
      height: breakpoint,
      fit: 'inside',
    };
  }

  return {
    fit: 'inside',
    ...breakpoint,
  };
};

const getBreakpoints = () =>
  strapi.config.get<Record<string, BreakpointValue>>(
    'plugin::upload.breakpoints',
    DEFAULT_BREAKPOINTS
  );

const generateResponsiveFormats = async (file: UploadableFile) => {
  const { responsiveDimensions = false } = (await getService('upload').getSettings()) ?? {};

  if (!responsiveDimensions) return [];

  const originalDimensions = await getDimensions(file);

  const breakpoints = getBreakpoints();
  const results = [];

  for (const key of Object.keys(breakpoints)) {
    const breakpoint = breakpoints[key];

    if (typeof breakpoint !== 'number' && !isBreakpointObject(breakpoint)) {
      continue;
    }

    if (shouldGenerateBreakpoint(breakpoint, originalDimensions)) {
      results.push(await generateBreakpoint(key, { file, breakpoint }));
    }
  }

  return results;
};

const generateBreakpoint = async (
  key: string,
  { file, breakpoint }: { file: UploadableFile; breakpoint: BreakpointValue }
) => {
  const newFile = await resizeFileTo(file, resolveBreakpointResizeOptions(breakpoint), {
    name: `${key}_${file.name}`,
    hash: `${key}_${file.hash}`,
  });
  return {
    key,
    file: newFile,
  };
};

/**
 * Decide whether a responsive variant is needed for the given breakpoint and source size.
 *
 * - Numeric breakpoints (and objects with both width & height): generate when either side
 *   exceeds the corresponding limit — same as the historical square-box behaviour.
 * - Width-only / height-only objects: only compare that axis, so portrait images are not
 *   forced through a max-height constraint when the user asked for max-width (#24221).
 */
const shouldGenerateBreakpoint = (breakpoint: BreakpointValue, dimensions: Dimensions): boolean => {
  const { width, height } = dimensions;
  const options = resolveBreakpointResizeOptions(breakpoint);

  const exceedsWidth = typeof options.width === 'number' && width != null && options.width < width;
  const exceedsHeight =
    typeof options.height === 'number' && height != null && options.height < height;

  if (typeof options.width === 'number' && options.height == null) {
    return exceedsWidth;
  }

  if (typeof options.height === 'number' && options.width == null) {
    return exceedsHeight;
  }

  return exceedsWidth || exceedsHeight;
};

/**
 *  Applies a simple image transformation to see if the image is faulty/corrupted.
 */
const isFaultyImage = async (file: UploadableFile) => {
  if (!file.filepath) {
    return new Promise((resolve, reject) => {
      const pipeline = sharp();
      pipeline.stats().then(resolve).catch(reject);
      file.getStream().pipe(pipeline);
    });
  }

  try {
    await sharp(file.filepath).stats();
    return false;
  } catch {
    return true;
  }
};

const isOptimizableImage = async (file: UploadableFile) => {
  let format;
  try {
    const metadata = await getMetadata(file);
    format = metadata.format;
  } catch {
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
  } catch {
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
  } catch {
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
