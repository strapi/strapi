const createNewFilesToUploadArray = filesObject => {
  return Object.keys(filesObject).reduce((acc, current) => {
    const currentFile = filesObject[current];
    const abortController = new AbortController();

    acc.push({
      abortController,
      file: currentFile,
      hasError: false,
      errorMessage: null,
      isUploading: false,
    });

    return acc;
  }, []);
};

export default createNewFilesToUploadArray;
