'use strict';

const sharp = require('sharp');

const optimize = async (file) => {
  return {
    ...file,
    getStream() {
      const stream = file.getStream();
      if (sharp()[file?.type]) {
        stream.pipe(sharp()[file.type]({ quality: 80 }));
      }
      return stream;
    },
  };
};

module.exports = optimize;
