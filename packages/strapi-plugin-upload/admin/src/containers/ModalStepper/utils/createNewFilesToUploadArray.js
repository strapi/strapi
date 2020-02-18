const createNewFilesToUploadArray = filesObject => {
  return Object.keys(filesObject).reduce((acc, current) => {
    const currentFile = filesObject[current];

    acc.push({
      isUploading: false,
      file: currentFile,
    });

    return acc;
  }, []);
};

export default createNewFilesToUploadArray;
