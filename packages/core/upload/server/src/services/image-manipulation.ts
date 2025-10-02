import fs from 'fs';
import { join, parse } from 'path';
import sharp from 'sharp';
import crypto from 'crypto';
import { strings, file as fileUtils } from '@strapi/utils';

import { getService } from '../utils';

import type { UploadableFile } from '../types';

type Breakpoints = Record<string, { breakpoint: number; format: keyof sharp.FormatEnum } | number>;

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
  new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(path);
    // Reject promise if there is an error with the provided stream
    stream.on('error', reject);
    stream.pipe(writeStream);
    writeStream.on('close', resolve);
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
  },
  format: keyof sharp.FormatEnum | null = null
) => {
  const filePath = file.tmpWorkingDirectory ? join(file.tmpWorkingDirectory, hash) : hash;
  const originalFormat = (await getMetadata(file)).format;
  let newInfo;
  if (!file.filepath) {
    const transform = sharp()
      .resize(options)
      .on('info', (info) => {
        newInfo = info;
      });

    if (format && format !== originalFormat) {
      transform.toFormat(format);
    }
    await writeStreamToFile(file.getStream().pipe(transform), filePath);
  } else {
    newInfo =
      format && format !== originalFormat
        ? await sharp(file.filepath).resize(options).toFormat(format).toFile(filePath)
        : await sharp(file.filepath).resize(options).toFile(filePath);
  }

  const { width, height, size } = newInfo ?? {};

  const newFile: UploadableFile = {
    name: !format ? name : `${parse(name).name}.${format}`,
    hash,
    ext: format ? `.${format}` : file.ext,
    mime: format ? `image/${format}` : file.mime,
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
      transformer.on('info', (info) => {
        newInfo = info;
      });

      await writeStreamToFile(file.getStream().pipe(transformer), filePath);
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
  small: 500
} satisfies Breakpoints;

const getBreakpoints = () =>
  strapi.config.get<Breakpoints>('plugin::upload.breakpoints', DEFAULT_BREAKPOINTS);

const validatedBreakpoints = (breakpoints: Breakpoints, originalFormat?: keyof sharp.FormatEnum) => {
  return Object.entries(breakpoints).reduce((acc, [key, value]) => {
    if (typeof value === 'number') {
      acc[key] = value;
      return acc;
    }
    const breakpointFormat = typeof value === 'object' && value !== null && 'format' in value ? value.format : null;
    if (!breakpointFormat) return acc;
    if (breakpointFormat === null || !sharp.format[breakpointFormat]) return acc;
    if (breakpointFormat !== originalFormat) {
      acc[key] = value;
    }
    return acc;
  }, {} as Breakpoints);
};

const generateResponsiveFormats = async (file: UploadableFile) => {
  const { responsiveDimensions = false } = (await getService('upload').getSettings()) ?? {};

  if (!responsiveDimensions) return [];

  const originalDimensions = await getDimensions(file);
  const { format: originalFormat } = await getMetadata(file);
  const breakpoints = validatedBreakpoints(getBreakpoints(), originalFormat);
  return Promise.all(
    Object.entries(breakpoints).map(([key, value]) => {
      let breakpoint: number;
      let format: keyof sharp.FormatEnum | null;
      if (typeof value === 'number') {
        breakpoint = value;
        format = null;
      } else if (typeof value === 'object') {
        breakpoint = value.breakpoint;
        format = value.format;
      } else {
        return undefined;
      }
      if (breakpointSmallerThan(breakpoint, originalDimensions)) {
        return generateBreakpoint(key, {
          file,
          breakpoint,
          format,
        });
      }

      return undefined;
    })
  );
};

const generateBreakpoint = async (
  key: string,
  {
    file,
    breakpoint,
    format,
  }: { file: UploadableFile; breakpoint: number; format: keyof sharp.FormatEnum | null }
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
    },
    format
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
    return new Promise((resolve, reject) => {
      const pipeline = sharp();
      pipeline.stats().then(resolve).catch(reject);
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
