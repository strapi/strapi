import { ACCEPTED_FORMAT, DIMENSION, SIZE } from './constants';

import type { MessageDescriptor } from 'react-intl';

const FILE_FORMAT_ERROR_MESSAGE = {
  id: 'Settings.application.customization.modal.upload.error-format',
  defaultMessage: 'Wrong format uploaded (accepted formats only: jpeg, jpg, png, svg).',
};

const FILE_SIZING_ERROR_MESSAGE = {
  id: 'Settings.application.customization.modal.upload.error-size',
  defaultMessage:
    'The file uploaded is too large (max dimension: {dimension}x{dimension}, max file size: {size}KB)',
};

interface ImageDimensions {
  height: number;
  width: number;
}

interface ImageAsset extends ImageDimensions {
  ext: string | undefined;
  size: number;
  name: string;
  url: string;
  rawFile: File;
}

const parseFileMetadatas = async (file: File): Promise<ImageAsset> => {
  const isFormatAuthorized = ACCEPTED_FORMAT.includes(file.type);

  if (!isFormatAuthorized) {
    throw new ParsingFileError('File format', FILE_FORMAT_ERROR_MESSAGE);
  }

  const fileDimensions = await new Promise<ImageDimensions>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

  const areDimensionsAuthorized =
    fileDimensions.width <= DIMENSION && fileDimensions.height <= DIMENSION;

  if (!areDimensionsAuthorized) {
    throw new ParsingFileError('File sizing', FILE_SIZING_ERROR_MESSAGE);
  }

  const asset = {
    ext: file.name.split('.').pop(),
    size: file.size / 1000,
    name: file.name,
    url: URL.createObjectURL(file),
    rawFile: file,
    width: fileDimensions.width,
    height: fileDimensions.height,
  };

  const isSizeAuthorized = asset.size <= SIZE;

  if (!isSizeAuthorized) {
    throw new ParsingFileError('File sizing', FILE_SIZING_ERROR_MESSAGE);
  }

  return asset;
};

class ParsingFileError extends Error {
  displayMessage: MessageDescriptor;

  constructor(message: string, displayMessage: MessageDescriptor, options?: ErrorOptions) {
    super(message, options);
    this.displayMessage = displayMessage;
  }
}

export { parseFileMetadatas, ParsingFileError };
export type { ImageAsset };
