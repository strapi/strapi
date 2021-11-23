import toSingularTypes from './toSingularTypes';

/**
 * Returns the files that can be added to the media field
 * @param {Object[]} pluralTypes Array of string (allowedTypes)
 * @param {Object[]} files Array of files
 * @returns Object[]
 */
const getAllowedFiles = (pluralTypes, files) => {
  const singularTypes = toSingularTypes(pluralTypes);

  const allowedFiles = files.filter(file => {
    const fileType = file.mime.split('/')[0];

    if (singularTypes.includes('file') && !['video', 'image'].includes(fileType)) {
      return true;
    }

    return singularTypes.includes(fileType);
  });

  return allowedFiles;
};

export default getAllowedFiles;
