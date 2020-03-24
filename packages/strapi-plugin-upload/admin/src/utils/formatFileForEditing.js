import { pick } from 'lodash';

const formatFileForEditing = file => {
  return {
    file: {
      ...pick(file, ['size', 'ext', 'width', 'height', 'url', 'mime']),
      created_at: file.created_at || file.createdAt,
    },
    fileInfo: pick(file, ['alternativeText', 'caption', 'name']),
  };
};

export default formatFileForEditing;
