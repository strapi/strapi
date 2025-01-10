import { toSingularTypes } from './toSingularTypes';

import type { File } from '../../../shared/contracts/files';
/**
 * Returns the files that can be added to the media field
 * @param {Object[]} pluralTypes Array of string (allowedTypes)
 * @param {Object[]} files Array of files
 * @returns Object[]
 */

export interface AllowedFiles extends File {
  documentId: string;
  isSelectable: boolean;
  locale: string | null;
  type: string;
}

export const getAllowedFiles = (pluralTypes: string[], files: AllowedFiles[]) => {
  const singularTypes = toSingularTypes(pluralTypes);

  const allowedFiles = files.filter((file) => {
    const fileType = file?.mime?.split('/')[0];

    if (!fileType) {
      return false;
    }

    if (singularTypes.includes('file') && !['video', 'image', 'audio'].includes(fileType)) {
      return true;
    }

    return singularTypes.includes(fileType);
  });

  return allowedFiles;
};
