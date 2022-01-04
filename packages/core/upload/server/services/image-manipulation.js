'use strict';
/**
 * Image manipulation functions
 */
const fs = require('fs');
const { join } = require('path');
const sharp = require('sharp');

const { getService } = require('../utils');
const { bytesToKbytes } = require('../utils/file');

const writeStreamToFile = (stream, path) =>
  new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(path);
    stream.pipe(writeStream);
    writeStream.on('close', resolve);
    writeStream.on('error', reject);
  });

const getMetadata = file =>
  new Promise((resolve, reject) => {
    const pipeline = sharp();
    pipeline
      .metadata()
      .then(resolve)
      .catch(reject);
    file.getStream().pipe(pipeline);
  });

const getDimensions = async file => {
  const { width = null, height = null } = await getMetadata(file);
  return { width, height };
};

const THUMBNAIL_RESIZE_OPTIONS = {
  width: 245,
  height: 156,
  fit: 'inside',
};

const resizeFileTo = async (file, options, { name, hash }, { tmpFolderPath }) => {
  const filePath = join(tmpFolderPath, hash);
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

const generateThumbnail = async (file, { tmpFolderPath }) => {
  if (!(await canBeProccessed(file))) {
    return null;
  }

  if (
    file.width > THUMBNAIL_RESIZE_OPTIONS.width ||
    file.height > THUMBNAIL_RESIZE_OPTIONS.height
  ) {
    const newFile = await resizeFileTo(
      file,
      THUMBNAIL_RESIZE_OPTIONS,
      {
        name: `thumbnail_${file.name}`,
        hash: `thumbnail_${file.hash}`,
      },
      { tmpFolderPath }
    );
    return newFile;
  }

  return null;
};

const optimize = async (file, { tmpFolderPath }) => {
  const { sizeOptimization = false, autoOrientation = false } = await getService(
    'upload'
  ).getSettings();

  const newFile = { ...file };

  if (!sizeOptimization || !(await canBeProccessed(file))) {
    return newFile;
  }

  if (autoOrientation) {
    const filePath = join(tmpFolderPath, `optimized-${file.hash}`);

    await writeStreamToFile(file.getStream().pipe(sharp().rotate()), filePath);
    newFile.getStream = () => fs.createReadStream(filePath);
  }

  const { width, height, size } = await getMetadata(newFile);

  Object.assign(newFile, { width, height, size: bytesToKbytes(size) });
  return newFile;
};

const DEFAULT_BREAKPOINTS = {
  large: 1000,
  medium: 750,
  small: 500,
};

const getBreakpoints = () => strapi.config.get('plugin.upload.breakpoints', DEFAULT_BREAKPOINTS);

const generateResponsiveFormats = async (file, { tmpFolderPath }) => {
  const { responsiveDimensions = false } = await getService('upload').getSettings();

  if (!responsiveDimensions) return [];

  if (!(await canBeProccessed(file))) {
    return [];
  }

  const originalDimensions = await getDimensions(file);

  const breakpoints = getBreakpoints();
  return Promise.all(
    Object.keys(breakpoints).map(key => {
      const breakpoint = breakpoints[key];

      if (breakpointSmallerThan(breakpoint, originalDimensions)) {
        return generateBreakpoint(key, { file, breakpoint, originalDimensions }, { tmpFolderPath });
      }
    })
  );
};

const generateBreakpoint = async (key, { file, breakpoint }, { tmpFolderPath }) => {
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
    { tmpFolderPath }
  );
  return {
    key,
    file: newFile,
  };
};

const breakpointSmallerThan = (breakpoint, { width, height }) => {
  return breakpoint < width || breakpoint < height;
};

const formatsToProccess = ['jpeg', 'png', 'webp', 'tiff'];
const canBeProccessed = async file => {
  const { format } = await getMetadata(file);
  return format && formatsToProccess.includes(format);
};

module.exports = () => ({
  getDimensions,
  generateResponsiveFormats,
  generateThumbnail,
  bytesToKbytes,
  optimize,
});
