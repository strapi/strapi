'use strict';

const sharp = require('sharp');

const getMetadata = (file) =>
  new Promise((resolve, reject) => {
    const pipeline = sharp();
    pipeline.metadata().then(resolve).catch(reject);
    file.getStream().pipe(pipeline);
  });

const metadata = async (file) => {
  const metadata = await getMetadata(file);

  return {
    ...file,
    width: metadata.width,
    height: metadata.height,
  };
};

module.exports = metadata;
