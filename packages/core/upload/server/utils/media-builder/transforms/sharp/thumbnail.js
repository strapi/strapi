'use strict';

const sharp = require('sharp');

const THUMBNAIL_SIZE = { width: 245, height: 156 };

const calculateInsideResizing = (srcSize, destSize) => {
  // No need to resize if the image is smaller than the thumbnail size
  if (srcSize.width < destSize.width && srcSize.height < destSize.height) {
    return;
  }

  const srcAspectRatio = srcSize.width / srcSize.height;
  const destAspectRatio = destSize.width / destSize.height;

  let width = destSize.width;
  let height = destSize.height;

  if (srcAspectRatio > destAspectRatio) {
    height = Math.round(destSize.width / srcAspectRatio);
  } else {
    width = Math.round(destSize.height * srcAspectRatio);
  }

  return { width, height };
};

const thumbnail = async (file) => {
  // Only resize original image and not other responsive formats (e.g breakpoints)
  if (file.format) {
    return [file];
  }

  const files = [file];

  const resize = calculateInsideResizing(file, THUMBNAIL_SIZE);

  if (resize) {
    files.push({
      ...file,
      name: `thumbnail_${file.name}`,
      hash: `thumbnail_${file.hash}`,
      format: 'thumbnail',
      width: resize.width,
      height: resize.height,
      getStream: () => file.getStream().pipe(sharp().resize(resize.width, resize.height)),
    });
  }

  return files;
};

module.exports = thumbnail;
