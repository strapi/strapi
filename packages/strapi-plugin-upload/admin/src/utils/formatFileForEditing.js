import { pick } from 'lodash';

const formatFileForEditing = file => {
  const abortController = new AbortController();

  return {
    abortController,
    id: file.id,
    file: {
      ...pick(file, ['size', 'ext', 'width', 'height', 'mime', 'name', 'url']),
      created_at: file.created_at || file.createdAt,
    },
    fileInfo: pick(file, ['alternativeText', 'caption', 'name']),
    hasError: false,
    errorMessage: null,
    isUploading: false,
  };
};

export default formatFileForEditing;
