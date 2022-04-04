import { DIMENSION, SIZE, ACCEPTED_FORMAT } from './constants';

const FILE_FORMAT_ERROR_MESSAGE = {
  id: 'app',
  defaultMessage: 'Wrong format uploaded (accepted formats only: jpeg, jpg, png, svg).',
};

const FILE_SIZING_ERROR_MESSAGE = {
  id: 'app',
  defaultMessage: 'Wrong sizing uploaded (max dimension: 750*750, max file size: TBC)',
};

const getFileDimensions = file => {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = function() {
        resolve({ width: img.width, height: img.height });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
};

const rawFileToAsset = rawFile => {
  return {
    size: rawFile.size / 1000,
    name: rawFile.name,
    url: URL.createObjectURL(rawFile),
    rawFile,
  };
};

export const parseFileMetadatas = async file => {
  const isFormatAuthorized = ACCEPTED_FORMAT.some(format => file.type.includes(format));
  let error;

  if (!isFormatAuthorized) {
    error = new Error('File format');
    error.displayMessage = FILE_FORMAT_ERROR_MESSAGE;

    throw error;
  }

  const fileDimensions = await getFileDimensions(file);
  const areDimensionsAuthorized =
    fileDimensions.width < DIMENSION && fileDimensions.height < DIMENSION;

  if (!areDimensionsAuthorized) {
    error = new Error('File sizing');
    error.displayMessage = FILE_SIZING_ERROR_MESSAGE;

    throw error;
  }

  const asset = rawFileToAsset(file);

  const isSizeAuthorized = asset.size < SIZE;

  if (!isSizeAuthorized) {
    error = new Error('File sizing');
    error.displayMessage = FILE_SIZING_ERROR_MESSAGE;

    throw error;
  }

  return asset;
};
