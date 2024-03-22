import fs from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { file as fileUtils } from '@strapi/utils';

import { getService } from '../utils';

import type { UploadableFile } from '../types';

type Dimensions = {
  width: number | null;
  height: number | null;
};

const { bytesToKbytes, writableDiscardStream } = fileUtils;

const FORMATS_TO_RESIZE = ['jpeg', 'png', 'webp', 'tiff', 'gif'];
const FORMATS_TO_PROCESS = ['jpeg', 'png', 'webp', 'tiff', 'svg', 'gif', 'avif'];
const FORMATS_TO_OPTIMIZE = ['jpeg', 'png', 'webp', 'tiff', 'avif'];

const isOptimizableFormat = (
  format: string | undefined
): format is 'jpeg' | 'png' | 'webp' | 'tiff' | 'avif' =>
  format !== undefined && FORMATS_TO_OPTIMIZE.includes(format);

const writeStreamToFile = (stream: NodeJS.ReadWriteStream, path: string) =>
  new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(path);
    // Reject promise if there is an error with the provided stream
    stream.on('error', reject);
    stream.pipe(writeStream);
    writeStream.on('close', resolve);
    writeStream.on('error', reject);
  });

const getMetadata = (file: UploadableFile): Promise<sharp.Metadata> =>
  new Promise((resolve, reject) => {
    const pipeline = sharp();
    pipeline.metadata().then(resolve).catch(reject);
    file.getStream().pipe(pipeline);
  });

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

  await writeStreamToFile(file.getStream().pipe(sharp().resize(options)), filePath);
  const newFile: UploadableFile = {
    name,
    hash,
    ext: file.ext,
    mime: file.mime,
    path: file.path || null,
    getStream: () => fs.createReadStream(filePath),
  };

  const { width, height, size } = await getMetadata(newFile);

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
    const newFile = await resizeFileTo(file, THUMBNAIL_RESIZE_OPTIONS, {
      name: `thumbnail_${file.name}`,
      hash: `thumbnail_${file.hash}`,
    });
    return newFile;
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

  const newFile = { ...file };

  const { width, height, size, format } = await getMetadata(newFile);

  if ((sizeOptimization || autoOrientation) && isOptimizableFormat(format)) {
    const transformer = sharp();

    // reduce image quality
    transformer[format]({ quality: sizeOptimization ? 80 : 100 });
    // rotate image based on EXIF data
    if (autoOrientation) {
      transformer.rotate();
    }
    const filePath = file.tmpWorkingDirectory
      ? join(file.tmpWorkingDirectory, `optimized-${file.hash}`)
      : `optimized-${file.hash}`;

    await writeStreamToFile(file.getStream().pipe(transformer), filePath);

    newFile.getStream = () => fs.createReadStream(filePath);
  }

  const { width: newWidth, height: newHeight, size: newSize } = await getMetadata(newFile);

  if (newSize && size && newSize > size) {
    // Ignore optimization if output is bigger than original
    return { ...file, width, height, size: bytesToKbytes(size), sizeInBytes: size };
  }

  return Object.assign(newFile, {
    width: newWidth,
    height: newHeight,
    size: newSize ? bytesToKbytes(newSize) : 0,
    sizeInBytes: newSize,
  });
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
const isFaultyImage = (file: UploadableFile) =>
  new Promise((resolve) => {
    file
      .getStream()
      .pipe(sharp().rotate())
      .on('error', () => resolve(true))
      .pipe(writableDiscardStream())
      .on('error', () => resolve(true))
      .on('close', () => resolve(false));
  });

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

export default {
  isFaultyImage,
  isOptimizableImage,
  isResizableImage,
  isImage,
  getDimensions,
  generateResponsiveFormats,
  generateThumbnail,
  optimize,
};
