'use strict';

const { mapAsync, reduceAsync } = require('@strapi/utils');

const MediaBuilder = () => {
  const transformations = new Map();

  return {
    transformOn(key, fileTypes, transforms) {
      transformations.set(key, { fileTypes, transforms });
      return this;
    },

    deleteTransform(key) {
      transformations.delete(key);
      return this;
    },

    async transform(file) {
      // Get all transformations for the given file extension
      const _transformations = Array.from(transformations.values())
        .filter(({ fileTypes }) => fileTypes.includes(file.type))
        .flatMap(({ transforms }) => transforms);

      return reduceAsync(
        _transformations,
        (files, transformation) => transformFiles(files, transformation),
        [file]
      );
    },

    groupByFormats(transformedFiles, srcFile) {
      // Merge files into one
      const file = transformedFiles.find((file) => !file.format) || srcFile;
      const formattedFiles = transformedFiles.filter((file) => !!file.format);

      // Add formatted files into the original file
      file.formats = {};
      for (const formattedFile of formattedFiles) {
        file.formats[formattedFile.format] = formattedFile;
      }
      return file;
    },
  };
};

const transformFiles = async (files, transformation) => {
  const transformedFiles = await mapAsync(files, transformation);
  // Some transformations might return multiple files (e.g. resize)
  return transformedFiles.flat();
};

module.exports = MediaBuilder;
