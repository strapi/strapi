'use strict';

const sharp = require('sharp');

const autoRotate = async (file) => {
  return {
    ...file,
    getStream: () => file.getStream().pipe(sharp().rotate()),
  };
};

module.exports = autoRotate;
