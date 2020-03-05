'use strict';
/**
 * Image manipulation functions
 */

const sharp = require('sharp');

const getDimensions = buffer =>
  sharp(buffer)
    .metadata()
    .then(({ width, height }) => ({ width, height }))
    .catch(err => {
      // ignore invali formats
      console.log(err);
      return {};
    });

const ThUMBNAIL_RESIZE_OPTIONS = {
  width: 245,
  height: 156,
  fit: 'inside',
};

const generateThumbnail = file => {
  return sharp(file.buffer)
    .resize(ThUMBNAIL_RESIZE_OPTIONS)
    .toBuffer()
    .then(buffer => {
      return getDimensions(buffer).then(dimensions => ({
        ...dimensions,
        hash: `thumb_${file.hash}`,
        ext: file.ext,
        buffer,
      }));
    })
    .catch(err => {
      console.log(err);
      return null;
    });
};

module.exports = {
  getDimensions,
  generateThumbnail,
};
