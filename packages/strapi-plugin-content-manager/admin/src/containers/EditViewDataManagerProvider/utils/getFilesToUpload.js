import { get, isArray, isObject } from 'lodash';

const getFilesToUpload = (data, prefix = null) => {
  return Object.keys(data).reduce((acc, current) => {
    const currentData = data[current];
    const path = prefix ? `${prefix}.${current}` : current;
    const filterFiles = files => files.filter(file => file instanceof File);
    const hasFiles = data => data.some(file => file instanceof File);
    const hasFile = data => get(data, 0, null) instanceof File;

    if (isArray(currentData) && hasFiles(currentData)) {
      acc[path] = filterFiles(currentData);
    }

    if (
      isObject(currentData) &&
      !isArray(currentData) &&
      hasFile(currentData)
    ) {
      const currentFile = get(currentData, 0);
      acc[path] = [currentFile];
    }

    if (isArray(currentData) && !hasFiles(currentData)) {
      return { ...acc, ...getFilesToUpload(currentData, path) };
    }

    if (
      isObject(currentData) &&
      !isArray(currentData) &&
      !hasFile(currentData)
    ) {
      return { ...acc, ...getFilesToUpload(currentData, path) };
    }

    return acc;
  }, {});
};

export default getFilesToUpload;
