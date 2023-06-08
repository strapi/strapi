'use strict';

const sharp = require('sharp');

const breakpoints = async (file) => {
  const breakpoints = [
    { format: 'xs', width: 250, height: 250 },
    { format: 'md', width: 500, height: 500 },
  ];

  const resizedFiles = breakpoints.map(({ format, width, height }) => {
    // TODO: Clone same stream for each breakpoint
    // TODO: Add size to file somehow
    return {
      ...file,
      format,
      width,
      height,
      getStream: () => file.getStream().pipe(sharp().resize(width, height)),
    };
  });

  return [file, ...resizedFiles];
};

module.exports = breakpoints;
