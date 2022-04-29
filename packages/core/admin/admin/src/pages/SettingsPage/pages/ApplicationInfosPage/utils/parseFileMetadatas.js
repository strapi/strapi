import { DIMENSION, SIZE, ACCEPTED_FORMAT } from './constants';

const FILE_FORMAT_ERROR_MESSAGE = {
  id: 'Settings.application.customization.modal.upload.error-format',
  defaultMessage: 'Wrong format uploaded (accepted formats only: jpeg, jpg, png, svg).',
};

const FILE_SIZING_ERROR_MESSAGE = {
  id: 'Settings.application.customization.modal.upload.error-size',
  defaultMessage:
    'The file uploaded is too large (max dimension: {dimension}x{dimension}, max file size: {size}KB)',
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

const rawFileToAsset = (rawFile, fileDimensions) => {
  return {
    ext: rawFile.name.split('.').pop(),
    size: rawFile.size / 1000,
    name: rawFile.name,
    url: URL.createObjectURL(rawFile),
    rawFile,
    width: fileDimensions.width,
    height: fileDimensions.height,
  };
};

export const parseFileMetadatas = async file => {
  let error;

  const isFormatAuthorized = ACCEPTED_FORMAT.includes(file.type);

  if (!isFormatAuthorized) {
    error = new Error('File format');
    error.displayMessage = FILE_FORMAT_ERROR_MESSAGE;

    throw error;
  }

  const fileDimensions = await getFileDimensions(file);

  const areDimensionsAuthorized =
    fileDimensions.width <= DIMENSION && fileDimensions.height <= DIMENSION;

  if (!areDimensionsAuthorized) {
    error = new Error('File sizing');
    error.displayMessage = FILE_SIZING_ERROR_MESSAGE;

    throw error;
  }

  const asset = rawFileToAsset(file, fileDimensions);

  const isSizeAuthorized = asset.size <= SIZE;

  if (!isSizeAuthorized) {
    error = new Error('File sizing');
    error.displayMessage = FILE_SIZING_ERROR_MESSAGE;

    throw error;
  }

  return asset;
};
