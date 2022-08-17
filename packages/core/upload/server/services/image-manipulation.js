'use strict';

/**
 * Image manipulation functions
 */
const fs = require('fs');
const { join } = require('path');
const sharp = require('sharp');

const { getService } = require('../utils');
const { bytesToKbytes, writableDiscardStream } = require('../utils/file');

const FORMATS_TO_PROCESS = ['jpeg', 'png', 'webp', 'tiff', 'svg', 'gif'];
const FORMATS_TO_OPTIMIZE = ['jpeg', 'png', 'webp', 'tiff'];

const writeStreamToFile = (stream, path) =>
  new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(path);
    // Reject promise if there is an error with the provided stream
    stream.on('error', reject);
    stream.pipe(writeStream);
    writeStream.on('close', resolve);
    writeStream.on('error', reject);
  });

const getMetadata = (file) =>
  new Promise((resolve, reject) => {
    const pipeline = sharp();
    pipeline.metadata().then(resolve).catch(reject);
    file.getStream().pipe(pipeline);
  });

const getDimensions = async (file) => {
  const { width = null, height = null } = await getMetadata(file);
  return { width, height };
};

const THUMBNAIL_RESIZE_OPTIONS = {
  width: 245,
  height: 156,
  fit: 'inside',
};

const resizeFileTo = async (file, options, { name, hash }) => {
  const filePath = join(file.tmpWorkingDirectory, hash);

  await writeStreamToFile(file.getStream().pipe(sharp().resize(options)), filePath);
  const newFile = {
    name,
    hash,
    ext: file.ext,
    mime: file.mime,
    path: file.path || null,
    getStream: () => fs.createReadStream(filePath),
  };

  const { width, height, size } = await getMetadata(newFile);

  Object.assign(newFile, { width, height, size: bytesToKbytes(size) });
  return newFile;
};

const generateThumbnail = async (file) => {
  if (
    file.width > THUMBNAIL_RESIZE_OPTIONS.width ||
    file.height > THUMBNAIL_RESIZE_OPTIONS.height
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
const optimize = async (file) => {
  const { sizeOptimization = false, autoOrientation = false } = await getService(
    'upload'
  ).getSettings();

  const newFile = { ...file };

  const { width, height, size, format } = await getMetadata(newFile);

  if (sizeOptimization || autoOrientation) {
    const transformer = sharp();
    // reduce image quality
    transformer[format]({ quality: sizeOptimization ? 80 : 100 });
    // rotate image based on EXIF data
    if (autoOrientation) {
      transformer.rotate();
    }
    const filePath = join(file.tmpWorkingDirectory, `optimized-${file.hash}`);

    await writeStreamToFile(file.getStream().pipe(transformer), filePath);

    newFile.getStream = () => fs.createReadStream(filePath);
  }

  const { width: newWidth, height: newHeight, size: newSize } = await getMetadata(newFile);

  if (newSize > size) {
    // Ignore optimization if output is bigger than original
    return { ...file, width, height, size: bytesToKbytes(size) };
  }

  return Object.assign(newFile, {
    width: newWidth,
    height: newHeight,
    size: bytesToKbytes(newSize),
  });
};

const DEFAULT_BREAKPOINTS = {
  large: 1000,
  medium: 750,
  small: 500,
};

const getBreakpoints = () => strapi.config.get('plugin.upload.breakpoints', DEFAULT_BREAKPOINTS);

const generateResponsiveFormats = async (file) => {
  const { responsiveDimensions = false } = await getService('upload').getSettings();

  if (!responsiveDimensions) return [];

  const originalDimensions = await getDimensions(file);

  const breakpoints = getBreakpoints();
  return Promise.all(
    Object.keys(breakpoints).map((key) => {
      const breakpoint = breakpoints[key];

      if (breakpointSmallerThan(breakpoint, originalDimensions)) {
        return generateBreakpoint(key, { file, breakpoint, originalDimensions });
      }

      return undefined;
    })
  );
};

const generateBreakpoint = async (key, { file, breakpoint }) => {
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

const breakpointSmallerThan = (breakpoint, { width, height }) => {
  return breakpoint < width || breakpoint < height;
};

// TODO V5: remove isSupportedImage
const isSupportedImage = (...args) => {
  process.emitWarning(
    '[deprecated] In future versions, `isSupportedImage` will be removed. Replace it with `isImage` or `isOptimizableImage` instead.'
  );

  return isOptimizableImage(...args);
};

/**
 *  Applies a simple image transformation to see if the image is faulty/corrupted.
 */
const isFaultyImage = (file) =>
  new Promise((resolve) => {
    file
      .getStream()
      .pipe(sharp().rotate())
      .on('error', () => resolve(true))
      .pipe(writableDiscardStream())
      .on('error', () => resolve(true))
      .on('close', () => resolve(false));
  });

const isOptimizableImage = async (file) => {
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

const isImage = async (file) => {
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

module.exports = () => ({
  isSupportedImage,
  isFaultyImage,
  isOptimizableImage,
  isImage,
  getDimensions,
  generateResponsiveFormats,
  generateThumbnail,
  optimize,
});
