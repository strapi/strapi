const createNewFilesToUploadArray = filesObject => {
  return Object.keys(filesObject).reduce((acc, current, index) => {
    const currentFile = filesObject[current];
    const abortController = new AbortController();

    acc.push({
      abortController,
      file: currentFile,
      isUploading: false,
      originalIndex: index,
      // signal,
    });

    return acc;
  }, []);
};

export default createNewFilesToUploadArray;
