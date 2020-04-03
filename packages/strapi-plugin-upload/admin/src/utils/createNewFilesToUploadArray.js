const createNewFilesToUploadArray = filesObject => {
  return Object.keys(filesObject).reduce((acc, current) => {
    const currentFile = filesObject[current];
    const abortController = new AbortController();

    acc.push({
      abortController,
      file: currentFile,
      fileInfo: {
        alternativeText: '',
        caption: '',
        name: currentFile.name,
      },
      hasError: false,
      errorMessage: null,
      originalName: currentFile.name,
      isUploading: false,
      tempId: null,
    });

    return acc;
  }, []);
};

export default createNewFilesToUploadArray;
