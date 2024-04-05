'use strict';

/**
 * Image manipulation functions
 */
const fs = require('fs');
const { join } = require('path');
const sharp = require('sharp');

const {
  file: { bytesToKbytes, writableDiscardStream },
} = require('@strapi/utils');
const { getService } = require('../utils');

const FORMATS_TO_RESIZE = ['jpeg', 'png', 'webp', 'tiff', 'gif'];
const FORMATS_TO_PROCESS = ['jpeg', 'png', 'webp', 'tiff', 'svg', 'gif', 'avif'];
const FORMATS_TO_OPTIMIZE = ['jpeg', 'png', 'webp', 'tiff', 'avif'];

const getMetadata = async (file) =>
  new Promise((resolve, reject) => {
    const pipeline = sharp();
    pipeline.metadata().then(resolve).catch(reject);
    file.getStream().pipe(pipeline);
  });

const getDimensions = async (file) => {
  if (file.width && file.height) {
    return { width: file.width, height: file.height };
  }

  const { width = null, height = null } = await getMetadata(file);
  return { width, height };
};

const THUMBNAIL_RESIZE_OPTIONS = {
  width: 245,
  height: 156,
  fit: 'inside',
};

const resizeFileTo = async (file, options, { name, hash }) => {
  const stream = file.getStream().resize(options);
  const newFile = {
    name,
    hash,
    ext: file.ext,
    mime: file.mime,
    path: file.path || null,
    getStream: () => stream.clone(),
  };

  const { width, height, size } = await stream.clone().metadata();

  Object.assign(newFile, { width, height, size: bytesToKbytes(size), sizeInBytes: size });
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

  const { width, height, size, format } = file;

  if (sizeOptimization || autoOrientation) {
    const transformer = sharp();
    // reduce image quality
    transformer[format]({ quality: sizeOptimization ? 80 : 100 });
    // rotate image based on EXIF data
    if (autoOrientation) {
      transformer.rotate();
    }

    const pipeline = file.getStream().pipe(transformer);

    file.getStream = () => pipeline.clone();
  }

  const { width: newWidth, height: newHeight, size: newSize } = await getMetadata(file);

  if (newSize > size) {
    // Ignore optimization if output is bigger than original
    return { ...file, width, height, size: bytesToKbytes(size), sizeInBytes: size };
  }

  return Object.assign(file, {
    width: newWidth,
    height: newHeight,
    size: bytesToKbytes(newSize),
    sizeInBytes: newSize,
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

const isResizableImage = async (file) => {
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
  isResizableImage,
  isImage,
  getDimensions,
  generateResponsiveFormats,
  generateThumbnail,
  optimize,

  isProcessable({ format }) {
    return format && FORMATS_TO_PROCESS.includes(format);
  },

  isOptimizable({ format }) {
    return format && FORMATS_TO_OPTIMIZE.includes(format);
  },

  isResizable({ format }) {
    return format && FORMATS_TO_RESIZE.includes(format);
  },
});
