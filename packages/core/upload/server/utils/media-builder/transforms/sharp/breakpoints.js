'use strict';

const sharp = require('sharp');

const DEFAULT_BREAKPOINTS = { large: 1000, medium: 750, small: 500 };
const getBreakpoints = () => strapi.config.get('plugin.upload.breakpoints', DEFAULT_BREAKPOINTS);

/**
 * Resize image to fit within the specified dimensions,
 * but only if the image is larger. If the image is smaller, it is not resized.
 */
const calculateInlineResizing = (size, { width, height }) => {
  // No need to resize if the image is smaller
  if (size > width && size > height) {
    return undefined;
  }

  let newWidth = size;
  let newHeight = size;

  // Adjust the newWidth and height to maintain aspect ratio
  if (width > height) {
    newHeight = Math.round((height / width) * size);
  } else {
    newWidth = Math.round((width / height) * size);
  }

  return { width: newWidth, height: newHeight };
};

const breakpoints = async (file) => {
  // Only resize original image and not other responsive formats (e.g thumbnail)
  if (file.format) {
    return [file];
  }

  const breakpoints = getBreakpoints();
  const files = [file];

  for (const [format, breakpoint] of Object.entries(breakpoints)) {
    const resize = calculateInlineResizing(breakpoint, file);

    if (resize) {
      files.push({
        ...file,
        name: `${format}_${file.name}`,
        hash: `${format}_${file.hash}`,
        format,
        width: resize.width,
        height: resize.height,
        getStream: () => file.getStream().pipe(sharp().resize(resize.width, resize.height)),
      });
    }
  }

  return files;
};

module.exports = breakpoints;
