'use strict';
/**
 * Image manipulation functions
 */
const sharp = require('sharp');

const { bytesToKbytes } = require('../utils/file');

const getMetadatas = buffer =>
  sharp(buffer)
    .metadata()
    .catch(() => ({})); // ingore errors

const getDimensions = buffer =>
  getMetadatas(buffer)
    .then(({ width, height }) => ({ width, height }))
    .catch(() => ({})); // ingore errors

const THUMBNAIL_RESIZE_OPTIONS = {
  width: 245,
  height: 156,
  fit: 'inside',
};

const resizeTo = (buffer, options) =>
  sharp(buffer)
    .resize(options)
    .toBuffer()
    .catch(() => null);

const generateThumbnail = async file => {
  const { width, height } = await getDimensions(file.buffer);

  if (width > THUMBNAIL_RESIZE_OPTIONS.width || height > THUMBNAIL_RESIZE_OPTIONS.height) {
    const newBuff = await resizeTo(file.buffer, THUMBNAIL_RESIZE_OPTIONS);

    if (newBuff) {
      const { width, height, size } = await getMetadatas(newBuff);

      return {
        hash: `thumbnail_${file.hash}`,
        ext: file.ext,
        mime: file.mime,
        width,
        height,
        size: bytesToKbytes(size),
        buffer: newBuff,
      };
    }
  }

  return null;
};

const optimize = async buffer => {
  const { sizeOptimization = false } = await strapi.plugins.upload.services.upload.getSettings();

  if (!sizeOptimization) return { buffer };

  return sharp(buffer)
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => ({
      buffer: data,
      info: {
        width: info.width,
        height: info.height,
        size: bytesToKbytes(info.size),
      },
    }))
    .catch(() => ({ buffer }));
};

module.exports = {
  getDimensions,
  generateThumbnail,
  bytesToKbytes,
  optimize,
};
