import { toSingularTypes } from './toSingularTypes';
import type { Asset } from '../../../shared/contracts/files';

export const getAllowedFiles = (pluralTypes: string[], files: Asset[]) => {
  const singularTypes = toSingularTypes(pluralTypes);

  const allowedFiles = files.filter((file) => {
    const fileType = file.mime?.split('/')[0];

    if (
      singularTypes.includes('file') &&
      fileType &&
      !['video', 'image', 'audio'].includes(fileType)
    ) {
      return true;
    }

    return singularTypes.includes(fileType ?? '');
  });

  return allowedFiles;
};
